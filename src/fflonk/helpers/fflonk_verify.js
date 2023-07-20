const { verifyOpenings, Keccak256Transcript } = require("shplonkjs");
const {utils, getCurveFromName } = require("ffjavascript");
const { fromObjectVk, fromObjectProof } = require("./helpers");
const { unstringifyBigInts } = utils;


module.exports = async function fflonkVerify(vk, publicSignals, proof, fflonkInfo, options) {
    const logger = options.logger;

    const curve = await getCurveFromName(vk.curve);
    const Fr = curve.Fr;

    vk = fromObjectVk(curve, vk);

    proof = fromObjectProof(curve, proof);

    let publics = [];
    if (publicSignals !== "") {
        publics = unstringifyBigInts(publicSignals).map(p => Fr.e(p));
    }

    const ctx = {};
    ctx.evals = [];
    ctx.publics = publics;
    ctx.challenges = [0,0,0,0,0];
    ctx.curve = curve;
    ctx.N = 1 << vk.power;
    ctx.nBits = vk.power;

    const domainSize = ctx.N;
    const power = vk.power;

    const nPolsQ = vk.f.filter(fi => fi.stages[0].stage === 4).map(fi => fi.pols).flat(Infinity);

    if (logger) {
        logger.debug("------------------------------");
        logger.debug("  PIL-FFLONK VERIFY SETTINGS");
        logger.debug(`  Curve:         ${curve.name}`);
        logger.debug(`  Domain size:   ${domainSize} (2^${power})`);
        logger.debug(`  Const  pols:   ${fflonkInfo.nConstants}`);
        logger.debug(`  Step 1 pols:   ${fflonkInfo.mapSectionsN.cm1_n}`);
        logger.debug(`  Step 2 pols:   ${fflonkInfo.mapSectionsN.cm2_n}`);
        logger.debug(`  Step 3 pols:   ${fflonkInfo.mapSectionsN.cm3_n}`);
        logger.debug(`  Step 4 pols:   ${nPolsQ.length}`);
        logger.debug(`  Temp exp pols: ${fflonkInfo.mapSectionsN.tmpExp_n}`);
        logger.debug("------------------------------");
    }

    const transcript = new Keccak256Transcript(curve);

    const cnstCommitPols = Object.keys(vk).filter(k => k.match(/^f\d/));
    for(let i = 0; i < cnstCommitPols.length; ++i) {
        transcript.addPolCommitment(vk[cnstCommitPols[i]]);
    }

    for (let i=0; i<publics.length; i++) {
        transcript.addScalar(publics[i]);
    }

    const stage1CommitPols = vk.f.filter(fi => fi.stages[0].stage === 1).map(fi => proof.polynomials[`f${fi.index}`]);
    for(let i = 0; i < stage1CommitPols.length; i++) {
        transcript.addPolCommitment(stage1CommitPols[i]);
    }
    
    if(fflonkInfo.mapSectionsN.cm2_n > 0 || fflonkInfo.peCtx.length > 0) {
        // Compute challenge alpha
        ctx.challenges[0] = transcript.getChallenge();
        if (logger) logger.debug("··· challenges.alpha: " + Fr.toString(ctx.challenges[0]));
        
        // Compute challenge beta
        transcript.reset();
        transcript.addScalar(ctx.challenges[0]);
        ctx.challenges[1] = transcript.getChallenge();
        if (logger) logger.debug("··· challenges.beta: " + Fr.toString(ctx.challenges[1]));
        transcript.reset();

        transcript.addScalar(ctx.challenges[1]);
    }
    
    const stage2CommitPols = vk.f.filter(fi => fi.stages[0].stage === 2).map(fi => proof.polynomials[`f${fi.index}`]);
    for(let i = 0; i < stage2CommitPols.length; i++) {
        transcript.addPolCommitment(stage2CommitPols[i]);
    }

    if(fflonkInfo.mapSectionsN.cm3_n > 0) {
        // Compute challenge gamma
        ctx.challenges[2] = transcript.getChallenge();
        if (logger) logger.debug("··· challenges.gamma: " + Fr.toString(ctx.challenges[2]));

        // Compute challenge delta
        transcript.reset();
        transcript.addScalar(ctx.challenges[2]);
        ctx.challenges[3] = transcript.getChallenge();
        if (logger) logger.debug("··· challenges.delta: " + Fr.toString(ctx.challenges[3]));
        transcript.reset();

        transcript.addScalar(ctx.challenges[3]);
    }
    
    const stage3CommitPols = vk.f.filter(fi => fi.stages[0].stage === 3).map(fi => proof.polynomials[`f${fi.index}`]);
    for(let i = 0; i < stage3CommitPols.length; i++) {
        transcript.addPolCommitment(stage3CommitPols[i]);
    }

    // Compute challenge a
    ctx.challenges[4] = transcript.getChallenge();
    if (logger) logger.debug("··· challenges.a: " + Fr.toString(ctx.challenges[4]));

    // Compute challenge xi seed
    transcript.reset();
    transcript.addScalar(ctx.challenges[4]);

    const stage4CommitPols = vk.f.filter(fi => fi.stages[0].stage === 4).map(fi => proof.polynomials[`f${fi.index}`]);
    for(let i = 0; i < stage4CommitPols.length; i++) {
        transcript.addPolCommitment(stage4CommitPols[i]);
    }

    let challengeXiSeed = transcript.getChallenge();
    if (logger) logger.debug("··· challenges.xiSeed: " + Fr.toString(challengeXiSeed));

    // Store the polynomial commits to its corresponding fi
    for(let i = 0; i < vk.f.length; ++i) {
        if(!proof.polynomials[`f${vk.f[i].index}`]) {
            if(logger) logger.warn(`f${vk.f[i].index} commit is missing`);
            return false;
        }
        vk.f[i].commit = proof.polynomials[`f${vk.f[i].index}`];
    }
    
    for(let i = 0; i < fflonkInfo.evIdx.cm.length; ++i) {
        for(const polId in fflonkInfo.evIdx.cm[i]) {
            let polName = i === 0 ? vk.polsMap.cm[polId] : i === 1 ? vk.polsMap.cm[polId] + "w" : vk.polsMap.cm[polId] + `w${i}`;
            const evalIndex = fflonkInfo.evIdx.cm[i][polId];
            ctx.evals[evalIndex] = proof.evaluations[polName];   
        }
    }

    for(let i = 0; i < fflonkInfo.evIdx.const.length; ++i) {
        for(const polId in fflonkInfo.evIdx.const[i]) {
            let polName = i === 0 ? vk.polsMap.const[polId] : i === 1 ? vk.polsMap.const[polId] + "w" : vk.polsMap.const[polId] + `w${i}`;
            const evalIndex = fflonkInfo.evIdx.const[i][polId];
            ctx.evals[evalIndex] = proof.evaluations[polName];                          

        }
    }
    
    let challengeXi = curve.Fr.exp(challengeXiSeed, vk.powerW);
    ctx.x = challengeXi;

    const execCode = executeCode(curve.Fr, ctx, fflonkInfo.verifierCode.first);

    const xN = curve.Fr.exp(challengeXi, ctx.N);
    ctx.Z = curve.Fr.sub(xN, curve.Fr.one);   

    if(!curve.Fr.eq(curve.Fr.mul(ctx.Z, proof.evaluations["invZh"]), curve.Fr.one)) {
        if(logger) logger.warn("Invalid invZh evaluation");
        return false;
    }
   
    const Q = curve.Fr.div(execCode, ctx.Z);

    const nonCommittedPols = [];
    if(vk.maxQDegree === 0) {
        proof.evaluations["Q"] = Q;
        nonCommittedPols.push("Q");
    } else {
        let xAcc = curve.Fr.one;
        let q = curve.Fr.zero;
        for (let i=0; i<nPolsQ.length; i++) {
            q = curve.Fr.add(q, curve.Fr.mul(xAcc, proof.evaluations[`Q${i}`]));
            for(let j = 0; j < vk.maxQDegree; ++j) {
                xAcc = curve.Fr.mul(xAcc, xN);
            }
        }
        if (!curve.Fr.eq(Q, q)) {
            console.log(`Invalid Q.`)
            return false;
        }

    }


    const res = verifyOpenings(vk, proof.polynomials, proof.evaluations, curve, {logger, xiSeed: challengeXiSeed, nonCommittedPols});
    await curve.terminate();

    return res;
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
            case "eval": return ctx.evals[r.id];
            case "number": return ctx.curve.Fr.e(`${r.value}`);
            case "public": return ctx.curve.Fr.e(ctx.publics[r.id]);
            case "challenge": return ctx.challenges[r.id];
            case "x": return ctx.x;
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
