const { BigBuffer, utils } = require("ffjavascript");
const { Polynomial, Keccak256Transcript, commit, open } = require("shplonkjs");
const { calculateH1H2, calculateZ } = require("../../helpers/polutils");

const { ifft, fft } = require("../../helpers/fft/fft_p.bn128");
const { PILFFLONK_PROTOCOL_ID } = require("../zkey/zkey_constants");
const { callCalculateExps, calculateExpAtPoint, setPol, getPol } = require("../../prover/prover_helpers");

const parallelExec = false;
const useThreads = false;

const { stringifyBigInts } = utils;

module.exports = async function fflonkProve(zkey, cmPols, pilInfo, options = {}) {
    const logger = options.logger;
    
    const ctx = await initProver(pilInfo, zkey, logger);

    // Read committed polynomials
    await cmPols.writeToBigBufferFr(ctx.cm1_n, ctx.F);

    // STAGE 0. Compute Publics and store constants
    await stage0(ctx, logger);

    // STAGE 1. Compute Trace Column Polynomials
    let challenge = await stage1(ctx, logger);

    // STAGE 2. Compute Inclusion Polynomials
    challenge = await stage2(ctx, challenge, logger);

    // STAGE 3. Compute Grand Product and Intermediate Polynomials
    challenge = await stage3(ctx, challenge, logger);

    // STAGE 4. Trace Quotient Polynomials
    challenge = await computeQ(ctx, challenge, logger);

    // STAGE 5. Open Polynomials
    await openPols(ctx,challenge, logger);

    const {proof, publicSignals} = await genProof(ctx, logger);

    return {
        proof,
        publicSignals,
    };
}

