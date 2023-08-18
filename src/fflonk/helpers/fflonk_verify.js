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
    ctx.challenges = [];
    ctx.curve = curve;
    ctx.N = 1 << vk.power;
    ctx.nBits = vk.power;

    const domainSize = ctx.N;
    const power = vk.power;

    const nStages = fflonkInfo.nLibStages + 2;

    const nPolsQ = vk.f.filter(fi => fi.stages[0].stage === nStages).map(fi => fi.pols).flat(Infinity);

    if (logger) {
        logger.debug("------------------------------");
        logger.debug("  PIL-FFLONK VERIFY SETTINGS");
        logger.debug(`  Curve:         ${curve.name}`);
        logger.debug(`  Domain size:   ${domainSize} (2^${power})`);
        logger.debug(`  Const  pols:   ${fflonkInfo.nConstants}`);
        logger.debug(`  Stage 1 pols:   ${fflonkInfo.mapSectionsN.cm1}`);
        for(let i = 0; i < fflonkInfo.nLibStages; i++) {
            const stage = i + 2;
            logger.debug(`  Stage ${stage} pols:   ${fflonkInfo.mapSectionsN[`cm${stage}`]}`);
        }
        logger.debug(`  Stage Q pols:   ${nPolsQ.length}`);
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
    
    for(let i=0; i < fflonkInfo.nLibStages; i++) {
        const stage = i + 2;

        for(let j = 0; j < fflonkInfo.challenges[stage].length; ++j) {
            const index = fflonkInfo.challenges[stage][j];
            ctx.challenges[index] = transcript.getChallenge();
            if (logger) logger.debug("··· challenges[" + index + "]: " + Fr.toString(ctx.challenges[index]));
            transcript.reset();
            transcript.addScalar(ctx.challenges[index]);
        }

        const stageCommitPols = vk.f.filter(fi => fi.stages[0].stage === stage).map(fi => proof.polynomials[`f${fi.index}`]);
        for(let i = 0; i < stageCommitPols.length; i++) {
            transcript.addPolCommitment(stageCommitPols[i]);
        }

    }
    
    ctx.challenges[fflonkInfo.challenges["Q"][0]] = transcript.getChallenge();
    if (logger) logger.debug("··· challenges[" + fflonkInfo.challenges["Q"][0] + "]: " + Fr.toString(ctx.challenges[fflonkInfo.challenges["Q"][0]]));
    transcript.reset();
    transcript.addScalar(ctx.challenges[fflonkInfo.challenges["Q"][0]]);

    const stageQCommitPols = vk.f.filter(fi => fi.stages[0].stage === nStages).map(fi => proof.polynomials[`f${fi.index}`]);
    for(let i = 0; i < stageQCommitPols.length; i++) {
        transcript.addPolCommitment(stageQCommitPols[i]);
    }

    let challengeXiSeed = transcript.getChallenge();
    if (logger) logger.debug("··· challengesXiSeed: " + Fr.toString(challengeXiSeed));

    // Store the polynomial commits to its corresponding fi
    for(let i = 0; i < vk.f.length; ++i) {
        if(!proof.polynomials[`f${vk.f[i].index}`]) {
            if(logger) logger.warn(`f${vk.f[i].index} commit is missing`);
            return false;
        }
        vk.f[i].commit = proof.polynomials[`f${vk.f[i].index}`];
    }

    for(let i = 0; i < fflonkInfo.evMap.length; ++i) {
        const ev = fflonkInfo.evMap[i];
        let polName = ev.prime === 0 ? ev.name : ev.prime === 1 ? ev.name + "w" : ev.name + `w${ev.prime}`;
        ctx.evals[i] = proof.evaluations[polName]; 
    }
    
    let challengeXi = curve.Fr.exp(challengeXiSeed, vk.powerW);
    ctx.x = challengeXi;

    const execCode = executeCode(curve.Fr, ctx, fflonkInfo.code.qVerifier.first);

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
            console.log(`Invalid Q.`);
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
            case "eval": 
                return ctx.evals[r.id];
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
