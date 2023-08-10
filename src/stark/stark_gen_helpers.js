
const assert = require("assert");
const buildMerklehashGL = require("../helpers/hash/merklehash/merklehash_p.js");
const buildMerkleHashBN128 = require("../helpers/hash/merklehash/merklehash_bn128_p.js");
const Transcript = require("../helpers/transcript/transcript");
const TranscriptBN128 = require("../helpers/transcript/transcript.bn128");
const F3g = require("../helpers/f3g.js");

const { buildZhInv } = require("../helpers/polutils.js");
const buildPoseidonGL = require("../helpers/hash/poseidon/poseidon");
const buildPoseidonBN128 = require("circomlibjs").buildPoseidon;
const FRI = require("./fri.js");
const _ = require("json-bigint");
const { interpolate, ifft, fft } = require("../helpers/fft/fft_p.js");
const {BigBuffer} = require("pilcom");
const { callCalculateExps, getPolRef } = require("../prover/prover_helpers.js");

module.exports.initProverStark = async function initProverStark(pilInfo, constPols, constTree, options = {}) {
    const ctx = {};

    const logger = options.logger;

    ctx.prover = "stark";

    if (logger) logger.info("PIL-STARK PROVER STARTED");

    ctx.F = new F3g();

    ctx.trees = {};

    ctx.constTree = constTree;

    ctx.pilInfo = pilInfo;
    ctx.nBits = ctx.pilInfo.starkStruct.nBits;
    ctx.nBitsExt = ctx.pilInfo.starkStruct.nBitsExt;

    ctx.extendBits = ctx.nBitsExt - ctx.nBits;

    ctx.N = 1 << ctx.pilInfo.starkStruct.nBits;
    ctx.Next = 1 << ctx.pilInfo.starkStruct.nBitsExt;
    ctx.tmp = [];
    ctx.challenges = [];

    if (logger) {
        logger.debug("-----------------------------");
        logger.debug("  PIL-STARK PROVE SETTINGS");
        logger.debug(`  Blow up factor: ${ctx.extendBits}`);
        logger.debug(`  Number queries: ${ctx.pilInfo.starkStruct.nQueries}`);
        logger.debug(`  Number Stark steps: ${ctx.pilInfo.starkStruct.steps.length}`);
        logger.debug(`  VerificationType: ${ctx.pilInfo.starkStruct.verificationHashType}`);
        logger.debug(`  Domain size: ${ctx.N} (2^${ctx.nBits})`);
        logger.debug(`  Domain size ext: ${ctx.Next} (2^${ctx.nBitsExt})`);
        logger.debug(`  Const  pols:   ${ctx.pilInfo.nConstants}`);
        logger.debug(`  Stage 1 pols:   ${ctx.pilInfo.nCm1}`);
        logger.debug(`  Stage 2 pols:   ${ctx.pilInfo.nCm2}`);
        logger.debug(`  Stage 3 pols:   ${ctx.pilInfo.nCm3}`);
        logger.debug(`  Stage 4 pols:   ${ctx.pilInfo.nCm4}`);
        logger.debug(`  Temp exp pols: ${ctx.pilInfo.mapSectionsN.tmpExp_n}`);
        logger.debug("-----------------------------");
    }

    if (ctx.pilInfo.starkStruct.verificationHashType == "GL") {
        const poseidon = await buildPoseidonGL();
        ctx.MH = await buildMerklehashGL(ctx.pilInfo.starkStruct.splitLinearHash);
        ctx.transcript = new Transcript(poseidon);
    } else if (ctx.pilInfo.starkStruct.verificationHashType == "BN128") {
        const poseidonBN128 = await buildPoseidonBN128();
        let arity = options.arity || 16;
        let custom = options.custom || false;
        let transcriptArity = custom ? arity : 16;
        console.log(`Arity: ${arity},  transcriptArity: ${transcriptArity}, Custom: ${custom}`);
        ctx.MH = await buildMerkleHashBN128(arity, custom);
        ctx.transcript = new TranscriptBN128(poseidonBN128, transcriptArity);
    } else {
        throw new Error("Invalid Hash Type: "+ ctx.pilInfo.starkStruct.verificationHashType);
    }

    ctx.fri = new FRI( ctx.pilInfo.starkStruct, ctx.MH );

    ctx.const_n = new Proxy(new BigBuffer(ctx.pilInfo.nConstants*ctx.N), BigBufferHandler);
    ctx.cm1_n = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm1_n*ctx.N), BigBufferHandler);
    ctx.cm2_n = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm2_n*ctx.N), BigBufferHandler);
    ctx.cm3_n = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm3_n*ctx.N), BigBufferHandler);
    ctx.tmpExp_n = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.tmpExp_n*ctx.N), BigBufferHandler);
    ctx.x_n = new Proxy(new BigBuffer(ctx.N), BigBufferHandler);

    
    ctx.const_2ns = new Proxy(constTree.elements, BigBufferHandler);
    ctx.cm1_2ns = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm1_n*ctx.Next), BigBufferHandler);
    ctx.cm2_2ns = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm2_n*ctx.Next), BigBufferHandler);
    ctx.cm3_2ns = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm3_n*ctx.Next), BigBufferHandler);
    ctx.cm4_2ns = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm4_n*ctx.Next), BigBufferHandler);
    ctx.q_2ns = new Proxy(new BigBuffer(ctx.pilInfo.qDim*ctx.Next), BigBufferHandler);
    ctx.f_2ns = new Proxy(new BigBuffer(3*ctx.Next), BigBufferHandler);
    ctx.x_2ns = new Proxy(new BigBuffer(ctx.Next), BigBufferHandler);
    ctx.Zi_2ns = new Proxy(new BigBuffer(ctx.Next), BigBufferHandler);

    ctx.xDivXSubXi_2ns = new Proxy(new BigBuffer(3*ctx.Next*ctx.pilInfo.nFriOpenings), BigBufferHandler);

    // Build x_n
    let xx = ctx.F.one;
    for (let i=0; i<ctx.N; i++) {
        ctx.x_n[i] = xx;
        xx = ctx.F.mul(xx, ctx.F.w[ctx.nBits])
    }

    // Build x_2ns
    xx = ctx.F.shift;
    for (let i=0; i<ctx.Next; i++) {
        ctx.x_2ns[i] = xx;
        xx = ctx.F.mul(xx, ctx.F.w[ctx.nBitsExt]);
    }

    // Build ZHInv
    const zhInv = buildZhInv(ctx.F, ctx.nBits, ctx.extendBits);
    for (let i=0; i<ctx.Next; i++) {
        ctx.Zi_2ns[i] = zhInv(i);
    }

    // Read const coefs
    constPols.writeToBigBuffer(ctx.const_n);

    return ctx;
}