async function initProver(pilInfo, zkey, logger) {

    const ctx = {};

    ctx.prover = "fflonk";

    if (logger) logger.info("PIL-FFLONK PROVER STARTED");

    if (zkey.protocolId !== PILFFLONK_PROTOCOL_ID) {
        throw new Error("zkey file is not fflonk");
    }

    ctx.pilInfo = pilInfo;
    ctx.zkey = zkey;
    ctx.curve = ctx.zkey.curve;
    ctx.F = ctx.curve.Fr;
    
    ctx.extendBitsQ = Math.ceil(Math.log2(ctx.pilInfo.qDeg + 1));

    ctx.nBits = ctx.zkey.power;
    ctx.nBitsCoefs = ctx.zkey.power + ctx.pilInfo.nBitsZK;
    ctx.nBitsExt = ctx.zkey.power + ctx.extendBitsQ + ctx.pilInfo.nBitsZK;

    ctx.extendBits = (ctx.nBitsExt - ctx.nBits);

    ctx.N = 1 << ctx.nBits;
    ctx.NCoefs = 1 << ctx.nBitsCoefs;
    ctx.Next = (1 << ctx.nBitsExt);

    ctx.challenges = [0,0,0,0,0];

    ctx.committedPols = {};
    ctx.nonCommittedPols = [];

    const domainSizeQ = ctx.pilInfo.qDeg * ctx.N + ctx.pilInfo.maxPolsOpenings * (ctx.pilInfo.qDeg + 1);
    const nQ = ctx.zkey.maxQDegree ? Math.ceil(domainSizeQ / (ctx.zkey.maxQDegree * ctx.N)) : 1;

    if (logger) {
        logger.debug("-----------------------------");
        logger.debug("  PIL-FFLONK PROVE SETTINGS");
        logger.debug(`  Curve:         ${ctx.curve.name}`);
        logger.debug(`  Domain size:   ${ctx.N} (2^${ctx.zkey.power})`);
        logger.debug(`  Domaize size coefs: ${ctx.NCoefs} (2^${ctx.nBitsCoefs})`);
        logger.debug(`  Domain size ext: ${ctx.Next} (2^${ctx.nBitsExt})`);
        logger.debug(`  ExtendBits: ${ctx.extendBits}`);
        logger.debug(`  Const  pols:   ${ctx.pilInfo.nConstants}`);
        logger.debug(`  Stage 1 pols:   ${ctx.pilInfo.mapSectionsN.cm1_n}`);
        logger.debug(`  Stage 2 pols:   ${ctx.pilInfo.mapSectionsN.cm2_n}`);
        logger.debug(`  Stage 3 pols:   ${ctx.pilInfo.mapSectionsN.cm3_n}`);
        logger.debug(`  Stage 4 pols:   ${nQ}`);
        logger.debug(`  Temp exp pols: ${ctx.pilInfo.mapSectionsN.tmpExp_n}`);
        logger.debug("-----------------------------");
    }

    // Reserve big buffers for the polynomial evaluations
    ctx.const_n = new Proxy(new BigBuffer(ctx.pilInfo.nConstants * ctx.N * ctx.F.n8), BigBufferHandler); // Constant polynomials
    ctx.cm1_n = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm1_n * ctx.N * ctx.F.n8), BigBufferHandler);    
    ctx.cm2_n = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm2_n * ctx.N * ctx.F.n8), BigBufferHandler);
    ctx.cm3_n = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm3_n * ctx.N * ctx.F.n8), BigBufferHandler);
    ctx.tmpExp_n = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.tmpExp_n * ctx.N * ctx.F.n8), BigBufferHandler); // Expression polynomials
    ctx.x_n = new Proxy(new BigBuffer(ctx.N * ctx.F.n8), BigBufferHandler); // Omegas de field extension

    // Reserve big buffers for the polynomial coefficients
    ctx.const_coefs = new Proxy(new BigBuffer(ctx.pilInfo.nConstants * ctx.N * ctx.F.n8), BigBufferHandler); // Constant polynomials
    ctx.cm1_coefs = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm1_n * ctx.NCoefs * ctx.F.n8), BigBufferHandler);
    ctx.cm2_coefs = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm2_n * ctx.NCoefs * ctx.F.n8), BigBufferHandler);
    ctx.cm3_coefs = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm3_n * ctx.NCoefs * ctx.F.n8), BigBufferHandler);

    // Reserve big buffers for the polynomial evaluations in the extended
    ctx.const_2ns = new Proxy(new BigBuffer(ctx.pilInfo.nConstants * ctx.Next * ctx.F.n8), BigBufferHandler);
    ctx.cm1_2ns = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm1_n * ctx.Next * ctx.F.n8), BigBufferHandler);
    ctx.cm2_2ns = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm2_n * ctx.Next * ctx.F.n8), BigBufferHandler);
    ctx.cm3_2ns = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm3_n * ctx.Next * ctx.F.n8), BigBufferHandler);
    ctx.q_2ns = new Proxy(new BigBuffer(ctx.pilInfo.qDim * ctx.Next * ctx.F.n8), BigBufferHandler);
    ctx.x_2ns = new Proxy(new BigBuffer(ctx.Next * ctx.F.n8), BigBufferHandler); // Omegas a l'extès

    // Read const coefs and extended evals
    ctx.const_n.set(ctx.zkey.constPolsEvals);
    ctx.const_coefs.set(ctx.zkey.constPolsCoefs);
    ctx.const_2ns.set(ctx.zkey.constPolsEvalsExt);

    // Read x_n and x_2ns
    ctx.x_n.set(ctx.zkey.x_n);
    ctx.x_2ns.set(ctx.zkey.x_2ns);

    ctx.transcript = new Keccak256Transcript(ctx.curve);

    return ctx;
}

