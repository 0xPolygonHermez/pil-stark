const { BigBuffer, utils } = require("ffjavascript");
const { Polynomial, Keccak256Transcript, commit, open } = require("shplonkjs");

const { ifft, fft } = require("../../helpers/fft/fft_p.bn128");
const { PILFFLONK_PROTOCOL_ID } = require("../zkey/zkey_constants");

const { stringifyBigInts } = utils;

module.exports.initProverFflonk = async function initProver(pilInfo, zkey, logger) {

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

    ctx.challenges = [];

    ctx.committedPols = {};
    ctx.nonCommittedPols = [];

    let blindCoefs =  ctx.pilInfo.maxPolsOpenings * (ctx.pilInfo.qDeg + 1);
    ctx.domainSizeQ = ctx.pilInfo.qDeg * ctx.N + blindCoefs;
    ctx.nQ = ctx.zkey.maxQDegree ? Math.ceil((ctx.domainSizeQ - blindCoefs) / (ctx.zkey.maxQDegree * ctx.N)) : 1;

    if (logger) {
        logger.debug("-----------------------------");
        logger.debug("  PIL-FFLONK PROVE SETTINGS");
        logger.debug(`  Curve:         ${ctx.curve.name}`);
        logger.debug(`  Domain size:   ${ctx.N} (2^${ctx.zkey.power})`);
        logger.debug(`  Domaize size coefs: ${ctx.NCoefs} (2^${ctx.nBitsCoefs})`);
        logger.debug(`  Domain size ext: ${ctx.Next} (2^${ctx.nBitsExt})`);
        logger.debug(`  ExtendBits: ${ctx.extendBits}`);
        logger.debug(`  Const  pols:   ${ctx.pilInfo.nConstants}`);
        logger.debug(`  Stage 1 pols:   ${ctx.pilInfo.cmPolsMap.filter(p => p.stage == "cm1").length}`);
        for(let i = 0; i < ctx.pilInfo.nLibStages; i++) {
            const stage = i + 2;
            logger.debug(`  Stage ${stage} pols:   ${ctx.pilInfo.cmPolsMap.filter(p => p.stage == "cm" + stage).length}`);
        }
        logger.debug(`  Stage Q pols:   ${ctx.nQ}`);
        logger.debug(`  Temp exp pols: ${ctx.pilInfo.cmPolsMap.filter(p => p.stage == "tmpExp").length}`);
        logger.debug("-----------------------------");
    }

    // Reserve big buffers for the polynomial evaluations
    ctx.const_n = new Proxy(new BigBuffer(ctx.pilInfo.nConstants * ctx.N * ctx.F.n8), BigBufferHandler); // Constant polynomials
    ctx.cm1_n = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm1 * ctx.N * ctx.F.n8), BigBufferHandler);
    for(let i = 0; i < ctx.pilInfo.nLibStages; i++) {
        const stage = i + 2;
        ctx[`cm${stage}_n`] = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN[`cm${stage}`] * ctx.N * ctx.F.n8), BigBufferHandler);
    }    
    ctx.tmpExp_n = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.tmpExp * ctx.N * ctx.F.n8), BigBufferHandler); // Expression polynomials
    ctx.x_n = new Proxy(new BigBuffer(ctx.N * ctx.F.n8), BigBufferHandler); // Omegas de field extension

    // Reserve big buffers for the polynomial coefficients
    ctx.const_coefs = new Proxy(new BigBuffer(ctx.pilInfo.nConstants * ctx.N * ctx.F.n8), BigBufferHandler); // Constant polynomials
    ctx.cm1_coefs = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm1 * ctx.NCoefs * ctx.F.n8), BigBufferHandler);
    for(let i = 0; i < ctx.pilInfo.nLibStages; i++) {
        const stage = i + 2;
        ctx[`cm${stage}_coefs`] = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN[`cm${stage}`] * ctx.NCoefs * ctx.F.n8), BigBufferHandler);
    }  

    // Reserve big buffers for the polynomial evaluations in the extended
    ctx.const_ext = new Proxy(new BigBuffer(ctx.pilInfo.nConstants * ctx.Next * ctx.F.n8), BigBufferHandler);
    ctx.cm1_ext = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN.cm1 * ctx.Next * ctx.F.n8), BigBufferHandler);
    for(let i = 0; i < ctx.pilInfo.nLibStages; i++) {
        const stage = i + 2;
        ctx[`cm${stage}_ext`] = new Proxy(new BigBuffer(ctx.pilInfo.mapSectionsN[`cm${stage}`] * ctx.Next * ctx.F.n8), BigBufferHandler);
    }
    ctx.q_ext = new Proxy(new BigBuffer(ctx.Next * ctx.F.n8), BigBufferHandler);
    ctx.x_ext = new Proxy(new BigBuffer(ctx.Next * ctx.F.n8), BigBufferHandler); // Omegas a l'extès

    // Read const coefs and extended evals
    ctx.const_n.set(ctx.zkey.constPolsEvals);
    ctx.const_coefs.set(ctx.zkey.constPolsCoefs);
    ctx.const_ext.set(ctx.zkey.constPolsEvalsExt);

    // Read x_n and x_ext
    ctx.x_n.set(ctx.zkey.x_n);
    ctx.x_ext.set(ctx.zkey.x_ext);

    ctx.transcript = new Keccak256Transcript(ctx.curve);

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

    return ctx;
}