module.exports.computeQStark = async function computeQStark(ctx, logger) {
    if (logger) logger.debug("Compute Trace Quotient Polynomials");

    const qq1 = new Proxy(new BigBuffer(ctx.pilInfo.qDim*ctx.Next), BigBufferHandler);
    const qq2 = new Proxy(new BigBuffer(ctx.pilInfo.qDim*ctx.pilInfo.qDeg*ctx.Next), BigBufferHandler);
    await ifft(ctx.q_2ns, ctx.pilInfo.qDim, ctx.nBitsExt, qq1);

    let curS = 1n;
    const shiftIn = ctx.F.exp(ctx.F.inv(ctx.F.shift), ctx.N);
    for (let p =0; p<ctx.pilInfo.qDeg; p++) {
        for (let i=0; i<ctx.N; i++) {
            for (let k=0; k<ctx.pilInfo.qDim; k++) {
                const indexqq2 = i*ctx.pilInfo.qDim*ctx.pilInfo.qDeg + ctx.pilInfo.qDim*p + k;
                const indexqq1 = p*ctx.N*ctx.pilInfo.qDim + i*ctx.pilInfo.qDim + k;
                qq2[indexqq2] = ctx.F.mul(qq1[indexqq1], curS);
            }
        }
        curS = ctx.F.mul(curS, shiftIn);
    }

    await fft(qq2, ctx.pilInfo.qDim * ctx.pilInfo.qDeg, ctx.nBitsExt, ctx.cm4_2ns);

    if (logger) logger.debug("··· Merkelizing Q polynomial tree");
    ctx.trees[4] = await ctx.MH.merkelize(ctx.cm4_2ns, ctx.pilInfo.mapSectionsN.cm4_2ns, ctx.Next);
}