async function stage0(ctx, logger) {
    // Add constant composed polynomials
    if (ctx.pilInfo.nConstants > 0) {
        for (let i = 0; i < ctx.pilInfo.nConstants; i++) {
            const coefs = new BigBuffer(ctx.N * ctx.F.n8);
            for (let j = 0; j < ctx.N; j++) {
                coefs.set( ctx.const_coefs[i + j * ctx.pilInfo.nConstants], j * ctx.F.n8);
            }
            ctx[ctx.zkey.polsNamesStage[0][i]] = new Polynomial(coefs, ctx.curve, logger);
        }
        
        const cnstCommitPols = Object.keys(ctx.zkey).filter(k => k.match(/^f\d/));
        for (let i = 0; i < cnstCommitPols.length; ++i) {
            const commit = ctx.zkey[cnstCommitPols[i]].commit;
            const pol = new Polynomial(ctx.zkey[cnstCommitPols[i]].pol, ctx.curve, logger);
            console.log(cnstCommitPols[i], ctx.curve.G1.toString(commit));
            ctx.committedPols[`${cnstCommitPols[i]}_0`] = { commit: commit, pol: pol };
        }
    }

    // Calculate publics
    ctx.publics = [];
    for (let i = 0; i < ctx.pilInfo.publics.length; i++) {
        const publicPol = ctx.pilInfo.publics[i];

        if ("cmP" === publicPol.polType) {
            const offset = (ctx.pilInfo.publics[i].idx * ctx.pilInfo.mapSectionsN.cm1_n + ctx.pilInfo.publics[i].polId);
            ctx.publics[i] = ctx.cm1_n[offset];
        } else if ("imP" === publicPol.polType) {
            ctx.publics[i] = calculateExpAtPoint(ctx, ctx.pilInfo.publicsCode[i], publicPol.idx);
        } else {
            throw new Error(`Invalid public type: ${polType.type}`);
        }
    }   
}

async function stage1(ctx, logger) {
    if (logger) logger.debug("> STAGE 1. Compute Trace Column Polynomials");

    await extendAndCommit(1, ctx, logger);
    
    const nextChallenge = await calculateFirstChallenge(ctx);
    return nextChallenge;
}

async function stage2(ctx, challenge, logger) {
    if(!ctx.pilInfo.mapSectionsN.cm2_n && ctx.pilInfo.peCtx.length === 0) return challenge;

    // Compute challenge alpha
    ctx.challenges[0] = challenge;
    if (logger) logger.debug("··· challenges.alpha: " + ctx.F.toString(ctx.challenges[0]));

    // Compute challenge beta
    ctx.transcript.reset();
    ctx.transcript.addScalar(ctx.challenges[0]);
    ctx.challenges[1] = ctx.transcript.getChallenge();
    if (logger) logger.debug("··· challenges.beta: " + ctx.F.toString(ctx.challenges[1]));        

    if (!ctx.pilInfo.mapSectionsN.cm2_n) {
        ctx.transcript.reset();
        ctx.transcript.addScalar(ctx.challenges[1]);
        return ctx.transcript.getChallenge();
    }

    if (logger) logger.debug("> STAGE 2. Compute Inclusion Polynomials");

    // STEP 2.2 - Compute stage 2 polynomials --> h1, h2
    await callCalculateExps("step2prev", "n", ctx, parallelExec, useThreads);

    let nCm2 = ctx.pilInfo.mapSectionsN.cm1_n;

    for (let i = 0; i < ctx.pilInfo.puCtx.length; i++) {
        const puCtx = ctx.pilInfo.puCtx[i];

        const fPol = getPol(ctx, ctx.pilInfo.exp2pol[puCtx.fExpId]);
        const tPol = getPol(ctx, ctx.pilInfo.exp2pol[puCtx.tExpId]);

        const [h1, h2] = calculateH1H2(ctx.F, fPol, tPol);
        setPol(ctx, ctx.pilInfo.cm_n[nCm2 + 2 * i], h1);
        setPol(ctx, ctx.pilInfo.cm_n[nCm2 + 2 * i + 1], h2);
    }

    await extendAndCommit(2, ctx, logger);

    // STEP 2.4 - Add to transcript
    const nextChallenge = await calculateChallenge(2, ctx, ctx.challenges[1]);
    return nextChallenge;
}

