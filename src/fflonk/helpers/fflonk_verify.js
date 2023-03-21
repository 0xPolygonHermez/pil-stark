const { verifyOpenings, Keccak256Transcript } = require("shplonkjs");
const {getCurveFromName} = require("ffjavascript");

module.exports.fflonkVerify = async function fflonkVerify(zkey, publics, commits, evaluations, fflonkInfo, options) {

    const logger = options.logger;

    const curve = await getCurveFromName("bn128");
    const ctx = {};
    ctx.evals = [];
    ctx.publics = publics;
    ctx.challenges = [];
    ctx.curve = curve;
    ctx.N = 1 << zkey.power;
    ctx.nBits = zkey.power;

    const transcript = new Keccak256Transcript(curve);

    const cnstCommitPols = Object.keys(zkey).filter(k => k.match(/^f\d/));
    for(let i = 0; i < cnstCommitPols.length; ++i) {
        transcript.addPolCommitment(zkey[cnstCommitPols[i]]);
    }

    for (let i=0; i<publics.length; i++) {
        transcript.addScalar(publics[i]);
    }

    ctx.challenges[0] = transcript.getChallenge(); // u
    transcript.reset();

    transcript.addScalar(ctx.challenges[0]);
    ctx.challenges[1] = transcript.getChallenge(); // defVal
    transcript.reset();

    transcript.addScalar(ctx.challenges[1]);
    ctx.challenges[2] = transcript.getChallenge(); // beta
    transcript.reset();

    transcript.addScalar(ctx.challenges[2]);
    ctx.challenges[3] = transcript.getChallenge(); // gamma
    transcript.reset();

    transcript.addScalar(ctx.challenges[3]);
    ctx.challenges[4] = transcript.getChallenge(); // vc
    transcript.reset();

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


    const res = verifyOpenings(zkey, commits, evaluations, curve, logger);
    await curve.terminate();

    return res;
}