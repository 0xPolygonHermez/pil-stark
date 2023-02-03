const {readBinFile} = require("@iden3/binfileutils");
const {readPTauHeader} = require("./powersoftau_utils");
const {BigBuffer} = require("ffjavascript");
const {compile, newConstantPolsArray} = require("pilcom");
const {log2} = require("pilcom/src/utils");
const  Polynomial  = require("./polynomial");
const {stringifyBigInts} = require("ffjavascript").utils;


module.exports.fflonkSetup = async function (pilFile, pilConfig, cnstPolsFile, ptauFile, options) {
    const logger = options.logger;

    const F = options.F;

    if(logger) logger.info("Starting fflonk setup");

    const {fd: fdPTau, sections: sectionsPTau} = await readBinFile(ptauFile, "ptau", 1, 1 << 22, 1 << 24);
    if (!sectionsPTau[2] || !sectionsPTau[3]) {
        if (logger) logger.error("Powers of tau is not prepared.");
        return -1;
    }

    const {curve, power: ptauPower} = await readPTauHeader(fdPTau, sectionsPTau);
    const Fr = curve.Fr;
    const G1 = curve.G1;

    // PIL compile
    const pil = await compile(F, pilFile, null, pilConfig);


    //Find the max PIL polynomial degree
    let maxPilPolDeg = 0;
    for (const polRef in pil.references) {
        maxPilPolDeg = Math.max(maxPilPolDeg, pil.references[polRef].polDeg);
    }

    const pilPower = log2(maxPilPolDeg - 1) + 1;
    const domainSize = 2 ** pilPower;

    if (pilPower > ptauPower) {
        if (logger) logger.error(`PIL polynomials degree is too big for this powers of Tau, 2**${pilPower} > 2**${ptauPower}`);
        return -1;
    }

    const sizeG1 = G1.F.n8 * 2;

    const pTauBuffer = new BigBuffer(domainSize * sizeG1);
    await fdPTau.readToBuffer(pTauBuffer, 0, domainSize * sizeG1, sectionsPTau[2][0].p);

    let preprocessed = {
        protocol: "fflonk",
        curve: "bn128",
        power: pilPower,
        polynomials: {},
    };

    // Load preprocessed polynomials
    const cnstPols = newConstantPolsArray(pil, F);
    await cnstPols.loadFromFile(cnstPolsFile);

    for (let i = 0; i < cnstPols.$$nPols; i++) {
        const cnstPol = cnstPols.$$defArray[i];
        const cnstPolBuffer = cnstPols.$$array[i];

        if (logger) {
            logger.info(`Preparing ${cnstPol.name} polynomial`);
        }

        let polEvalBuff = new BigBuffer(cnstPolBuffer.length * Fr.n8);
        for (let i = 0; i < cnstPolBuffer.length; i++) {
            polEvalBuff.set(Fr.e(cnstPolBuffer[i]), i * Fr.n8);
        }

        let pol = await Polynomial.fromEvaluations(polEvalBuff, curve, logger);

        // Calculates the commitment
        const polCommitment = await pol.multiExponentiation(pTauBuffer);

        // Add the commitment to the preprocessed polynomials
        preprocessed.polynomials[cnstPol.name] = polCommitment;
    }

    // Finish curve & close file descriptors
    await curve.terminate();
    fdPTau.close();

    logger.info("Fflonk setup finished");

    console.log("PREPROCESSED", preprocessed);
    console.log("STRINGIFIED",  stringifyBigInts(preprocessed));
    return preprocessed;
}