async function stage3(ctx, challenge, logger) {
    if (!ctx.pilInfo.mapSectionsN.cm3_n) return challenge;

    if (logger) logger.debug("> STAGE 3. Compute Grand Product and Intermediate Polynomials");

    // Compute challenge gamma
    ctx.challenges[2] = challenge;
    if (logger) logger.debug("··· challenges.gamma: " + ctx.F.toString(ctx.challenges[2]));

    // Compute challenge delta
    ctx.transcript.reset();
    ctx.transcript.addScalar(ctx.challenges[2]);
    ctx.challenges[3] = ctx.transcript.getChallenge();
    if (logger) logger.debug("··· challenges.delta: " + ctx.F.toString(ctx.challenges[3]));


    // STEP 3.2 - Compute stage 3 polynomials --> Plookup Z, Permutations Z & ConnectionZ polynomials
    const nPlookups = ctx.pilInfo.puCtx.length;
    const nPermutations = ctx.pilInfo.peCtx.length;
    const nConnections = ctx.pilInfo.ciCtx.length;

    await callCalculateExps("step3prev", "n", ctx, parallelExec, useThreads);

    let nCm3 = ctx.pilInfo.mapSectionsN.cm1_n + ctx.pilInfo.mapSectionsN.cm2_n;

    for (let i = 0; i < nPlookups; i++) {
        if (logger) logger.debug(`··· Calculating z for plookup ${i}`);

        const pu = ctx.pilInfo.puCtx[i];
        const pNum = getPol(ctx, ctx.pilInfo.exp2pol[pu.numId]);
        const pDen = getPol(ctx, ctx.pilInfo.exp2pol[pu.denId]);
        const z = await calculateZ(ctx.F, pNum, pDen);

        setPol(ctx, ctx.pilInfo.cm_n[nCm3 + i], z);
    }

    for (let i = 0; i < nPermutations; i++) {
        if (logger) logger.debug(`··· Calculating z for permutation check ${i}`);

        const pe = ctx.pilInfo.peCtx[i];
        const pNum = getPol(ctx, ctx.pilInfo.exp2pol[pe.numId]);
        const pDen = getPol(ctx, ctx.pilInfo.exp2pol[pe.denId]);
        const z = await calculateZ(ctx.F, pNum, pDen);

        setPol(ctx, ctx.pilInfo.cm_n[nCm3 + nPlookups + i], z);
    }

    for (let i = 0; i < nConnections; i++) {
        if (logger) logger.debug(`··· Calculating z for connection ${i}`);

        const ci = ctx.pilInfo.ciCtx[i];
        const pNum = getPol(ctx, ctx.pilInfo.exp2pol[ci.numId]);
        const pDen = getPol(ctx, ctx.pilInfo.exp2pol[ci.denId]);
        const z = await calculateZ(ctx.F, pNum, pDen);

        setPol(ctx, ctx.pilInfo.cm_n[nCm3 + nPlookups + nPermutations + i], z);
    }

    await callCalculateExps("step3", "n", ctx, parallelExec, useThreads);

    await extendAndCommit(3, ctx, logger);

    const nextChallenge = await calculateChallenge(3, ctx, ctx.challenges[3]);
    return nextChallenge;
}