module.exports.computeQFflonk = async function computeQ(ctx, logger) {
    if (logger) logger.debug("Compute Trace Quotient Polynomials");

    ctx["Q"] = await Polynomial.fromEvaluations(ctx.q_ext, ctx.curve, logger);
    ctx["Q"].divZh(ctx.N, 1 << ctx.extendBits);

    if(ctx.nQ > 1) {
        let rand1 = ctx.F.random();
        let rand2 = ctx.F.random();
        for(let i = 0; i < ctx.nQ; ++i) {
            const st = (i * ctx.zkey.maxQDegree * ctx.N) * ctx.F.n8;
            const end = (i == ctx.nQ - 1 ? ctx.domainSizeQ : (i + 1) * ctx.zkey.maxQDegree * ctx.N) * ctx.F.n8;

            let len = end - st;
            let extLen = i == ctx.nQ - 1 ? len : len + 2 * ctx.F.n8;
            let coefs = new BigBuffer(extLen);
            
            coefs.set(ctx["Q"].coef.slice(st, end));

            // Blind Qi polynomials
            if (i > 0) {
                coefs.set(ctx.F.sub(coefs.slice(0, ctx.F.n8), rand1), 0);
                coefs.set(ctx.F.sub(coefs.slice(ctx.F.n8, 2*ctx.F.n8), rand2), ctx.F.n8);
            }

            if (i < ctx.nQ - 1) {
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

    const stage = ctx.pilInfo.nLibStages + 2;

    let commitsStageQ = await commit(stage, ctx.zkey, ctx, ctx.zkey.pTau, ctx.curve, { multiExp: true, logger });
    commitsStageQ.forEach((com) => ctx.committedPols[`${com.index}`] = { commit: com.commit, pol: com.pol });

    commitsStageQ.forEach((com) => console.log(com.index, ctx.curve.G1.toString(com.commit)));
}

module.exports.computeOpeningsFflonk = async function computeOpenings(ctx,challenge, logger) {
    if (logger) logger.debug("Open Polynomials");

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

module.exports.genProofFflonk = async function genProof(ctx, logger) {
    if(logger) logger.debug("Generating proof");

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
    let publics = stringifyBigInts(ctx.publics.map(p => ctx.F.toObject(p)));

    return {proof, publics};
}

module.exports.setChallengesFflonk = function setChallengesFflonk(stage, ctx, challenge, logger) {
    let challengesIndex = ctx.pilInfo.challenges[stage];

    if(challengesIndex.length === 0) throw new Error("No challenges needed for stage " + stage);

    ctx.challenges[challengesIndex[0]] = challenge;
    if (logger) logger.debug("··· challenges[" + challengesIndex[0] + "]: " + ctx.F.toString(ctx.challenges[challengesIndex[0]]));
    for (let i=1; i<challengesIndex.length; i++) {
        const previousIndex = challengesIndex[i-1];
        const index = challengesIndex[i];
        ctx.transcript.reset();
        ctx.transcript.addScalar(ctx.challenges[previousIndex]);
        ctx.challenges[index] = ctx.transcript.getChallenge();
        if (logger) logger.debug("··· challenges[" + challengesIndex[i] + "]: " + ctx.F.toString(ctx.challenges[challengesIndex[i]]));
    }
    return;
}


module.exports.calculateChallengeFflonk = async function calculateChallengeFflonk(stage, ctx) {
    ctx.transcript.reset();

    if(stage === 1) {
        const commitsStage0 = ctx.zkey.f.filter(f => f.stages[0].stage === 0).map(f => `f${f.index}_0`);
        for (let i = 0; i < commitsStage0.length; ++i) {
            ctx.transcript.addPolCommitment(ctx.committedPols[commitsStage0[i]].commit);
        }
    
        // Add all the publics to the transcript
        for (let i = 0; i < ctx.pilInfo.publics.length; i++) {
            ctx.transcript.addScalar(ctx.publics[i]);
        }
    }

    let challengesIndex = ctx.pilInfo.challenges[stage];
    
    if(challengesIndex) {
        const lastChallengeIndex = challengesIndex[challengesIndex.length - 1];
        const challenge = ctx.challenges[lastChallengeIndex];
        ctx.transcript.addScalar(challenge);
    }

    if(stage === "Q") stage = ctx.pilInfo.nLibStages + 2;

    const commitsStage = ctx.zkey.f.filter(f => f.stages[0].stage === stage).map(f => `f${f.index}_${stage}`);
    for(let i = 0; i < commitsStage.length; i++) {
        ctx.transcript.addPolCommitment(ctx.committedPols[commitsStage[i]].commit);
    }

    const nextChallenge = ctx.transcript.getChallenge();
    ctx.transcript.reset();

    return nextChallenge;
}

module.exports.extendAndCommit = async function extendAndCommit(stage, ctx, logger) {
    
    const buffFrom = ctx["cm" + stage + "_n"];
    const buffCoefs = ctx["cm" + stage + "_coefs"];
    const buffTo = ctx["cm" + stage + "_ext"];

    const nPols = ctx.pilInfo.mapSectionsN[`cm${stage}`];

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

module.exports.BigBufferHandler = BigBufferHandler;
