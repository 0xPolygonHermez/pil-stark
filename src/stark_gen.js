
const assert = require("assert");
const MerkleHashGL = require("./merklehash.js");
const MerkleHashBN128 = require("./merklehash.bn128.js");
const Transcript = require("./transcript");
const TranscriptBN128 = require("./transcript.bn128");

const { extendPol, buildZhInv, calculateH1H2, calculateZ } = require("./polutils.js");
const { log2 } = require("./utils");
const buildPoseidonGL = require("./poseidon");
const buildPoseidonBN128 = require("circomlibjs").buildPoseidon;
const FRI = require(".//fri.js");
const starkInfoGen = require("./starkinfo_gen.js");

module.exports = async function starkGen(cmPols, constPols, constTree, pil, starkStruct) {
    const N = 1 << starkStruct.nBits;
    const extendBits = starkStruct.nBitsExt - starkStruct.nBits;
    const Nbits = starkStruct.nBits;
    assert(1 << Nbits == N, "N must be a power of 2");

    const poseidon = await buildPoseidonGL();
    const F = poseidon.F;

    let MH;
    let transcript;
    if (starkStruct.hashType == "GL") {
        MH = new MerkleHashGL(poseidon);
        transcript = new Transcript(poseidon);
    } else if (starkStruct.hashType == "BN128") {
        const poseidonBN128 = await buildPoseidonBN128();
        MH = new MerkleHashBN128(poseidonBN128);
        transcript = new TranscriptBN128(poseidonBN128);
    } else {
        throw new Error("Invalid Hash Type: "+ starkStruct.hashType);
    }

    const fri = new FRI( poseidon, starkStruct, MH );

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
        evals: [],
        N: N,
        next: 1,
        x: []
    };

    const pols2ns = {
        cm: [],
        exps:[],
        q: [],
        const: [],
        publics: pols.publics,
        challanges: pols.challanges,
        evals: pols.evals,
        N: N << extendBits,
        next: 1 << extendBits,
        x: []
    };

    let xx = F.one;
    for (let i=0; i<N; i++) {
        pols.x[i] = xx;
        xx = F.mul(xx, F.w[Nbits])
    }
    xx = F.shift;
    for (let i=0; i<N << extendBits; i++) {
        pols2ns.x[i] = xx;
        xx = F.mul(xx, F.w[Nbits + extendBits]);
    }


    // Build ZHInv
    const zhInv = buildZhInv(F, Nbits, extendBits);
    pols2ns.Zi = zhInv;

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
        pols.cm[i] = cmPols[i];
    }

    for (let i=0; i<constPols.length; i++) {
        console.log(`Preparing constant polynomial ${i}`);
        if (constPols[i].length!= N) {
            throw new Error(`Constant Polynomial ${i} does not have the right size: ${constPols[i].length} and should be ${N}`);
        }
        pols.const[i] = constPols[i];
        pols2ns.const[i] = new Array(N << extendBits);
        for (let j=0; j<(N<<extendBits); j++) pols2ns.const[i][j] = MH.getElement(constTree, j, i);
    }


// This will calculate all the Q polynomials and extend commits

    calculateExps(F, pols, starkInfo.step1prev);

    for (let i=0; i<pil.publics.length; i++) {
        if (pil.publics[i].polType == "cmP") {
            pols.publics[i] = pols.cm[pil.publics[i].polId][pil.publics[i].idx];
        } else if (pil.polType == "exp") {
            pols.publics[i] = pols.exps[pil.publics[i].polId][pil.publics[i].idx];
        } else {
            throw new Error(`Invalid public type: ${polType.type}`);
        }
    }

    calculateExps(F, pols, starkInfo.step1);
    await extendCms(starkInfo.qs1);
    calculateExps(F, pols2ns, starkInfo.step12ns);

    console.log("Merkelizing 1....");
    const tree1 = await MH.merkelize([ ...pols2ns.cm, ...pols2ns.q], 1, pols2ns.cm.length + pols2ns.q.length, N<<extendBits);
    transcript.put(MH.root(tree1));