async function computeQ(ctx, challenge, logger) {
    if (logger) logger.debug("> STAGE 4. Compute Trace Quotient Polynomials");


    // Compute challenge a
    ctx.challenges[4] = challenge;
    if (logger) logger.debug("··· challenges.a: " + ctx.F.toString(ctx.challenges[4]));

    // STEP 4.2 - Compute stage 4 polynomial --> Q polynomial
    await callCalculateExps("step42ns", "2ns", ctx, parallelExec, useThreads);

    ctx["Q"] = await Polynomial.fromEvaluations(ctx.q_2ns, ctx.curve, logger);
    ctx["Q"].divZh(ctx.N, 1 << ctx.extendBits);

    if(ctx.zkey.maxQDegree) {
        const domainSizeQ = ctx.pilInfo.qDeg * ctx.N + ctx.pilInfo.maxPolsOpenings * (ctx.pilInfo.qDeg + 1);
        const nQ = Math.ceil(domainSizeQ / (ctx.zkey.maxQDegree * ctx.N));
        let rand1 = ctx.F.random();
        let rand2 = ctx.F.random();


        for(let i = 0; i < nQ; ++i) {
            const st = (i * ctx.zkey.maxQDegree * ctx.N) * ctx.F.n8;
            const end = (i == nQ - 1 ? domainSizeQ : (i + 1) * ctx.zkey.maxQDegree * ctx.N) * ctx.F.n8;

            let len = end - st;
            let extLen = i == nQ - 1 ? len : len + 2 * ctx.F.n8;
            let coefs = new BigBuffer(extLen);
            
            coefs.set(ctx["Q"].coef.slice(st, end));

            // Blind Qi polynomials
            if (i > 0) {
                coefs.set(ctx.F.sub(coefs.slice(0, ctx.F.n8), rand1), 0);
                coefs.set(ctx.F.sub(coefs.slice(ctx.F.n8, 2*ctx.F.n8), rand2), ctx.F.n8);
            }

            if (i < nQ - 1) {
                rand1 = ctx.F.random();
                rand2 = ctx.F.random();
                coefs.set(rand1, len);
                coefs.set(rand2, len + ctx.F.n8);
            }
            
            ctx[`Q${i}`] = new Polynomial(coefs, ctx.curve, logger);

        } 
    } else {
        ctx.nonCommittedPols.push("Q");
    }

    // STEP 4.3 - Commit stage 4 polynomials
    let commitsStage4 = await commit(4, ctx.zkey, ctx, ctx.zkey.pTau, ctx.curve, { multiExp: true, logger });
    commitsStage4.forEach((com) => ctx.committedPols[`${com.index}`] = { commit: com.commit, pol: com.pol });

    commitsStage4.forEach((com) => console.log(com.index, ctx.curve.G1.toString(com.commit)));

    if (logger) logger.debug("> Computing challenge xi seed");
    ctx.transcript.reset();
    ctx.transcript.addScalar(ctx.challenges[4]);

    for(let i = 0; i < commitsStage4.length; i++) {
        ctx.transcript.addPolCommitment(commitsStage4[i].commit);
    }

    const challengeQ = ctx.transcript.getChallenge();

    return challengeQ;
}

async function openPols(ctx,challenge, logger) {
    if (logger) logger.debug("> STAGE 5. Open Polynomials");

    const challengeXiSeed = challenge;
    if (logger) logger.debug("··· challenges.xiSeed: " + ctx.F.toString(challengeXiSeed));

    const [cmts, evaluations] = await open(ctx.zkey, ctx.zkey.pTau, ctx, ctx.committedPols, ctx.curve, { logger, xiSeed: challengeXiSeed, nonCommittedPols: ctx.nonCommittedPols});

    if(logger) logger.debug("··· Batched Inverse shplonk: " + ctx.F.toString(evaluations["inv"]));
    // Compute challengeXiSeed 
    let challengeXi = ctx.F.exp(challengeXiSeed, ctx.zkey.powerW);

    const xN = ctx.F.exp(challengeXi, ctx.N);
    const Z = ctx.F.sub(xN, ctx.F.one);

    if(logger) logger.debug("··· Z: " + ctx.F.toString(Z));

    evaluations.invZh = ctx.F.inv(Z);

    if(logger) logger.debug("··· invZh: " + ctx.F.toString(evaluations.invZh));

    ctx.evaluations = evaluations;
    ctx.cmts = cmts;
}

async function genProof(ctx, logger) {
    let proof = { polynomials: {}, evaluations: {} };
    proof.protocol = "pilfflonk";
    proof.curve = ctx.curve.name;
    Object.keys(ctx.cmts).forEach(key => {
        proof.polynomials[key] = ctx.curve.G1.toObject(ctx.cmts[key]);
    });

    Object.keys(ctx.evaluations).forEach(key => {
        if (key !== "Q") proof.evaluations[key] = ctx.F.toObject(ctx.evaluations[key]);
    });

    proof = stringifyBigInts(proof);

    // Prepare public inputs
    let publicSignals = stringifyBigInts(ctx.publics.map(p => ctx.F.toObject(p)));

    return {proof, publicSignals};
}

