const { readBinFile } = require("@iden3/binfileutils");
const {BigBuffer} = require("ffjavascript");
const { Polynomial, commit} = require("shplonkjs");
const { interpolate } = require("../../helpers/fft/fft_p.bn128");
const { writePilFflonkZkeyFile } = require("../zkey/zkey_pilfflonk");
const fflonkShKey = require("./fflonk_shkey.js");

module.exports = async function fflonkSetup(constPols, zkeyFilename, ptauFile, fflonkInfo, options) {
    const logger = options.logger;

    let { zkey, PTau, curve } = await fflonkShKey(ptauFile, fflonkInfo, options);

    const {fd: fdPTau, sections: pTauSections} = await readBinFile(ptauFile, "ptau", 1, 1 << 22, 1 << 24);
    const sG2 = curve.G2.F.n8 * 2;
    zkey.X_2 = await fdPTau.read(sG2, pTauSections[3][0].p + sG2);  

    const roots = Object.keys(zkey).filter(k => k.match(/^w\d/));    
    for(let i = 0; i < roots.length; ++i) {
        zkey[roots[i]] = curve.Fr.fromObject(zkey[roots[i]]);
    }

    const extendBits = Math.ceil(Math.log2(fflonkInfo.qDeg + 1));

    const nBits = fflonkInfo.pilPower;
    const nBitsCoefs = fflonkInfo.nBitsZK + fflonkInfo.pilPower;
    const nBitsExt = fflonkInfo.pilPower + extendBits + fflonkInfo.nBitsZK;

    const domainSize = 1 << nBits;
    const domainSizeCoefs = 1 << nBitsCoefs;
    const domainSizeExt = 1 << nBitsExt;

    const sDomain = domainSize * curve.Fr.n8;
    const sDomainExt = domainSizeExt * curve.Fr.n8;

    zkey.constPolsCoefs = new BigBuffer(fflonkInfo.nConstants * sDomain); // Constant polynomials
    zkey.constPolsEvals = new BigBuffer(fflonkInfo.nConstants * sDomain); // Constant polynomials
    zkey.constPolsEvalsExt = new BigBuffer(fflonkInfo.nConstants * sDomainExt); // Constant polynomials

    await constPols.writeToBigBufferFr(zkey.constPolsEvals, curve.Fr, fflonkInfo.nConstants);

    if(fflonkInfo.nConstants > 0) {
        await interpolate(zkey.constPolsEvals, fflonkInfo.nConstants, nBits, zkey.constPolsCoefs, zkey.constPolsEvalsExt, nBitsExt, curve.Fr);
    
        const ctx = {};

        // Store coefs to context
        for (let i = 0; i < fflonkInfo.nConstants; i++) {
            const coefs = getPolFromBuffer(zkey.constPolsCoefs, fflonkInfo.nConstants, domainSizeCoefs, i, curve.Fr);
            ctx[zkey.polsNamesStage[0][i]] = new Polynomial(coefs, curve, logger);
        }

        const commits = await commit(0, zkey, ctx, PTau, curve, {multiExp: true, logger});

        for(let j = 0; j < commits.length; ++j) {
            const index = commits[j].index.split("_")[0];
            const commit = commits[j].commit;
            const pol = commits[j].pol.coef.slice(0, (commits[j].pol.degree() + 1)*curve.Fr.n8);
            zkey[index] = {commit, pol};
        }
    }

    // Precalculate x_n and x_ext
    zkey.x_n = new BigBuffer(domainSize * curve.Fr.n8); // Omegas de field extension
    zkey.x_ext = new BigBuffer(domainSizeExt * curve.Fr.n8); // Omegas a l'extès
        
    let w = curve.Fr.one;
    for (let i = 0; i < domainSize; i++) {
        const i_n8r = i * curve.Fr.n8;

        zkey.x_n.set(w, i_n8r);
        w = curve.Fr.mul(w, curve.Fr.w[zkey.power])
    }

    w = curve.Fr.one;
    for (let i = 0; i < domainSizeExt; i++) {
        const i_n8r = i * curve.Fr.n8;

        zkey.x_ext.set(w, i_n8r);
        w = curve.Fr.mul(w, curve.Fr.w[nBitsExt]);
    }

    if(logger) logger.info("Fflonk setup finished");

    await writePilFflonkZkeyFile(zkey, zkeyFilename, PTau, curve, {logger}); 

    return;
}

function getPolFromBuffer(buff, nPols, N, id, Fr) {
    let polBuffer = new BigBuffer(N * Fr.n8);
    for (let j = 0; j < N; j++) {
        polBuffer.set(buff.slice((id + j * nPols) * Fr.n8, (id + j * nPols + 1) * Fr.n8), j * Fr.n8);
    }
    return polBuffer;
}