///////////
// 2.- Caluculate plookups h1 and h2
///////////
    pols.challanges[0] = transcript.getField(); // u
    pols.challanges[1] = transcript.getField(); // defVal

    calculateExps(F, pols, starkInfo.step2prev);

    for (let i=0; i<starkInfo.puCtx.length; i++) {
        const puCtx = starkInfo.puCtx[i];
        const [h1, h2] = calculateH1H2(F, pols.exps[puCtx.fExpId], pols.exps[puCtx.tExpId]);
        pols.cm.push(h1);
        pols.cm.push(h2);
    }

    calculateExps(F, pols, starkInfo.step2);
    await extendCms(starkInfo.qs2);
    calculateExps(F, pols2ns, starkInfo.step22ns);

    console.log("Merkelizing 2....");
    const tree2 = await MH.merkelize([
        ...pols2ns.cm.slice(starkInfo.nCm1 ),
        ...pols2ns.q.slice(starkInfo.nQ1 ),
    ], 3, starkInfo.nCm2 + starkInfo.nQ2, N << extendBits);
    transcript.put(MH.root(tree2));

///////////
// 3.- Compute Z polynomials
///////////
    pols.challanges[2] = transcript.getField(); // gamma
    pols.challanges[3] = transcript.getField(); // betta


    calculateExps(F, pols, starkInfo.step3prev);
    for (let i=0; i<starkInfo.puCtx.length; i++) {
        const pu = starkInfo.puCtx[i];
        const z = calculateZ(F, pols.exps[pu.numId], pols.exps[pu.denId]);
        pols.cm.push(z);
    }
    for (let i=0; i<starkInfo.peCtx.length; i++) {
        const pe = starkInfo.peCtx[i];
        const z = calculateZ(F, pols.exps[pe.numId], pols.exps[pe.denId]);
        pols.cm.push(z);
    }
    for (let i=0; i<starkInfo.ciCtx.length; i++) {
        const ci = starkInfo.ciCtx[i];
        const z = calculateZ(F, pols.exps[ci.numId], pols.exps[ci.denId]);
        pols.cm.push(z);
    }

    calculateExps(F, pols, starkInfo.step3);
    await extendCms(starkInfo.qs3);
    calculateExps(F, pols2ns, starkInfo.step32ns);

    console.log("Merkelizing 3....");

    const tree3 = await MH.merkelize([
        ...pols2ns.cm.slice(starkInfo.nCm1 + starkInfo.nCm2 ),
        ...pols2ns.q.slice(starkInfo.nQ1 + starkInfo.nQ2 ),
    ], 3, starkInfo.nCm3 + starkInfo.nQ3, N << extendBits);
    transcript.put(MH.root(tree3));


///////////
// 4. Compute C Polynomial (FRI)
///////////
    pols.challanges[4] = transcript.getField(); // vc

    calculateExps(F, pols, starkInfo.step4);
    await extendCms(starkInfo.qs4);
    calculateExps(F, pols2ns, starkInfo.step42ns);

    console.log("Merkelizing 4....");

    const tree4 = await MH.merkelize([
        ...pols2ns.cm.slice(starkInfo.nCm1 + starkInfo.nCm2 + starkInfo.nCm3),
        ...pols2ns.q.slice(starkInfo.nQ1 + starkInfo.nQ2 + starkInfo.nQ3),
    ], 3, starkInfo.nCm4 + starkInfo.nQ4, N << extendBits);
    transcript.put(MH.root(tree4));


///////////
// 5. Compute FRI Polynomial
///////////
    pols.challanges[5] = transcript.getField(); // v1
    pols.challanges[6] = transcript.getField(); // v2
    pols.challanges[7] = transcript.getField(); // xi

