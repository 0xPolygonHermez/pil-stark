
const assert = require("assert");
const Merkle = require("./merkle.js");
const MerkleGroupMultipolHash = require("./merkle_group_multipol_lhash.js");
const LinearHash = require("./linearhash.js");
const Transcript = require("./transcript");
const { extendPol, buildZhInv, calculateH1H2 } = require("./polutils");
const { log2 } = require("./utils");
const buildPoseidon = require("./poseidon");
// const defaultStarkStruct = require("./starkstruct");
const FRI = require(".//fri.js");
const starkInfoGen = require("./starkinfo_gen.js");

module.exports = async function starkGen(cmPols, constPols, constTree, pil, starkStruct) {
    let eStarkId;
    let debugId;
    const N = cmPols[0].length;
    const extendBits = starkStruct.nBitsExt - starkStruct.nBits;
    const Nbits = log2(N);
    assert(1 << Nbits == N, "N must be a power of 2"); 

    const poseidon = await buildPoseidon();
    const F = poseidon.F;

    const LH = new LinearHash(poseidon);
    const M = new Merkle(poseidon);

    const groupSize = 1 << (Nbits+extendBits - starkStruct.steps[0].nBits);
    const nGroups = 1 << starkStruct.steps[0].nBits;
    const MGPC = new MerkleGroupMultipolHash(LH, M, constPols[0].length*2, 1, constPols.length);

    // TODO Remove arity
    const fri = new FRI( poseidon, starkStruct );

    const transcript = new Transcript(poseidon);

    if (cmPols.length != pil.nCommitments) {
        throw new Error(`Number of Commited Polynomials: ${cmPols.length} do not match with the pil definition: ${pil.nCommitments} `)
    };

    const pols = {
        cm: [],
        exps:[],
        q: [],
        const: [],
        publics: [],
        challanges: [],
        evals: []
    };

    const pols2ns = {
        cm: [],
        exps:[],
        q: [],
        const: [],
        publics: pols.publics,
        challanges: pols.challanges,
        evals: pols.evals
    };


    // Build ZHInv
    const zhInv = buildZhInv(F, Nbits, extendBits);

    const starkInfo = starkInfoGen(pil, starkStruct);

    for (let i=0; i<starkInfo.nExps; i++) {
        pols.exps[i] = [];
        pols2ns.exps[i] = [];
    }

// 1.- Prepare commited polynomials. 
    for (let i=0; i<cmPols.length; i++) {
        console.log(`Preparing polynomial ${i}`);
        if (cmPols[i].length!= N) {
            throw new Error(`Polynomial ${i} does not have the right size: ${cmPols[i].length} and should be ${N}`);
        }
        pols.cm[i] = new Array(N);
        for (let j=0; j<N; j++) pols.cm[i][j] = F.e(cmPols[i][j]);
    }

    for (let i=0; i<constPols.length; i++) {
        console.log(`Preparing constant polynomial ${i}`);
        if (constPols[i].length!= N) {
            throw new Error(`Constant Polynomial ${i} does not have the right size: ${constPols[i].length} and should be ${N}`);
        }
        pols.const[i] = new Array(N);
        pols2ns.const[i] = new Array(N << extendBits);
        for (let j=0; j<(N<<extendBits); j++) pols2ns.const[i][j] = MGPC.getElement(constTree, i, j);
        for (let j=0; j<N; j++) pols.const[i][j] = F.e(constPols[i][j]);
    }


// This will calculate all the Q polynomials and extend commits

    calculateExps(F, pols, starkInfo.step1prev, N);

    for (let i=0; i<pil.publics.length; i++) {
        if (pil.publics[i].polType == "cmP") {
            pols.publics[i] = pols.cm[pil.publics[i].polId][pil.publics[i].idx];
        } else if (pil.polType == "exp") {
            pols.publics[i] = pols.exps[pil.publics[i].polId][pil.publics[i].idx];
        } else {
            throw new Error(`Invalid public type: ${polType.type}`);
        }
    }

    calculateExps(F, pols, starkInfo.step1, N);
    await extendCms();
    calculateExps(F, pols2ns, starkInfo.step12ns, N<<extendBits);
    await prepareQs(starkInfo.qs1);

    console.log("Merkelizing 1....");

    const MGP1 = new MerkleGroupMultipolHash(LH, M, nGroups, groupSize, pols2ns.cm.length + pols2ns.q.length);
    const tree1 = MGP1.merkelize([ 
        ...pols2ns.cm, 
        ...pols2ns.q, 
    ]);

    transcript.put(MGP1.root(tree1));


// 2.- Caluculate plookups h1 and h2
    pols.challanges[0] = transcript.getField(); // u
    pols.challanges[1] = transcript.getField(); // defVal

    calculateExps(F, pols, starkInfo.step2prev, N);

    for (let i=0; i<starkInfo.puCtx.length; i++) {
        const [h1, h2] = calculateH1H2(F, pols.exps[puCtx[i].fExpId], pols.exps[uCtx[i].tExpId]);
        pols.cm.push(h1);
        pols.cm.push(h2);
    }

    calculateExps(F, pols, starkInfo.step2, N);
    await extendCms();
    calculateExps(F, pols2ns, starkInfo.step22ns, N<<extendBits);
    await prepareQs(starkInfo.qs2);

    console.log("Merkelizing 2....");
    const MGP2 = new MerkleGroupMultipolHash(LH, M, nGroups, groupSize, starkInfo.nCm2 + starkInfo.nQ2);
    const tree2 = MGP2.merkelize([
        ...pols2ns.cm.slice(starkInfo.nCm1 ), 
        ...pols2ns.q.slice(starkInfo.nQ1 ), 
    ]);
    transcript.put(MGP2.root(tree2));


// 3.- Compute Z polynomials
    pols.challanges[2] = transcript.getField(); // gamma
    pols.challanges[3] = transcript.getField(); // betta

    calculateExps(F, pols, starkInfo.step3prev, N);
    for (let i=0; i<starkInfo.puCtx.length; i++) {
        const z = calculateZ(F, pols.exps[puCtx[i].numId], pols.exps[uCtx[i].denId]);
        pols.cm.push(z);
    }

    calculateExps(F, pols, starkInfo.step3, N);
    await extendCms();
    calculateExps(F, pols2ns, starkInfo.step32ns, N<<extendBits);
    await prepareQs(starkInfo.qs3);

    console.log("Merkelizing 3....");

    const MGP3 = new MerkleGroupMultipolHash(LH, M, nGroups, groupSize, starkInfo.nCm3 + starkInfo.nQ3);
    const tree3 = MGP3.merkelize([
        ...pols2ns.cm.slice(starkInfo.nCm1 + starkInfo.nCm2 ), 
        ...pols2ns.q.slice(starkInfo.nQ1 + starkInfo.nQ2 ), 
    ]);

    transcript.put(MGP3.root(tree3));



// 4. Compute C Polynomial (FRI)
    pols.challanges[4] = transcript.getField(); // vc

    calculateExps(F, pols, starkInfo.step4, N);
    await extendCms();
    calculateExps(F, pols2ns, starkInfo.step42ns, N<<extendBits);
    await prepareQs(starkInfo.qs4);

    console.log("Merkelizing 4....");

    const MGP4 = new MerkleGroupMultipolHash(LH, M, nGroups, groupSize, starkInfo.nCm4 + starkInfo.nQ4);
    const tree4 = MGP4.merkelize([
        ...pols2ns.cm.slice(starkInfo.nCm1 + starkInfo.nCm2 + starkInfo.nCm3), 
        ...pols2ns.q.slice(starkInfo.nQ1 + starkInfo.nQ2 + starkInfo.nQ3), 
    ]);

    transcript.put(MGP4.root(tree4));


// 5. Compute FRI Polynomial

    pols.challanges[5] = transcript.getField(); // v1
    pols.challanges[6] = transcript.getField(); // v2
    pols.challanges[7] = transcript.getField(); // xi

// Calculate Evals

    let LEv = new Array(N);
    let LpEv = new Array(N);
    LEv[0] = 1n;
    LpEv[0] = 1n;
    const xi = pols.challanges[7];
    const wxi = F.mul(xi, F.w[Nbits]);
    for (let k=1; k<N; k++) {
        LEv[k] = F.mul(LEv[k-1], xi);
        LpEv[k] = F.mul(LpEv[k-1], wxi);
    }
    LEv = F.ifft(LEv);
    LpEv = F.ifft(LpEv);
    let r = 1n;
    for (let k=0; k<N; k++) {
        LEv[k] = F.mul(LEv[k], r);
        LpEv[k] = F.mul(LpEv[k], r);
        r = F.mul(r, F.shiftInv);
    }

    for (let i=0; i<starkInfo.evMap.length; i++) {
        const ev = starkInfo.evMap[i];
        const p = pols2ns[ev.type][ev.id];
        l = ev.prime ? LpEv : LEv;
        let acc = 0n;
        for (let k=0; k<N; k++) {
            acc = F.add(acc, F.mul(p[k<<extendBits], l[k]));
        }
        pols.evals[i] = acc;
    }

// Calculate xDivXSubXi, xDivXSubWXi

    let xDivXSubXi = new Array(N << extendBits);
    let xDivXSubWXi = new Array(N << extendBits);
    let x = 1n;
    for (let k=0; k< N<<extendBits; k++) {
        xDivXSubXi[k] = F.sub(x, xi);
        xDivXSubWXi[k] = F.sub(x, wxi);
        x = F.mul(x, F.w[Nbits + extendBits])
    }
    xDivXSubXi = F.batchInverse(xDivXSubXi);
    xDivXSubWXi = F.batchInverse(xDivXSubWXi);
    x = 1n;
    for (let k=0; k< N<<extendBits; k++) {
        xDivXSubXi[k] = F.mul(xDivXSubXi[k], x);
        xDivXSubWXi[k] = F.mul(xDivXSubWXi[k], x);
        x = F.mul(x, F.w[Nbits + extendBits])
    }
    pols2ns.xDivXSubXi = xDivXSubXi;
    pols2ns.xDivXSubWXi = xDivXSubWXi;


    calculateExps(F, pols2ns, starkInfo.step52ns, N<<extendBits);

    const friPol = pols2ns.exps[starkInfo.friExpId];

    const queryPol = (idx) => {
        return [
            MGP1.getGroupProof(tree1, idx),
            MGP2.getGroupProof(tree2, idx),
            MGP3.getGroupProof(tree3, idx),
            MGP4.getGroupProof(tree4, idx),
            MGPC.getGroupProof(constTree, idx),
        ];
    }

    const friProof = fri.prove(transcript, friPol, queryPol);

    return {
        proof: {
            root1: MGP1.root(tree1),
            root2: MGP2.root(tree2),
            root3: MGP3.root(tree3),
            root4: MGP3.root(tree4),
            evals: pols.evals,
            fri: friProof
        },
        publics: pols.publics[i]
    }
    

    async function extendCms() {
        for (let i=0; i<pols.cm.length; i++) {
            if (!pols2ns.cm[i]) {
                pols2ns.cm[i] = extendPol(F, pols.cm[i], extendBits);
            }
        }
    }

    async function prepareQs(qs) {
        for (let i=0; i<qs.length; i++) {
            const r2ns = extendPol(F, pols.exps[qs[i].idExp], extendBits);
            pols2ns.q[qs[i].idQ] = new Array(N<<extendBits);
            for (let k=0; k< N<<extendBits; k++) {
                pols2ns.q[qs[i].idQ][k] = F.mul(F.sub(pols2ns.exps[qs[i].idExp][k], r2ns[k]), zhInv(k));
            }
        }
    }


}