async function calculateFirstChallenge(ctx) {
    ctx.transcript.reset();

    const commitsStage0 = ctx.zkey.f.filter(f => f.stages[0].stage === 0).map(f => `f${f.index}_0`);
    for (let i = 0; i < commitsStage0.length; ++i) {
        ctx.transcript.addPolCommitment(ctx.committedPols[commitsStage0[i]].commit);
    }

    // Add all the publics to the transcript
    for (let i = 0; i < ctx.pilInfo.publics.length; i++) {
        ctx.transcript.addScalar(ctx.publics[i]);
    }

    const commitsStage1 = ctx.zkey.f.filter(f => f.stages[0].stage === 1).map(f => `f${f.index}_1`);
    for(let i = 0; i < commitsStage1.length; i++) {
        ctx.transcript.addPolCommitment(ctx.committedPols[commitsStage1[i]].commit);
    }

    return ctx.transcript.getChallenge();
}

async function calculateChallenge(stage, ctx, previousChallenge) {
    ctx.transcript.reset();
    ctx.transcript.addScalar(previousChallenge);

    const commitsStage = ctx.zkey.f.filter(f => f.stages[0].stage === stage).map(f => `f${f.index}_${stage}`);
    for(let i = 0; i < commitsStage.length; i++) {
        ctx.transcript.addPolCommitment(ctx.committedPols[commitsStage[i]].commit);
    }

    return ctx.transcript.getChallenge();
}

async function extendAndCommit(stage, ctx, logger) {
    
    const buffFrom = ctx["cm" + stage + "_n"];
    const buffCoefs = ctx["cm" + stage + "_coefs"];
    const buffTo = ctx["cm" + stage + "_2ns"];

    const nPols = ctx.pilInfo.mapSectionsN["cm" + stage + "_n"];

    await ifft(buffFrom, nPols, ctx.nBits, buffCoefs, ctx.F);

    for (let i = 0; i < nPols; i++) {
        let nOpenings = findNumberOpenings(ctx.zkey.f, ctx.zkey.polsNamesStage[stage][i], stage);
        for(let j = 0; j < nOpenings; ++j) {
            const b = ctx.F.random();
            let offset1 = (j * nPols + i) * ctx.F.n8; 
            let offsetN = ((j + ctx.N) * nPols + i) * ctx.F.n8; 
            buffCoefs.set(ctx.F.add(buffCoefs.slice(offset1,offset1 + ctx.F.n8), ctx.F.neg(b)), offset1);
            buffCoefs.set(ctx.F.add(buffCoefs.slice(offsetN, offsetN + ctx.F.n8), b), offsetN);
        }
    }

    // Store coefs to context
    for (let i = 0; i < nPols; i++) {
        const coefs = new BigBuffer(ctx.NCoefs * ctx.F.n8);
        for (let j = 0; j < ctx.NCoefs; j++) {
            coefs.set(buffCoefs.slice((i + j * nPols) * ctx.F.n8, (i + j * nPols + 1) * ctx.F.n8), j * ctx.F.n8);
        }
        ctx[ctx.zkey.polsNamesStage[stage][i]] = new Polynomial(coefs, ctx.curve, logger);
    }

    await fft(buffCoefs, nPols, ctx.nBitsExt, buffTo, ctx.F);

    let commits = await commit(stage, ctx.zkey, ctx, ctx.zkey.pTau, ctx.curve, { multiExp: true, logger });
    commits.forEach((com) => ctx.committedPols[`${com.index}`] = { commit: com.commit, pol: com.pol });

    commits.forEach((com) => console.log(com.index, ctx.curve.G1.toString(com.commit)));

    function findNumberOpenings(f, name, stage) {
        for(let i = 0; i < f.length; ++i) {
            if(f[i].stages[0].stage != stage) continue;
            for(let j = 0; j < f[i].pols.length; ++j) {
                if(f[i].pols[j] === name) {
                    return f[i].openingPoints.length + 1;
                }
            }
        }
        return 0;
    } 
}

const BigBufferHandler = {
    get: function (obj, prop) {
        if (!isNaN(prop)) {
            return obj.slice(prop*32, prop*32 + 32);
        } else return obj[prop];
    },
    set: function (obj, prop, value) {
        if (!isNaN(prop)) {
            obj.set(value, prop*32);
            return true;
        } else {
            obj[prop] = value;
            return true;
        }
    },
};
