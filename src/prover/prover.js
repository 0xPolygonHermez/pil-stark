const { initProverFflonk, extendAndCommit, computeQFflonk, computeOpeningsFflonk, genProofFflonk, setChallengesFflonk, calculateChallengeFflonk } = require("../fflonk/helpers/fflonk_prover_helpers");
const { calculateH1H2, calculateZ } = require("../helpers/polutils");
const { initProverStark, extendAndMerkelize, computeQStark, computeEvalsStark, computeFRIStark, genProofStark, setChallengesStark, calculateChallengeStark } = require("../stark/stark_gen_helpers");
const { setPol, getPol, calculatePublics, callCalculateExps } = require("./prover_helpers");

module.exports = async function proofGen(cmPols, pilInfo, constTree, constPols, zkey, options) {
    const logger = options.logger;
    const parallelExec = options.parallelExec;
    const useThreads = options.useThreads;

    let stark;
    if(!zkey && constTree && constPols) {
        stark = true;
    } else if(zkey && !constTree && !constPols) {
        stark = false;
    } else {
        throw new Error("Invalid parameters");
    }

    let ctx = stark ? await initProverStark(pilInfo, constPols, constTree, options) : await initProverFflonk(pilInfo, zkey, logger);
    
    if(ctx.prover === "stark") {
        // Read committed polynomials
        cmPols.writeToBigBuffer(ctx.cm1_n);
    } else {
        // Read committed polynomials
        await cmPols.writeToBigBufferFr(ctx.cm1_n, ctx.F);
    }
   
    if (cmPols.$$nPols != ctx.pilInfo.nCm1) {
        throw new Error(`Number of Commited Polynomials: ${cmPols.length} do not match with the pilInfo definition: ${ctx.pilInfo.nCm1} `)
    };

    // STAGE 1. Compute Trace Column Polynomials
    await stage1(ctx, logger);

    let challenge = await getChallenge(1, ctx);
    
    // STAGE 2. Compute Inclusion Polynomials
    await stage2(ctx, challenge, parallelExec, useThreads, logger);

    if(ctx.prover === "stark" || ctx.pilInfo.nCm2 > 0 || ctx.pilInfo.peCtx.length > 0) {
        challenge = await getChallenge(2, ctx);
    }

    // STAGE 3. Compute Grand Product and Intermediate Polynomials
    await stage3(ctx, challenge, parallelExec, useThreads, logger);
    
    if(ctx.prover === "stark" || ctx.pilInfo.nCm3 > 0) {
        challenge = await getChallenge(3, ctx);
    }

    // STAGE Q. Trace Quotient Polynomials
    await stageQ(ctx, challenge, parallelExec, useThreads, logger);
    
    challenge = await getChallenge("Q", ctx);

    if(ctx.prover === "stark") {
        // STAGE 5. Compute Evaluations
        await computeEvalsStark(ctx, challenge, logger);

        challenge = await calculateChallengeStark("evals", ctx);

        // STAGE 6. Compute FRI
        await computeFRIStark(ctx, challenge, parallelExec, useThreads, logger);
    } else {
        await computeOpeningsFflonk(ctx, challenge, logger);
    }
    
    const {proof, publics} = ctx.prover === "stark" ? await genProofStark(ctx, logger) : await genProofFflonk(ctx, logger);

    return {proof, publics};
}

async function stage1(ctx, logger) {
    if (logger) logger.debug("> STAGE 1. Compute Trace Column Polynomials");

    calculatePublics(ctx);

    ctx.prover === "stark" ? await extendAndMerkelize(1, ctx) : await extendAndCommit(1, ctx, logger);
}

async function stage2(ctx, challenge, parallelExec, useThreads, logger) {
    if(ctx.prover === "fflonk" && !ctx.pilInfo.nCm2 && ctx.pilInfo.peCtx.length === 0) return;

    setChallenges(2, ctx, challenge, logger);
    
    if (ctx.prover === "fflonk" && !ctx.pilInfo.nCm2) return;

    if (logger) logger.debug("> STAGE 2. Compute Inclusion Polynomials");

    // STEP 2.2 - Compute stage 2 polynomials --> h1, h2
    await callCalculateExps("step2prev", "n", ctx, parallelExec, useThreads);

    for (let i = 0; i < ctx.pilInfo.puCtx.length; i++) {
        const puCtx = ctx.pilInfo.puCtx[i];

        const fPol = getPol(ctx, ctx.pilInfo.exp2pol[puCtx.fExpId]);
        const tPol = getPol(ctx, ctx.pilInfo.exp2pol[puCtx.tExpId]);

        const [h1, h2] = calculateH1H2(ctx.F, fPol, tPol);
        setPol(ctx, ctx.pilInfo.cm_n[ctx.pilInfo.nCm1 + 2 * i], h1);
        setPol(ctx, ctx.pilInfo.cm_n[ctx.pilInfo.nCm1 + 2 * i + 1], h2);
    }

    ctx.prover === "stark" ? await extendAndMerkelize(2, ctx) : await extendAndCommit(2, ctx, logger);
}

async function stage3(ctx, challenge, parallelExec, useThreads, logger) {
    if (ctx.prover === "fflonk" && !ctx.pilInfo.nCm3) return;

    if (logger) logger.debug("> STAGE 3. Compute Grand Product and Intermediate Polynomials");

    setChallenges(3, ctx, challenge, logger);

    // STEP 3.2 - Compute stage 3 polynomials --> Plookup Z, Permutations Z & ConnectionZ polynomials
    const nPlookups = ctx.pilInfo.puCtx.length;
    const nPermutations = ctx.pilInfo.peCtx.length;
    const nConnections = ctx.pilInfo.ciCtx.length;

    await callCalculateExps("step3prev", "n", ctx, parallelExec, useThreads);

    let nCm3 = ctx.pilInfo.nCm1 + ctx.pilInfo.nCm2;

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

    await callCalculateExps("stepQprev", "n", ctx, parallelExec, useThreads);

    ctx.prover === "stark" ? await extendAndMerkelize(3, ctx) : await extendAndCommit(3, ctx, logger);
} 

async function stageQ(ctx, challenge, parallelExec, useThreads, logger) {
    if (logger) logger.debug("> STAGE 4. Compute Trace Quotient Polynomials");

    // Compute challenge a
    setChallenges("Q", ctx, challenge, logger);
    
    // STEP 4.2 - Compute stage 4 polynomial --> Q polynomial
    await callCalculateExps("stepQ2ns", "2ns", ctx, parallelExec, useThreads);

    ctx.prover === "stark" ? await computeQStark(ctx, logger) : await computeQFflonk(ctx, logger);    
}

async function getChallenge(stage, ctx) {
    if(ctx.prover === "stark") {
        return calculateChallengeStark(stage, ctx);
    } else {
        return calculateChallengeFflonk(stage, ctx);
    }
}

async function setChallenges(stage, ctx, challenge, logger) {
    if(ctx.prover === "stark") {
        setChallengesStark(stage, ctx, challenge, logger);
    } else {
        setChallengesFflonk(stage, ctx, challenge, logger);
    }
}
