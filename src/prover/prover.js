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
   
    if (cmPols.$$nPols != ctx.pilInfo.nCm[1]) {
        throw new Error(`Number of Commited Polynomials: ${cmPols.length} do not match with the pilInfo definition: ${ctx.pilInfo.nCm[1]} `)
    };

    // STAGE 1. Compute Trace Column Polynomials
    await stage1(ctx, logger);

    let challenge = await getChallenge(1, ctx);
    
    // STAGE 2. Compute Inclusion Polynomials
    await stage2(ctx, challenge, parallelExec, useThreads, logger);

    if(ctx.prover === "stark" || ctx.pilInfo.nCm[2] > 0 || ctx.pilInfo.peCtx.length > 0) {
        challenge = await getChallenge(2, ctx);
    }

    // STAGE 3. Compute Grand Product and Intermediate Polynomials
    await stage3(ctx, challenge, parallelExec, useThreads, logger);
    
    if(ctx.prover === "stark" || ctx.pilInfo.nCm[3] > 0) {
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
    if(ctx.prover === "fflonk" && !ctx.pilInfo.nCm[2] && ctx.pilInfo.peCtx.length === 0) return;

    setChallenges(2, ctx, challenge, logger);
    
    if (ctx.prover === "fflonk" && !ctx.pilInfo.nCm[2]) return;

    if (logger) logger.debug("> STAGE 2. Compute Inclusion Polynomials");

    // STEP 2.2 - Compute stage 2 polynomials --> h1, h2
    await callCalculateExps("2", "n", ctx, parallelExec, useThreads);

    for (let i = 0; i < ctx.pilInfo.puCtx.length; i++) {
        const pu = ctx.pilInfo.puCtx[i];

        const fPol = getPol(ctx, ctx.pilInfo.exp2pol[pu.fExpId]);
        const tPol = getPol(ctx, ctx.pilInfo.exp2pol[pu.tExpId]);

        const [h1, h2] = calculateH1H2(ctx.F, fPol, tPol);
        setPol(ctx, ctx.pilInfo.cm_n[pu.h1Id], h1);
        setPol(ctx, ctx.pilInfo.cm_n[pu.h2Id], h2);
    }

    ctx.prover === "stark" ? await extendAndMerkelize(2, ctx) : await extendAndCommit(2, ctx, logger);
}

async function stage3(ctx, challenge, parallelExec, useThreads, logger) {
    if (ctx.prover === "fflonk" && !ctx.pilInfo.nCm[3]) return;

    if (logger) logger.debug("> STAGE 3. Compute Grand Product and Intermediate Polynomials");

    setChallenges(3, ctx, challenge, logger);

    // STEP 3.2 - Compute stage 3 polynomials --> Plookup Z, Permutations Z & ConnectionZ polynomials
    const polsCtx = [];
    if(ctx.pilInfo.puCtx.length > 0) polsCtx.push({name: "Plookup", ctx: ctx.pilInfo.puCtx});
    if(ctx.pilInfo.peCtx.length > 0) polsCtx.push({name: "Permutation", ctx: ctx.pilInfo.peCtx});
    if(ctx.pilInfo.ciCtx.length > 0) polsCtx.push({name: "Connection", ctx: ctx.pilInfo.ciCtx});

    await callCalculateExps("3", "n", ctx, parallelExec, useThreads);
    
    for (let i = 0; i < polsCtx.length; ++i) {
        for(let j = 0; j < polsCtx[i].ctx.length; ++j) {
            if (logger) logger.debug(`··· Calculating z for ${polsCtx[i].name} ${j}`);
            
            const polCtx = polsCtx[i].ctx[j];
            const pNum = getPol(ctx, ctx.pilInfo.exp2pol[polCtx.numId]);
            const pDen = getPol(ctx, ctx.pilInfo.exp2pol[polCtx.denId]);
            const z = await calculateZ(ctx.F, pNum, pDen);

            setPol(ctx, ctx.pilInfo.cm_n[polCtx.zId], z);
        }
    }

    await callCalculateExps("imPols", "n", ctx, parallelExec, useThreads);

    ctx.prover === "stark" ? await extendAndMerkelize(3, ctx) : await extendAndCommit(3, ctx, logger);
} 

async function stageQ(ctx, challenge, parallelExec, useThreads, logger) {
    if (logger) logger.debug("> STAGE 4. Compute Trace Quotient Polynomials");

    // Compute challenge a
    setChallenges("Q", ctx, challenge, logger);
    
    // STEP 4.2 - Compute stage 4 polynomial --> Q polynomial
    await callCalculateExps("Q", "2ns", ctx, parallelExec, useThreads);

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