module.exports.computeEvalsStark = async function computeEvalsStark(ctx, challenge, logger) {
    if (logger) logger.debug("Compute Evals");

    ctx.challenges[7] = challenge; // xi
    if (logger) logger.debug("··· challenges.xi: " + ctx.F.toString(ctx.challenges[7]));

    let LEv = [];
    const friOpenings = Object.keys(ctx.pilInfo.fri2Id);
    for(let i = 0; i < ctx.pilInfo.nFriOpenings; i++) {
        const opening = Number(friOpenings[i]);
        const index = ctx.pilInfo.fri2Id[opening];
        LEv[index] = new Array(ctx.N);
        LEv[index][0] = 1n;
        let w = 1n;
        for(let j = 0; j < Math.abs(opening); ++j) {
            w = ctx.F.mul(w, ctx.F.w[ctx.nBits]);
        }
        if(opening < 0) w = ctx.F.div(1n, w);
        const xi = ctx.F.div(ctx.F.mul(ctx.challenges[7], w), ctx.F.shift);
        for (let k=1; k<ctx.N; k++) {
            LEv[index][k] = ctx.F.mul(LEv[index][k-1], xi);
        }
        LEv[index] = ctx.F.ifft(LEv[index]);
    }

    ctx.evals = [];
    for (let i=0; i<ctx.pilInfo.evMap.length; i++) {
        const ev = ctx.pilInfo.evMap[i];
        let p;
        if (ev.type == "const") {
            p = {
                buffer: ctx.const_2ns,
                deg: ctx.Next,
                offset: ev.id,
                size: ctx.pilInfo.nConstants,
                dim: 1
            };
        } else if (ev.type == "cm") {
            p = getPolRef(ctx, ctx.pilInfo.cm_2ns[ev.id]);
        } else {
            throw new Error("Invalid ev type: "+ ev.type);
        }
        let acc = 0n;
        for (let k=0; k<ctx.N; k++) {
            let v;
            if (p.dim==1) {
                v = p.buffer[(k<<ctx.extendBits)*p.size + p.offset];
            } else {
                v = [
                    p.buffer[(k<<ctx.extendBits)*p.size + p.offset],
                    p.buffer[(k<<ctx.extendBits)*p.size + p.offset+1],
                    p.buffer[(k<<ctx.extendBits)*p.size + p.offset+2]
                ];
            }
            acc = ctx.F.add(acc, ctx.F.mul(v, LEv[ctx.pilInfo.fri2Id[ev.prime]][k]));
        }
        ctx.evals[i] = acc;
    }
}

