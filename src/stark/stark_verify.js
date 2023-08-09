const Transcript = require("../helpers/transcript/transcript");
const TranscriptBN128 = require("../helpers/transcript/transcript.bn128");
const FRI = require("./fri.js");
const buildMerkleHashGL = require("../helpers/hash/merklehash/merklehash_p.js");
const buildMerkleHashBN128 = require("../helpers/hash/merklehash/merklehash_bn128_p.js");
const { assert } = require("chai");
const buildPoseidonGL = require("../helpers/hash/poseidon/poseidon");
const buildPoseidonBN128 = require("circomlibjs").buildPoseidon;

module.exports = async function starkVerify(proof, publics, constRoot, starkInfo, options = {}) {
    const logger = options.logger;

    const starkStruct = starkInfo.starkStruct;

    const poseidon = await buildPoseidonGL();

    let MH;
    let transcript;
    if (starkStruct.verificationHashType == "GL") {
        const poseidonGL = await buildPoseidonGL();
        MH = await buildMerkleHashGL(starkStruct.splitLinearHash);
        transcript = new Transcript(poseidonGL);
    } else if (starkStruct.verificationHashType == "BN128") {
        const poseidonBN128 = await buildPoseidonBN128();
        let arity = options.arity || 16;
        let custom = options.custom || false; 
        let transcriptArity = custom ? arity : 16;   
        MH = await buildMerkleHashBN128(arity, custom);
        transcript = new TranscriptBN128(poseidonBN128, transcriptArity);
    } else {
        throw new Error("Invalid Hash Type: "+ starkStruct.verificationHashType);
    }

    const nBits = starkStruct.nBits;
    const N = 1 << nBits;
    const extendBits = starkStruct.nBitsExt - starkStruct.nBits;

    assert(nBits+extendBits == starkStruct.steps[0].nBits, "First step must be just one");

    if (logger) {
        logger.debug("-----------------------------");
        logger.debug("  PIL-STARK VERIFY SETTINGS");
        logger.debug(`  Blow up factor: ${extendBits}`);
        logger.debug(`  Number queries: ${starkStruct.nQueries}`);
        logger.debug(`  Number Stark steps: ${starkStruct.steps.length}`);
        logger.debug(`  VerificationType: ${starkStruct.verificationHashType}`);
        logger.debug(`  Domain size: ${N} (2^${nBits})`);
        logger.debug(`  Const  pols:   ${starkInfo.nConstants}`);
        logger.debug(`  Stage 1 pols:   ${starkInfo.nCm1}`);
        logger.debug(`  Stage 2 pols:   ${starkInfo.nCm2}`);
        logger.debug(`  Stage 3 pols:   ${starkInfo.nCm3}`);
        logger.debug(`  Stage 4 pols:   ${starkInfo.nCm4}`);
        logger.debug(`  Temp exp pols: ${starkInfo.mapSectionsN.tmpExp_n}`);
        logger.debug("-----------------------------");
    }

    const F = poseidon.F;

    ctx = {
        challenges: [],
        evals: proof.evals,
        publics: publics
    };

    for (let i=0; i<publics.length; i++) {
        transcript.put(publics[i]);
    }

    transcript.put(proof.root1);

    // Compute challenge alpha
    ctx.challenges[0] = transcript.getField(); 
    if (logger) logger.debug("··· challenges.alpha: " + F.toString(ctx.challenges[0]));

    // Compute challenge beta
    ctx.challenges[1] = transcript.getField();
    if (logger) logger.debug("··· challenges.beta: " + F.toString(ctx.challenges[1]));

    transcript.put(proof.root2);

    // Compute challenge gamma
    ctx.challenges[2] = transcript.getField();
    if (logger) logger.debug("··· challenges.gamma: " + F.toString(ctx.challenges[2]));

    // Compute challenge delta
    ctx.challenges[3] = transcript.getField();
    if (logger) logger.debug("··· challenges.delta: " + F.toString(ctx.challenges[3]));

    // Compute challenge a
    transcript.put(proof.root3);
    ctx.challenges[4] = transcript.getField();
    if (logger) logger.debug("··· challenges.a: " + F.toString(ctx.challenges[4]));


    transcript.put(proof.root4);
    ctx.challenges[7] = transcript.getField();
    if (logger) logger.debug("··· challenges.xi: " + F.toString(ctx.challenges[7]));

    for (let i=0; i<ctx.evals.length; i++) {
        transcript.put(ctx.evals[i]);
    }

    ctx.challenges[5] = transcript.getField();
    if (logger) logger.debug("··· challenges.v1: " + F.toString(ctx.challenges[5]));

    ctx.challenges[6] = transcript.getField(); // v2
    if (logger) logger.debug("··· challenges.v2: " + F.toString(ctx.challenges[6]));

    if (logger) logger.debug("Verifying evaluations");

    const xN = F.exp(ctx.challenges[7], N)
    ctx.Z = F.sub(xN, 1n);
    ctx.Zp = F.sub(F.exp(F.mul(ctx.challenges[7], F.w[nBits]), N), 1n);

    const res=executeCode(F, ctx, starkInfo.verifierCode.first);

    let xAcc = 1n;
    let q = 0n;
    for (let i=0; i<starkInfo.qDeg; i++) {
        q = F.add(q, F.mul(xAcc, ctx.evals[starkInfo.evIdx.cm[0][starkInfo.qs[i]]]));
        xAcc = F.mul(xAcc, xN);
    }

    const qZ = F.mul(q, ctx.Z);

    if (!F.eq(res, qZ)) {
        if(logger) logger.warn("Invalid evaluations");
        return false;
    }

    const fri = new FRI( starkStruct, MH );

    if(logger) logger.debug("Verifying queries");

    const checkQuery = (query, idx) => {
        if(logger) logger.debug("Verifying query: " + idx);
        for(let i = 0; i < 5; ++i) {
            const root = i < 4 ? proof[`root${i + 1}`] : constRoot;
            let res = MH.verifyGroupProof(root, query[i][1], idx, query[i][0]);
            if (!res) {
                if(logger) logger.warn(`Invalid root${i + 1}`);
                return false;
            }
        }
        
        const ctxQry = {};
        ctxQry.tree1 = query[0][0];
        ctxQry.tree2 = query[1][0];
        ctxQry.tree3 = query[2][0];
        ctxQry.tree4 = query[3][0];
        ctxQry.consts = query[4][0];
        ctxQry.evals = ctx.evals;
        ctxQry.publics = ctx.publics;
        ctxQry.challenges = ctx.challenges;
        ctxQry.starkInfo = starkInfo;

        const x = F.mul(F.shift, F.exp(F.w[nBits + extendBits], idx));
	
        ctxQry.xDivXSubXi = {};
        for(let i = 0; i < starkInfo.nFriOpenings; ++i) {
            const opening = Number(Object.keys(starkInfo.fri2Id)[i]);
            const id = starkInfo.fri2Id[opening];

            let w = 1n;
            for(let j = 0; j < Math.abs(opening); ++j) {
                w = F.mul(w, F.w[nBits]);
            }
            if(opening < 0) {
                w = F.div(1n, w);
            }

            ctxQry.xDivXSubXi[id] = F.div(x, F.sub(x, F.mul(ctxQry.challenges[7], w)));
        }

        const vals = [executeCode(F, ctxQry, starkInfo.verifierQueryCode.first)];

        return vals;
    }

    return fri.verify(transcript, proof.fri, checkQuery);

}