// Calculate Evals

    let LEv = new Array(N);
    let LpEv = new Array(N);
    LEv[0] = 1n;
    LpEv[0] = 1n;
    const xis = F.div(pols.challanges[7], F.shift);
    const wxis = F.div(F.mul(pols.challanges[7], F.w[Nbits]), F.shift);
    for (let k=1; k<N; k++) {
        LEv[k] = F.mul(LEv[k-1], xis);
        LpEv[k] = F.mul(LpEv[k-1], wxis);
    }
    LEv = F.ifft(LEv);
    LpEv = F.ifft(LpEv);

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

    const xi = pols.challanges[7];
    const wxi = F.mul(pols.challanges[7], F.w[Nbits]);

    let xDivXSubXi = new Array(N << extendBits);
    let xDivXSubWXi = new Array(N << extendBits);
    let x = F.shift;
    for (let k=0; k< N<<extendBits; k++) {
        xDivXSubXi[k] = F.sub(x, xi);
        xDivXSubWXi[k] = F.sub(x, wxi);
        x = F.mul(x, F.w[Nbits + extendBits])
    }
    xDivXSubXi = F.batchInverse(xDivXSubXi);
    xDivXSubWXi = F.batchInverse(xDivXSubWXi);
    x = F.shift;
    for (let k=0; k< N<<extendBits; k++) {
        xDivXSubXi[k] = F.mul(xDivXSubXi[k], x);
        xDivXSubWXi[k] = F.mul(xDivXSubWXi[k], x);
        x = F.mul(x, F.w[Nbits + extendBits])
    }
    pols2ns.xDivXSubXi = xDivXSubXi;
    pols2ns.xDivXSubWXi = xDivXSubWXi;


    calculateExps(F, pols2ns, starkInfo.step52ns);

    const friPol = pols2ns.exps[starkInfo.friExpId];

    const queryPol = (idx) => {
        return [
            MH.getGroupProof(tree1, idx),
            MH.getGroupProof(tree2, idx),
            MH.getGroupProof(tree3, idx),
            MH.getGroupProof(tree4, idx),
            MH.getGroupProof(constTree, idx),
        ];
    }

    const friProof = await fri.prove(transcript, friPol, queryPol);

    return {
        proof: {
            root1: MH.root(tree1),
            root2: MH.root(tree2),
            root3: MH.root(tree3),
            root4: MH.root(tree4),
            evals: pols.evals,
            fri: friProof
        },
        publics: pols.publics
    }


    async function extendCms(qs) {
        for (let i=0; i<pols.cm.length; i++) {
            if (!pols2ns.cm[i]) {
                console.log(`Extending cm pol ${i+1}/${pols.cm.length}`);
                pols2ns.cm[i] = extendPol(F, pols.cm[i], extendBits);
            }
        }
        for (let i=0; i<qs.length; i++) {
            if (pols2ns.exps[qs[i].idExp].length == 0) {
                console.log(`Calc and Extending q pol ${i+1}/${qs.length}`);
                pols2ns.exps[qs[i].idExp] = extendPol(F, pols.exps[qs[i].idExp], extendBits);
                pols2ns.q[qs[i].idQ] = [];
            }
        }
    }


}


function calculateExps(F, pols, code) {
    const tmp = [];

    for (let i=0; i<pols.N; i++) {
        let c;
        if (i<pols.next) {
            c = code.first;
        } else if (i<pols.N-pols.next) {
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
            case "const": return pols.const[r.id][r.prime ? (i+pols.next)%pols.N : i];
            case "cm": return pols.cm[r.id][r.prime ? (i+pols.next)%pols.N : i];
            case "q": return pols.q[r.id][r.prime ? (i+pols.next)%pols.N : i];
            case "exp": return pols.exps[r.id][r.prime ? (i+pols.next)%pols.N : i];
            case "number": return BigInt(r.value);
            case "public": return pols.publics[r.id];
            case "challange": return pols.challanges[r.id];
            case "eval": return pols.evals[r.id];
            case "xDivXSubXi": return pols.xDivXSubXi[i];
            case "xDivXSubWXi": return pols.xDivXSubWXi[i];
            case "x": return pols.x[i];
            case "Zi": return pols.Zi(i);
            default: throw new Error("Invalid reference type get: " + r.type);
        }
    }

    function setRef(i, r, val) {
        switch (r.type) {
            case "tmp": tmp[r.id] = val; return;
            case "exp": pols.exps[r.id][r.prime ? (i+pols.next)%pols.N : i]= val; return;
            case "q": pols.q[r.id][r.prime ? (i+pols.next)%pols.N : i]=val; return;
            default: throw new Error("Invalid reference type set: " + r.type);
        }
    }
}