module.exports.computeFRIStark = async function computeFRIStark(ctx, challenge, parallelExec, useThreads, logger) {
    if (logger) logger.debug("Compute FRI");

    ctx.challenges[5] = challenge; // v1
    if (logger) logger.debug("··· challenges.v1: " + ctx.F.toString(ctx.challenges[5]));

    ctx.challenges[6] = ctx.transcript.getField(); // v2
    if (logger) logger.debug("··· challenges.v2: " + ctx.F.toString(ctx.challenges[6]));


    const friOpenings = Object.keys(ctx.pilInfo.fri2Id);
    for(let i = 0; i < ctx.pilInfo.nFriOpenings; i++) {
        const opening = friOpenings[i];

        let w = 1n;
        for(let j = 0; j < Math.abs(opening); ++j) {
            w = ctx.F.mul(w, ctx.F.w[ctx.nBits]);
        }
        if(opening < 0) w = ctx.F.div(1n, w);

        let xi = ctx.F.mul(ctx.challenges[7], w);

        let den = new Array(ctx.Next);
        let x = ctx.F.shift;

        for (let k=0; k < ctx.Next; k++) {
            den[k] = ctx.F.sub(x, xi);
            x = ctx.F.mul(x, ctx.F.w[ctx.nBitsExt])
        }
        den = ctx.F.batchInverse(den);
        x = ctx.F.shift;
        for (let k=0; k < ctx.Next; k++) {
            const v = ctx.F.mul(den[k], x);
            ctx.xDivXSubXi_2ns[3*(k*ctx.pilInfo.nFriOpenings + ctx.pilInfo.fri2Id[opening])] = v[0];
            ctx.xDivXSubXi_2ns[3*(k*ctx.pilInfo.nFriOpenings + ctx.pilInfo.fri2Id[opening]) + 1] = v[1];
            ctx.xDivXSubXi_2ns[3*(k*ctx.pilInfo.nFriOpenings + ctx.pilInfo.fri2Id[opening]) + 2] = v[2];
    
            x = ctx.F.mul(x, ctx.F.w[ctx.nBitsExt])
        }
    }

    await callCalculateExps("step52ns", "2ns", ctx, parallelExec, useThreads);

    const friPol = new Array(ctx.Next);

    for (let i=0; i<ctx.Next; i++) {
        friPol[i] = [
            ctx.f_2ns[i*3],
            ctx.f_2ns[i*3 + 1],
            ctx.f_2ns[i*3 + 2],
        ];
    }

    const queryPol = (idx) => {
        return [
            ctx.MH.getGroupProof(ctx.trees[1], idx),
            ctx.MH.getGroupProof(ctx.trees[2], idx),
            ctx.MH.getGroupProof(ctx.trees[3], idx),
            ctx.MH.getGroupProof(ctx.trees[4], idx),
            ctx.MH.getGroupProof(ctx.constTree, idx),
        ];
    }

    ctx.friProof = await ctx.fri.prove(ctx.transcript, friPol, queryPol);
}

module.exports.genProofStark = async function genProof(ctx, logger) {
    if(logger) logger.debug("Generating proof");

    const proof = {
        root1: ctx.MH.root(ctx.trees[1]),
        root2: ctx.MH.root(ctx.trees[2]),
        root3: ctx.MH.root(ctx.trees[3]),
        root4: ctx.MH.root(ctx.trees[4]),
        evals: ctx.evals,
        fri: ctx.friProof
    };

    const publics = ctx.publics;

    return {proof, publics};
}

module.exports.extendAndMerkelize = async function  extendAndMerkelize(stage, ctx, logger) {

    const buffFrom = ctx["cm" + stage + "_n"];
    const buffTo = ctx["cm" + stage + "_2ns"];

    const nPols = ctx.pilInfo.mapSectionsN["cm" + stage + "_n"];
    
    if (logger) logger.debug("··· Interpolating " + stage);
    await interpolate(buffFrom, nPols, ctx.nBits, buffTo, ctx.nBitsExt);
    
    if (logger) logger.debug("··· Merkelizing Stage " + stage);
    ctx.trees[stage] = await ctx.MH.merkelize(buffTo, nPols, ctx.Next);
}

module.exports.setChallengesStark = function setChallengesStark(stage, ctx, challenge) {
    let challengesIndex = ctx.pilInfo["cm" + stage + "_challenges"];

    if(challengesIndex.length === 0) throw new Error("No challenges needed for stage " + stage);

    ctx.challenges[challengesIndex[0]] = challenge;
    for (let i=1; i<challengesIndex.length; i++) {
        const index = challengesIndex[i];
        ctx.challenges[index] = ctx.transcript.getField();
    }
    return;
}

module.exports.calculateChallengeStark = async function calculateChallengeStark(stage, ctx) {
    if(stage === "evals") {
        for (let i=0; i<ctx.evals.length; i++) {
            ctx.transcript.put(ctx.evals[i]);
        }
    
        return ctx.transcript.getField();
    }

    if(stage === 1) {
        for (let i=0; i<ctx.pilInfo.publics.length; i++) {
            ctx.transcript.put(ctx.publics[i]);
        }
    }

    ctx.transcript.put(ctx.MH.root(ctx.trees[stage]));

    return ctx.transcript.getField();
}

const BigBufferHandler = {
    get: function(obj, prop) {
        if (!isNaN(prop)) {
            return obj.getElement(prop);
        } else return obj[prop];
    },
    set: function(obj, prop, value) {
        if (!isNaN(prop)) {
            return obj.setElement(prop, value);
        } else {
            obj[prop] = value;
            return true;
        }
    }
};

