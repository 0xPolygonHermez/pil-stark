
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
        logger.debug(`  Stage 1 pols:   ${ctx.pilInfo.cmPolsMap.filter(p => p.stage == "cm1").length}`);
        for(let i = 0; i < ctx.pilInfo.nLibStages; i++) {
            const stage = i + 2;
            logger.debug(`  Stage ${stage} pols:   ${ctx.pilInfo.cmPolsMap.filter(p => p.stage == "cm" + stage).length}`);
        }
        logger.debug(`  Stage Q pols:   ${ctx.pilInfo.cmPolsMap.filter(p => p.stage == "cmQ").length}`);
        logger.debug(`  Temp exp pols: ${ctx.pilInfo.cmPolsMap.filter(p => p.stage == "tmpExp").length}`);
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
    ctx.cm1_n = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm1*ctx.N), BigBufferHandler);
    for(let i = 0; i < ctx.pilInfo.nLibStages; i++) {
        const stage = i + 2;
        ctx[`cm${stage}_n`] = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN[`cm${stage}`]*ctx.N), BigBufferHandler);
    }
    ctx.tmpExp_n = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.tmpExp*ctx.N), BigBufferHandler);
    ctx.x_n = new Proxy(new BigBuffer(ctx.N), BigBufferHandler);

    
    ctx.const_ext = new Proxy(constTree.elements, BigBufferHandler);
    ctx.cm1_ext = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm1*ctx.Next), BigBufferHandler);
    for(let i = 0; i < ctx.pilInfo.nLibStages; i++) {
        const stage = i + 2;
        ctx[`cm${stage}_ext`] = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN[`cm${stage}`]*ctx.Next), BigBufferHandler);
    }
    ctx.cmQ_ext = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cmQ*ctx.Next), BigBufferHandler);
    ctx.q_ext = new Proxy(new BigBuffer(ctx.pilInfo.qDim*ctx.Next), BigBufferHandler);
    ctx.f_ext = new Proxy(new BigBuffer(3*ctx.Next), BigBufferHandler);
    ctx.x_ext = new Proxy(new BigBuffer(ctx.Next), BigBufferHandler);
    ctx.Zi_ext = new Proxy(new BigBuffer(ctx.Next), BigBufferHandler);

    ctx.xDivXSubXi_ext = new Proxy(new BigBuffer(3*ctx.Next*ctx.pilInfo.nFriOpenings), BigBufferHandler);

    // Build x_n
    let xx = ctx.F.one;
    for (let i=0; i<ctx.N; i++) {
        ctx.x_n[i] = xx;
        xx = ctx.F.mul(xx, ctx.F.w[ctx.nBits])
    }

    // Build x_ext
    xx = ctx.F.shift;
    for (let i=0; i<ctx.Next; i++) {
        ctx.x_ext[i] = xx;
        xx = ctx.F.mul(xx, ctx.F.w[ctx.nBitsExt]);
    }

    // Build ZHInv
    const zhInv = buildZhInv(ctx.F, ctx.nBits, ctx.extendBits);
    for (let i=0; i<ctx.Next; i++) {
        ctx.Zi_ext[i] = zhInv(i);
    }

    // Read const coefs
    constPols.writeToBigBuffer(ctx.const_n);

    return ctx;
}

module.exports.computeQStark = async function computeQStark(ctx, logger) {
    if (logger) logger.debug("Compute Trace Quotient Polynomials");

    const qq1 = new Proxy(new BigBuffer(ctx.pilInfo.qDim*ctx.Next), BigBufferHandler);
    const qq2 = new Proxy(new BigBuffer(ctx.pilInfo.qDim*ctx.pilInfo.qDeg*ctx.Next), BigBufferHandler);
    await ifft(ctx.q_ext, ctx.pilInfo.qDim, ctx.nBitsExt, qq1);

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

    await fft(qq2, ctx.pilInfo.qDim * ctx.pilInfo.qDeg, ctx.nBitsExt, ctx.cmQ_ext);

    if (logger) logger.debug("··· Merkelizing Q polynomial tree");

    const nPolsQ = ctx.pilInfo.mapSectionsN.cmQ || 0;
    ctx.trees[ctx.pilInfo.nLibStages + 2] = await ctx.MH.merkelize(ctx.cmQ_ext, nPolsQ, ctx.Next);
}

