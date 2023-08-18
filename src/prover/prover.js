const { initProverFflonk, extendAndCommit, computeQFflonk, computeOpeningsFflonk, genProofFflonk, setChallengesFflonk, calculateChallengeFflonk } = require("../fflonk/helpers/fflonk_prover_helpers");
const { initProverStark, extendAndMerkelize, computeQStark, computeEvalsStark, computeFRIStark, genProofStark, setChallengesStark, calculateChallengeStark } = require("../stark/stark_gen_helpers");
const { setPol, getPol, calculatePublics, callCalculateExps, hintFunctions } = require("./prover_helpers");

module.exports = async function proofGen(cmPols, pilInfo, constTree, constPols, zkey, options) {
    const logger = options.logger;

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
        cmPols.writeToBigBuffer(ctx.cm1_n, ctx.pilInfo.mapSectionsN.cm1);
    } else {
        // Read committed polynomials
        await cmPols.writeToBigBufferFr(ctx.cm1_n, ctx.F, ctx.pilInfo.mapSectionsN.cm1);
    }
   
    // STAGE 1. Compute Trace Column Polynomials
    await stage1(ctx, options);

    let challenge = await getChallenge(1, ctx);
    
    for(let i = 0; i < ctx.pilInfo.nLibStages; i++) {
        await libStage(i, ctx, challenge, options);
        challenge = await getChallenge(i + 2, ctx);
    }

    // STAGE Q. Trace Quotient Polynomials
    await stageQ(ctx, challenge, options);
    
    challenge = await getChallenge("Q", ctx);

    if(ctx.prover === "stark") {
        // STAGE 5. Compute Evaluations
        await computeEvalsStark(ctx, challenge, logger);

        challenge = await calculateChallengeStark("evals", ctx);

        // STAGE 6. Compute FRI
        await computeFRIStark(ctx, challenge, options);
    } else {
        await computeOpeningsFflonk(ctx, challenge, logger);
    }
    
    const {proof, publics} = ctx.prover === "stark" ? await genProofStark(ctx, logger) : await genProofFflonk(ctx, logger);

    return {proof, publics};
}

async function stage1(ctx, options) {
    const logger = options.logger;
    if (logger) logger.debug("> STAGE 1. Compute Trace Column Polynomials");

    calculatePublics(ctx);

    if(ctx.pilInfo.nLibStages === 0) {
        if(logger) logger.debug("> Calculating intermediate polynomials");

        await callCalculateExps("imPols", "n", ctx, options.parallelExec, options.useThreads);
    }

    ctx.prover === "stark" ? await extendAndMerkelize(1, ctx) : await extendAndCommit(1, ctx, logger);
}

async function libStage(stage, ctx, challenge, options) {
    const logger = options.logger;

    const genStage = stage + 2;

    setChallenges(genStage, ctx, challenge, logger);

    if (logger) logger.debug(`> STAGE ${genStage}`);

    await callCalculateExps(`stage${genStage}`, "n", ctx, options.parallelExec, options.useThreads);

    for(let i = 0; i < Object.keys(ctx.pilInfo.libs).length; i++) {
        const libName = Object.keys(ctx.pilInfo.libs)[i];
        const lib = ctx.pilInfo.libs[libName];
        if(stage >= lib.length) continue;

        const libStage = lib[stage];
        for(let j = 0; j < libStage.hints.length; j++) {
            const hint = libStage.hints[j];
            const inputs = [];
            for(let k = 0; k < hint.inputs.length; ++k) {
                const pol = getPol(ctx, libStage.pols[hint.inputs[k]].id, "n")
                inputs.push(pol);
            }
            const outputs = await hintFunctions(hint.lib,ctx.F, inputs);
            for(let k = 0; k < hint.outputs.length; ++k) {
                setPol(ctx, libStage.pols[hint.outputs[k]].id, outputs[k], "n");
            }
        }        
    }

    if(ctx.pilInfo.nLibStages === stage + 1) {
        if(logger) logger.debug("> Calculating intermediate polynomials");
        await callCalculateExps("imPols", "n", ctx, options.parallelExec, options.useThreads);
    }

    ctx.prover === "stark" ? await extendAndMerkelize(genStage, ctx, logger) : await extendAndCommit(genStage, ctx, logger);
}

async function stageQ(ctx, challenge, options) {
    const logger = options.logger;
    
    if (logger) logger.debug("> STAGE 4. Compute Trace Quotient Polynomials");

    // Compute challenge a
    setChallenges("Q", ctx, challenge, logger);
    
    // STEP 4.2 - Compute stage 4 polynomial --> Q polynomial
    await callCalculateExps("Q", "ext", ctx, options.parallelExec, options.useThreads);

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