function calculateExps(F, pols, code, N) {
    const tmp = [];

    for (let i=0; i<N; i++) {
        let c;
        if (i==0) {
            c = code.first;
        } else if (i<N-1) {
            c = code.i;
        } else {
            c = code.last;
        }
        for (let j=0;j<c.length; j++) {
            const src = [];
            for (k=0; k<c[j].src.length; k++) {
                src.push(getRef(i, c[j].src[k]));
            }
            let res;
            switch (c[j].op) {
                case 'add': res = F.add(src[0], src[1]); break;
                case 'sub': res = F.sub(src[0], src[1]); break;
                case 'mul': res = F.mul(src[0], src[1]); break;
                case 'copy': res = src[0]; break;
                default: throw new Error("Invalid op:"+ c[j].op);
            }
            setRef(i, c[j].dest, res);
        }
    }

    function getRef(i, r) {
        switch (r.type) {
            case "tmp": return tmp[r.id];
            case "const": return pols.const[r.id][r.prime ? (i+1)%N : i];
            case "cm": return pols.cm[r.id][r.prime ? (i+1)%N : i];
            case "q": return pols.q[r.id][r.prime ? (i+1)%N : i];
            case "exp": return pols.exps[r.id][r.prime ? (i+1)%N : i];
            case "number": return BigInt(r.value);
            case "public": return pols.publics[r.id];
            case "challange": return pols.challanges[r.id];
            case "eval": return pols.evals[r.id];
            case "xDivXSubXi": return pols.xDivXSubXi[i];
            case "xDivXSubWXi": return pols.xDivXSubWXi[i];
            default: throw new Error("Invalid reference type get: " + r.type);
        }
    }

    function setRef(i, r, val) {
        switch (r.type) {
            case "tmp": tmp[r.id] = val; return;
            case "exp": pols.exps[r.id][r.prime ? (i+1)%N : i]= val; return;
            default: throw new Error("Invalid reference type set: " + r.type);
        }
    }
}

