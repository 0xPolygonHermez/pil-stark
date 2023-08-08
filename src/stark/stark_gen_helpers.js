
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

module.exports.initProverStark = async function initProverStark(pilInfo, constPols, constTree) {
    const ctx = {};

    ctx.prover = "stark";

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

    assert(1 << ctx.nBits == ctx.N, "N must be a power of 2");

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
    ctx.x_2ns = new Proxy(new BigBuffer(ctx.N << ctx.extendBits), BigBufferHandler);
    ctx.Zi_2ns = new Proxy(new BigBuffer(ctx.N << ctx.extendBits), BigBufferHandler);

    ctx.xDivXSubXi_2ns = new Proxy(new BigBuffer((ctx.N << ctx.extendBits)*3), BigBufferHandler);
    ctx.xDivXSubWXi_2ns = new Proxy(new BigBuffer((ctx.N << ctx.extendBits)*3), BigBufferHandler);

    // Build x_n
    let xx = ctx.F.one;
    for (let i=0; i<ctx.N; i++) {
        ctx.x_n[i] = xx;
        xx = ctx.F.mul(xx, ctx.F.w[ctx.nBits])
    }

    // Build x_2ns
    xx = ctx.F.shift;
    for (let i=0; i<(ctx.N << ctx.extendBits); i++) {
        ctx.x_2ns[i] = xx;
        xx = ctx.F.mul(xx, ctx.F.w[ctx.nBitsExt]);
    }

    // Build ZHInv
    const zhInv = buildZhInv(ctx.F, ctx.nBits, ctx.extendBits);
    for (let i=0; i<(ctx.N << ctx.extendBits); i++) {
        ctx.Zi_2ns[i] = zhInv(i);
    }

    // Read const coefs
    constPols.writeToBigBuffer(ctx.const_n);

    return ctx;
}

module.exports.computeQStark = async function computeQStark(ctx, logger) {
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

    if (logger) logger.debug("> Merkelizing 4...");
    if (global.gc) {global.gc();}
    ctx.trees[4] = await ctx.MH.merkelize(ctx.cm4_2ns, ctx.pilInfo.mapSectionsN.cm4_2ns, 1 << ctx.nBitsExt);

    const nextChallenge = await module.exports.calculateChallengeStark(4, ctx);    
    return nextChallenge;
}

module.exports.computeEvalsStark = async function computeEvalsStark(ctx, challenge, logger) {
    ctx.challenges[7] = challenge; // xi

    let LEv = new Array(ctx.N);
    let LpEv = new Array(ctx.N);
    LEv[0] = 1n;
    LpEv[0] = 1n;
    const xis = ctx.F.div(ctx.challenges[7], ctx.F.shift);
    const wxis = ctx.F.div(ctx.F.mul(ctx.challenges[7], ctx.F.w[ctx.nBits]), ctx.F.shift);
    for (let k=1; k<ctx.N; k++) {
        LEv[k] = ctx.F.mul(LEv[k-1], xis);
        LpEv[k] = ctx.F.mul(LpEv[k-1], wxis);
    }
    LEv = ctx.F.ifft(LEv);
    LpEv = ctx.F.ifft(LpEv);

    if (global.gc) {global.gc();}
    ctx.evals = [];
    for (let i=0; i<ctx.pilInfo.evMap.length; i++) {
        const ev = ctx.pilInfo.evMap[i];
        let p;
        if (ev.type == "const") {
            p = {
                buffer: ctx.const_2ns,
                deg: 1<<ctx.nBitsExt,
                offset: ev.id,
                size: ctx.pilInfo.nConstants,
                dim: 1
            };
        } else if (ev.type == "cm") {
            p = getPolRef(ctx, ctx.pilInfo.cm_2ns[ev.id]);
        } else {
            throw new Error("Invalid ev type: "+ ev.type);
        }
        l = ev.prime ? LpEv : LEv;
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
            acc = ctx.F.add(acc, ctx.F.mul(v, l[k]));
        }
        ctx.evals[i] = acc;
    }

    for (let i=0; i<ctx.evals.length; i++) {
        ctx.transcript.put(ctx.evals[i]);
    }

    return ctx.transcript.getField();
}

module.exports.computeFRIStark = async function computeFRIStark(ctx, challenge, parallelExec, useThreads, logger) {
    ctx.challenges[5] = challenge; // v1
    ctx.challenges[6] = ctx.transcript.getField(); // v2

    // Calculate xDivXSubXi, xDivX4SubWXi
    if (global.gc) {global.gc();}
    const xi = ctx.challenges[7];
    const wxi = ctx.F.mul(ctx.challenges[7], ctx.F.w[ctx.nBits]);

    let tmp_den = new Array(ctx.N << ctx.extendBits);
    let tmp_denw = new Array(ctx.N << ctx.extendBits);
    let x = ctx.F.shift;
    for (let k=0; k< ctx.N<<ctx.extendBits; k++) {
        tmp_den[k] = ctx.F.sub(x, xi);
        tmp_denw[k] = ctx.F.sub(x, wxi);
        x = ctx.F.mul(x, ctx.F.w[ctx.nBits + ctx.extendBits])
    }
    tmp_den = ctx.F.batchInverse(tmp_den);
    tmp_denw = ctx.F.batchInverse(tmp_denw);
    x = ctx.F.shift;
    for (let k=0; k< ctx.N<<ctx.extendBits; k++) {
        const v = ctx.F.mul(tmp_den[k], x);
        ctx.xDivXSubXi_2ns[3*k] = v[0];
        ctx.xDivXSubXi_2ns[3*k + 1] = v[1];
        ctx.xDivXSubXi_2ns[3*k + 2] = v[2];

        const vw = ctx.F.mul(tmp_denw[k], x);
        ctx.xDivXSubWXi_2ns[3*k] = vw[0];
        ctx.xDivXSubWXi_2ns[3*k+1] = vw[1];
        ctx.xDivXSubWXi_2ns[3*k+2] = vw[2];

        x = ctx.F.mul(x, ctx.F.w[ctx.nBits + ctx.extendBits])
    }

    await callCalculateExps("step52ns", "2ns", ctx, parallelExec, useThreads);


    const friPol = new Array(ctx.N<<ctx.extendBits);

    for (let i=0; i<ctx.N<<ctx.extendBits; i++) {
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

    if (global.gc) {global.gc();}
    ctx.friProof = await ctx.fri.prove(ctx.transcript, friPol, queryPol);
}

module.exports.genProofStark = async function genProof(ctx) {
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

module.exports.extendAndMerkelize = async function  extendAndMerkelize(stage, ctx) {

    const buffFrom = ctx["cm" + stage + "_n"];
    const buffTo = ctx["cm" + stage + "_2ns"];

    const nPols = ctx.pilInfo.mapSectionsN["cm" + stage + "_n"];

    await interpolate(buffFrom, nPols, ctx.nBits, buffTo, ctx.nBitsExt);
    ctx.trees[stage] = await ctx.MH.merkelize(buffTo, nPols, 1 << ctx.nBitsExt);

    const nextChallenge = await module.exports.calculateChallengeStark(stage, ctx);    
    return nextChallenge;

}


module.exports.calculateChallengeStark = async function calculateChallengeStark(stage, ctx) {
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