function executeCode(F, ctx, code) {
    const tmp = [];
    for (let i=0; i<code.length; i++) {
        const src = [];
        for (k=0; k<code[i].src.length; k++) {
            src.push(getRef(code[i].src[k]));
        }
        let res;
        switch (code[i].op) {
            case 'add': res = F.add(src[0], src[1]); break;
            case 'sub': res = F.sub(src[0], src[1]); break;
            case 'mul': res = F.mul(src[0], src[1]); break;
            case 'muladd': res = F.add(F.mul(src[0], src[1]), src[2]); break;
            case 'copy': res = src[0]; break;
            default: throw new Error("Invalid op:"+ code[i].op);
        }
        setRef(code[i].dest, res);
    }
    return getRef(code[code.length-1].dest);


    function getRef(r) {
        switch (r.type) {
            case "tmp": return tmp[r.id];
            case "tree1": return extractVal(ctx.tree1, r.treePos, r.dim);
            case "tree2": return extractVal(ctx.tree2, r.treePos, r.dim);
            case "tree3": return extractVal(ctx.tree3, r.treePos, r.dim);
            case "tree4": return extractVal(ctx.tree4, r.treePos, r.dim);
            case "const": return ctx.consts[r.id];
            case "eval": return ctx.evals[r.id];
            case "number": return BigInt(r.value);
            case "public": return BigInt(ctx.publics[r.id]);
            case "challenge": return ctx.challenges[r.id];
            case "xDivXSubXi": return ctx.xDivXSubXi[ctx.starkInfo.fri2Id[r.id]];
            case "x": return ctx.challenges[7];
            case "Z": return r.prime ? ctx.Zp : ctx.Z;
            default: throw new Error("Invalid reference type get: " + r.type);
        }
    }

    function extractVal(arr, pos, dim) {
        if (dim==1) {
            return arr[pos];
        } else if (dim==3) {
            return arr.slice(pos, pos+3);
        } else {
            throw new Error("Invalid dimension");
        }
    }

    function setRef(r, val) {
        switch (r.type) {
            case "tmp": tmp[r.id] = val; return;
            default: throw new Error("Invalid reference type set: " + r.type);
        }
    }

}

