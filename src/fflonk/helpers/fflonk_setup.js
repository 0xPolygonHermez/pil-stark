const {BigBuffer} = require("ffjavascript");
const { Polynomial, commit} = require("shplonkjs");
const { interpolate } = require("../../helpers/fft/fft_p.bn128");
const { writeConstPolsFile } = require("../const_pols_serializer");
const { writePilFflonkZkeyFile } = require("../zkey/zkey_pilfflonk");
const fflonkShKey = require("./fflonk_shkey.js");
const { readBinFile } = require("@iden3/binfileutils");

module.exports = async function fflonkSetup(_pil, cnstPols, zkeyFilename, constExtFile, ptauFile, fflonkInfo, options) {
    const logger = options.logger;

    let { zkey, PTau, curve } = await fflonkShKey(_pil, ptauFile, fflonkInfo, options);

    const {fd: fdPTau, sections: pTauSections} = await readBinFile(ptauFile, "ptau", 1, 1 << 22, 1 << 24);
    const sG2 = curve.G2.F.n8 * 2;
    zkey.X_2 = await fdPTau.read(sG2, pTauSections[3][0].p + sG2);
    
    const roots = Object.keys(zkey).filter(k => k.match(/^w\d/));    
    for(let i = 0; i < roots.length; ++i) {
        zkey[roots[i]] = curve.Fr.fromObject(zkey[roots[i]]);
    }

    const nBits = zkey.power;
    const extendBits = Math.ceil(Math.log2(fflonkInfo.qDeg + 1));
    const nBitsExt = zkey.power + extendBits;

    const domainSize = 1 << nBits;
    const domainSizeExt = 1 << nBitsExt;

    const extendBitsZK = zkey.powerZK - zkey.power;
    const factorZK = (1 << extendBitsZK);
    const extendBitsTotal = extendBits + extendBitsZK;
    const nBitsExtZK = nBits + extendBitsTotal;

    const sDomain = domainSize * curve.Fr.n8;
    const sDomainExt = domainSizeExt * curve.Fr.n8;

    let constPolsCoefs = new BigBuffer(fflonkInfo.nConstants * sDomain); // Constant polynomials
    let constPolsEvals = new BigBuffer(fflonkInfo.nConstants * sDomain); // Constant polynomials
    let constPolsEvalsExt = new BigBuffer(fflonkInfo.nConstants * sDomainExt * factorZK); // Constant polynomials

    cnstPols.writeToBigBufferFr(constPolsEvals, curve.Fr);

    if(fflonkInfo.nConstants > 0) {
        await interpolate(constPolsEvals, fflonkInfo.nConstants, nBits, constPolsCoefs, constPolsEvalsExt, nBitsExtZK, curve.Fr);
    
        const ctx = {};

        // Store coefs to context
        for (let i = 0; i < fflonkInfo.nConstants; i++) {
            const coefs = getPolFromBuffer(constPolsCoefs, fflonkInfo.nConstants, (1<<zkey.power)*factorZK, i, curve.Fr);
            ctx[zkey.polsNamesStage[0][i].name] = new Polynomial(coefs, curve, logger);
        }

        const commits = await commit(0, zkey, ctx, PTau, curve, {multiExp: true, logger});

        for(let j = 0; j < commits.length; ++j) {
            zkey[`${commits[j].index}`] = commits[j].commit;
        }
    }

    // Precalculate x_n and x_2ns
    const x_n = new BigBuffer(domainSize * curve.Fr.n8); // Omegas de field extension
    const x_2ns = new BigBuffer(domainSizeExt * factorZK * curve.Fr.n8); // Omegas a l'extès
        
    let w = curve.Fr.one;
    for (let i = 0; i < domainSize; i++) {
        const i_n8r = i * curve.Fr.n8;

        x_n.set(w, i_n8r);
        w = curve.Fr.mul(w, curve.Fr.w[zkey.power])
    }

    w = curve.Fr.one;
    for (let i = 0; i < domainSizeExt * factorZK; i++) {
        const i_n8r = i * curve.Fr.n8;

        x_2ns.set(w, i_n8r);
        w = curve.Fr.mul(w, curve.Fr.w[nBitsExtZK]);
    }

    if(logger) logger.info("Fflonk setup finished");

    await writePilFflonkZkeyFile(zkey, zkeyFilename, PTau, curve, {logger}); 

    await writeConstPolsFile(constExtFile, constPolsCoefs, constPolsEvalsExt, x_n, x_2ns, curve.Fr, {});

    return {constPolsCoefs, constPolsEvalsExt, x_n, x_2ns};
}

function getPolFromBuffer(buff, nPols, N, id, Fr) {
    let polBuffer = new BigBuffer(N * Fr.n8);
    for (let j = 0; j < N; j++) {
        polBuffer.set(buff.slice((id + j * nPols) * Fr.n8, (id + j * nPols + 1) * Fr.n8), j * Fr.n8);
    }
    return polBuffer;
}