const { verifyOpenings, Keccak256Transcript, computeChallengeXiSeed, lcm } = require("shplonkjs");
const {getCurveFromName} = require("ffjavascript");

const Logger = require('logplease');

module.exports.fflonkVerify = async function fflonkVerify(zkey, publics, commits, evaluations, fflonkInfo, options) {
//    const logger = options.logger;
    const logger = Logger.create("logger");

    const curve = await getCurveFromName("bn128");

    const Fr = curve.Fr;

    const ctx = {};
    ctx.evals = [];
    ctx.publics = publics;
    ctx.challenges = [];
    ctx.curve = curve;
    ctx.N = 1 << zkey.power;
    ctx.nBits = zkey.power;

    const domainSize = ctx.N;
    const power = zkey.power;
    const n8r = Fr.n8;
    const sDomain = domainSize * n8r;

    if (logger) {
        logger.debug("------------------------------");
        logger.debug("  PIL-FFLONK VERIFY SETTINGS");
        logger.debug(`  Curve:         ${curve.name}`);
        logger.debug(`  Domain size:   ${domainSize} (2^${power})`);
        logger.debug(`  Const  pols:   ${fflonkInfo.nConstants}`);
        logger.debug(`  Step 1 pols:   ${fflonkInfo.mapSectionsN.cm1_n}`);
        logger.debug(`  Step 2 pols:   ${fflonkInfo.mapSectionsN.cm2_n}`);
        logger.debug(`  Step 3 pols:   ${fflonkInfo.mapSectionsN.cm3_n}`);
        logger.debug(`  Step 4 pols:   ${fflonkInfo.mapSectionsN.cm4_n}`);
        logger.debug(`  Temp exp pols: ${fflonkInfo.mapSectionsN.tmpExp_n}`);
        logger.debug("------------------------------");
    }

    const transcript = new Keccak256Transcript(curve);

    const cnstCommitPols = Object.keys(zkey).filter(k => k.match(/^f\d/));
    for(let i = 0; i < cnstCommitPols.length; ++i) {
        transcript.addPolCommitment(zkey[cnstCommitPols[i]]);
    }

    for (let i=0; i<publics.length; i++) {
        transcript.addScalar(publics[i]);
    }

    if(0 === transcript.data.length) {
        transcript.addScalar(curve.Fr.one);
    }
    
    // Compute challenge alpha
    ctx.challenges[0] = transcript.getChallenge();
    if (logger) logger.debug("··· challenges.alpha: " + Fr.toString(ctx.challenges[0]));
    
    // Compute challenge beta
    transcript.reset();
    transcript.addScalar(ctx.challenges[0]);
    ctx.challenges[1] = transcript.getChallenge();
    if (logger) logger.debug("··· challenges.beta: " + Fr.toString(ctx.challenges[1]));

    // Compute challenge gamma
    transcript.reset();
    transcript.addScalar(ctx.challenges[0]);
    transcript.addScalar(ctx.challenges[1]);
    ctx.challenges[2] = transcript.getChallenge();
    if (logger) logger.debug("··· challenges.gamma: " + Fr.toString(ctx.challenges[2]));

    // Compute challenge delta
    transcript.reset();
    transcript.addScalar(ctx.challenges[2]);
    ctx.challenges[3] = transcript.getChallenge();
    if (logger) logger.debug("··· challenges.delta: " + Fr.toString(ctx.challenges[3]));

    // Compute challenge a
    transcript.reset();
    transcript.addScalar(ctx.challenges[2]);
    transcript.addScalar(ctx.challenges[3]);
    ctx.challenges[4] = transcript.getChallenge();
    if (logger) logger.debug("··· challenges.a: " + Fr.toString(ctx.challenges[4]));

    // Store the polynomial commits to its corresponding fi
    for(let i = 0; i < zkey.f.length; ++i) {
        if(!commits[`f${zkey.f[i].index}`]) throw new Error(`f${zkey.f[i].index} commit is missing`);
        zkey.f[i].commit = commits[`f${zkey.f[i].index}`];
    }
    
    let countEv = 0;
    for(let i = 0; i < fflonkInfo.evIdx.cm.length; ++i) {
        for(const polId in fflonkInfo.evIdx.cm[i]) {
            let polName = i === 0 ? zkey.polsMap.cm[polId] : i === 1 ? zkey.polsMap.cm[polId] + "w" : zkey.polsMap.cm[polId] + `w${i}`;
            const evalIndex = fflonkInfo.evIdx.cm[i][polId];
            ctx.evals[evalIndex] = evaluations[polName];   
            ++countEv;
        }
    }

    for(let i = 0; i < fflonkInfo.evIdx.const.length; ++i) {
        for(const polId in fflonkInfo.evIdx.const[i]) {
            let polName = i === 0 ? zkey.polsMap.const[polId] : i === 1 ? zkey.polsMap.const[polId] + "w" : zkey.polsMap.const[polId] + `w${i}`;
            const evalIndex = fflonkInfo.evIdx.const[i][polId];
            ctx.evals[evalIndex] = evaluations[polName];
            ++countEv;              
        }
    }
    
    // TODO: VERIFY EVALUATIONS
    let xiSeed = computeChallengeXiSeed(zkey.f.sort((a,b) => a.index - b.index).map(fi => fi.commit), curve, logger);
    const powerW = lcm(Object.keys(zkey).filter(k => k.match(/^w\d+$/)).map(wi => wi.slice(1)));
    let challengeXi = curve.Fr.exp(xiSeed, powerW);
    ctx.x = challengeXi;

    const execCode = executeCode(curve.Fr, ctx, fflonkInfo.verifierCode.first);
    console.log(JSON.stringify(fflonkInfo.verifierCode.first, 0, 2));

    const xN = curve.Fr.exp(challengeXi, ctx.N);
    ctx.Z = curve.Fr.sub(xN, curve.Fr.one);   
   
    const qZ = curve.Fr.mul(evaluations["Q"], ctx.Z);

    if(!curve.Fr.eq(qZ, execCode)) {
        return false;
    }

    const res = verifyOpenings(zkey, commits, evaluations, curve, logger);
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