module.exports.computeEvalsStark = async function computeEvalsStark(ctx, challenge, logger) {
    if (logger) logger.debug("Compute Evals");

    ctx.challenges[ctx.pilInfo.challenges["xi"][0]] = challenge; // xi
    if (logger) logger.debug("··· challenges[" + ctx.pilInfo.challenges["xi"][0] + "]: " + ctx.F.toString(ctx.challenges[ctx.pilInfo.challenges["xi"][0]]));

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
        const xi = ctx.F.div(ctx.F.mul(ctx.challenges[ctx.pilInfo.challenges["xi"][0]], w), ctx.F.shift);
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
                buffer: ctx.const_ext,
                deg: ctx.Next,
                offset: ev.id,
                size: ctx.pilInfo.nConstants,
                dim: 1
            };
        } else if (ev.type == "cm") {
            p = getPolRef(ctx, ev.id, "ext");
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

module.exports.computeFRIStark = async function computeFRIStark(ctx, challenge, options) {
    const logger = options.logger;

    if (logger) logger.debug("Compute FRI");

    module.exports.setChallengesStark("fri", ctx, challenge, logger);

    const friOpenings = Object.keys(ctx.pilInfo.fri2Id);
    for(let i = 0; i < ctx.pilInfo.nFriOpenings; i++) {
        const opening = friOpenings[i];

        let w = 1n;
        for(let j = 0; j < Math.abs(opening); ++j) {
            w = ctx.F.mul(w, ctx.F.w[ctx.nBits]);
        }
        if(opening < 0) w = ctx.F.div(1n, w);

        let xi = ctx.F.mul(ctx.challenges[ctx.pilInfo.challenges["xi"][0]], w);

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
            ctx.xDivXSubXi_ext[3*(k*ctx.pilInfo.nFriOpenings + ctx.pilInfo.fri2Id[opening])] = v[0];
            ctx.xDivXSubXi_ext[3*(k*ctx.pilInfo.nFriOpenings + ctx.pilInfo.fri2Id[opening]) + 1] = v[1];
            ctx.xDivXSubXi_ext[3*(k*ctx.pilInfo.nFriOpenings + ctx.pilInfo.fri2Id[opening]) + 2] = v[2];
    
            x = ctx.F.mul(x, ctx.F.w[ctx.nBitsExt])
        }
    }

    await callCalculateExps("fri", "ext", ctx, options.parallelExec, options.useThreads);

    const friPol = new Array(ctx.Next);

    for (let i=0; i<ctx.Next; i++) {
        friPol[i] = [
            ctx.f_ext[i*3],
            ctx.f_ext[i*3 + 1],
            ctx.f_ext[i*3 + 2],
        ];
    }

    const queryPol = (idx) => {
        const queriesPols = [];

        queriesPols.push(ctx.MH.getGroupProof(ctx.constTree, idx));
        queriesPols.push(ctx.MH.getGroupProof(ctx.trees[1], idx));
        for(let i = 0; i < ctx.pilInfo.nLibStages; ++i) {
            const stage = i + 2;
            queriesPols.push(ctx.MH.getGroupProof(ctx.trees[stage], idx));
        }
        queriesPols.push(ctx.MH.getGroupProof(ctx.trees[ctx.pilInfo.nLibStages + 2], idx));
       
        return queriesPols;
    }

    ctx.friProof = await ctx.fri.prove(ctx.transcript, friPol, queryPol);
}

module.exports.genProofStark = async function genProof(ctx, logger) {
    if(logger) logger.debug("Generating proof");

    const proof = {
        root1: ctx.MH.root(ctx.trees[1]),
        rootQ: ctx.MH.root(ctx.trees[ctx.pilInfo.nLibStages + 2]),
        evals: ctx.evals,
        fri: ctx.friProof
    };

    for(let i = 0; i < ctx.pilInfo.nLibStages; ++i) {
        const stage = i + 2;
        proof["root" + stage] = ctx.MH.root(ctx.trees[stage]);
    }

    const publics = ctx.publics;

    return {proof, publics};
}

module.exports.extendAndMerkelize = async function  extendAndMerkelize(stage, ctx, logger) {

    const buffFrom = ctx["cm" + stage + "_n"];
    const buffTo = ctx["cm" + stage + "_ext"];

    const nPols = ctx.pilInfo.mapSectionsN["cm" + stage] || 0;
    
    if (logger) logger.debug("··· Interpolating " + stage);
    await interpolate(buffFrom, nPols, ctx.nBits, buffTo, ctx.nBitsExt);
    
    if (logger) logger.debug("··· Merkelizing Stage " + stage);
    ctx.trees[stage] = await ctx.MH.merkelize(buffTo, nPols, ctx.Next);
}

module.exports.setChallengesStark = function setChallengesStark(stage, ctx, challenge, logger) {
    let challengesIndex = ctx.pilInfo.challenges[stage];

    if(challengesIndex.length === 0) throw new Error("No challenges needed for stage " + stage);

    ctx.challenges[challengesIndex[0]] = challenge;
    if (logger) logger.debug("··· challenges[" + challengesIndex[0] + "]: " + ctx.F.toString(ctx.challenges[challengesIndex[0]]));
    for (let i=1; i<challengesIndex.length; i++) {
        const index = challengesIndex[i];
        ctx.challenges[index] = ctx.transcript.getField();
        if (logger) logger.debug("··· challenges[" + index + "]: " + ctx.F.toString(ctx.challenges[index]));
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

    if(stage === "Q") stage = ctx.pilInfo.nLibStages + 2;

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

