const buildPoseidon = require("circomlibjs").buildPoseidon;
const Transcript = require("./transcript");
const FRI = require("../src/fri.js");
const LinearHash = require("./linearhash.js");
const Merkle = require("./merkle");
const MerkleGroupMultipol = require("./merkle_group_multipol_lhash.js");
const starkInfoGen = require("./starkinfo_gen.js");

module.exports = async function starkVerify(proof, publics, pil, constRoot, starkStruct) {

    const starkInfo = starkInfoGen(pil, starkStruct);

    const nBits = starkStruct.nBits;
    const N = 1 << nBits;
    const extendBits = starkStruct.nBitsExt - starkStruct.nBits;

    const groupSize = 1 << (nBits+extendBits - starkStruct.steps[0].nBits);
    const nGroups = 1 << starkStruct.steps[0].nBits;

    const poseidon = await buildPoseidon();
    const F = poseidon.F;



    const M = new Merkle(16, poseidon, poseidon.F);
    const MGPC = new MerkleGroupMultipol(M, nGroups, groupSize, starkInfo.nConst);
    const MGP1 = new MerkleGroupMultipol(M, nGroups, groupSize, starkInfo.nCm1 + starkInfo.nQ1);
    const MGP2 = new MerkleGroupMultipol(M, nGroups, groupSize, starkInfo.nCm1 + starkInfo.nQ2);
    const MGP3 = new MerkleGroupMultipol(M, nGroups, groupSize, starkInfo.nCm1 + starkInfo.nQ3);
    const MGP4 = new MerkleGroupMultipol(M, nGroups, groupSize, starkInfo.nCm1 + starkInfo.nQ4);


    const transcript = new Transcript(poseidon, poseidon.F);

    ctx = {
        challanges: [],
        evals: proof.evals,
        publics: publics
    };
    transcript.put(proof.root1);
    ctx.challanges[0] = transcript.getField(); // u
    ctx.challanges[1] = transcript.getField(); // defVal
    transcript.put(proof.root2);
    ctx.challanges[2] = transcript.getField(); // gamma
    ctx.challanges[3] = transcript.getField(); // beta
    transcript.put(proof.root3);
    ctx.challanges[4] = transcript.getField(); // vc
    transcript.put(proof.root4);
    ctx.challanges[5] = transcript.getField(); // v1
    ctx.challanges[6] = transcript.getField(); // v2
    ctx.challanges[7] = transcript.getField(); // xi

    const res=executeCode(ctx, starkInfo.verifierQueryCode);

    const fri = new FRI( poseidon, starkStruct );

    const checkQuery = (query, idx) => {
        console.log("Query:"+  idx)
        let res;
        res = MGP1.verifyGroupProof(proof.root1, query[0][1], idx, query[0][0]);
        if (!res) return false;
        res = MGP2.verifyGroupProof(proof.root2, query[1][1], idx, query[1][0]);
        if (!res) return false;
        res = MGP3.verifyGroupProof(proof.root3, query[2][1], idx, query[2][0]);
        if (!res) return false;
        res = MGP3.verifyGroupProof(proof.root4, query[3][1], idx, query[2][0]);
        if (!res) return false;
        res = MGPC.verifyGroupProof(constRoot, query[4][1], idx, query[3][0]);
        if (!res) return false;


        const vals = new Array(groupSize);

        for (let i=0; i<groupSize; i++) {
            
            const ctxQry = {};
            ctxQry.tree1 = query[0][0][i];
            ctxQry.tree2 = query[1][0][i];
            ctxQry.tree3 = query[2][0][i];
            ctxQry.tree4 = query[3][0][i];
            ctxQry.consts = query[4][0][i];
            ctxQry.evals = ctx.evals;
            ctxQry.publics = ctx.publics;
            ctxQry.challanges = ctx.challanges;

            const x = F.exp(F.w[nBits + extendBits], i*nGroups + idx);
            ctxQry.xDivXSubXi = F.div(x, F.sub(x, ctxQry.challanges[7]));
            ctxQry.xDivXSubWXi = F.div(x, F.sub(x, F.mul(F.w[nBits], ctxQry.challanges[7])));

            vals[i] = executeCode(ctxQry, starkInfo.verifierQueryCode);
        }

        return vals;
    }

    return fri.verify(transcript, proof.fri, checkQuery);

}


function executeCode(ctx, code) {
    const tmp = [];
    for (let i=0; i<code.length; i++) {
        const src = [];
        for (k=0; k<code[i].src.length; k++) {
            src.push(getRef(i, code[i].src[k]));
        }
        let res;
        switch (code[i].op) {
            case 'add': res = F.add(src[0], src[1]); break;
            case 'sub': res = F.sub(src[0], src[1]); break;
            case 'mul': res = F.mul(src[0], src[1]); break;
            case 'copy': res = src[0]; break;
            default: throw new Error("Invalid op:"+ code[i].op);
        }
        setRef(code[i].dest, res);
    }
    return getRef(code[code.length-1].dest);



    function getRef(i, r) {
        switch (r.type) {
            case "tmp": return tmp[r.id];
            case "tree1": return ctx.tree1[r.id];
            case "tree2": return ctx.tree2[r.id];
            case "tree3": return ctx.tree3[r.id];
            case "tree4": return ctx.tree4[r.id];
            case "const": return ctx.const[r.id];
            case "eval": return ctx.evals[r.id];
            case "number": return BigInt(r.value);
            case "public": return ctx.publics[r.id];
            case "challange": return ctx.challanges[r.id];
            case "xDivXSubXi": return ctx.xDivXSubXi;
            case "xDivXSubWXi": return ctx.xDivXSubWXi;
            default: throw new Error("Invalid reference type get: " + r.type);
        }
    }
    
    function setRef(r, val) {
        switch (r.type) {
            case "tmp": tmp[r.id] = val; return;
            default: throw new Error("Invalid reference type set: " + r.type);
        }
    }


}
