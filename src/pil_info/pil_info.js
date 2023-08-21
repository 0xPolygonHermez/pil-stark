
const generatePublicCalculators = require("./helpers/publics.js");

const generateConstraintPolynomial = require("./helpers/quotientPolynomial/cp_prover");
const generateConstraintPolynomialVerifier = require("./helpers/quotientPolynomial/cp_ver");

const generateFRIPolynomial = require("./helpers/fri/fri_prover");
const generateVerifierQuery = require("./helpers/fri/fri_verifier");

const map = require("./map.js");

const { log2 } = require("pilcom/src/utils.js");
const generateLibsCode = require("./helpers/generateLibsCode.js");
const { fixCode, setDimensions } = require("./helpers/helpers.js");

module.exports = function pilInfo(F, _pil, stark = true, starkStruct) {
    const pil = JSON.parse(JSON.stringify(_pil));    // Make a copy as we are going to destroy pil

    const res = {
        cmPolsMap: [],
        libs: {},
        code: {},
        nConstants: pil.nConstants,
        nCommitments: pil.nCommitments,
        nPublics: pil.publics.length,
        publics: pil.publics,
        nLibStages: 0,
        nChallenges: 0,
        challenges: {},
    };

    const pilDeg = Object.values(pil.references)[0].polDeg;
    res.pilPower = log2(pilDeg - 1) + 1;

    if(stark) {
        const starkDeg = 2 ** starkStruct.nBits;

        if (starkDeg != pilDeg) {
            throw new Error(`Starkpil and pil have degree mismatch (starkpil:${starkDeg} pil:${pilDeg})`);
        }

        if (starkStruct.nBitsExt != starkStruct.steps[0].nBits) {
            throw new Error(`Starkpil.nBitsExt and first step of Starkpil have a mismatch (nBitsExt:${starkStruct.nBitsExt} pil:${starkStruct.steps[0].nBits})`);
        }

        res.starkStruct = starkStruct;
    }
   
    const ctx = {
        pil: pil,
        calculated: {
            0: {},
            1: {}
        },
        tmpUsed: 0,
        code: []
    };

    const ctx_ext = {
        pil: pil,
        calculated: {
            0: {},
            1: {}
        },
        tmpUsed: 0,
        code: []
    };

    generatePublicCalculators(res, pil, ctx);

    generateLibsCode(F, res, pil, ctx);
    
    generateConstraintPolynomial(res, pil, ctx, ctx_ext, stark);

    map(res, pil, stark);

    generateConstraintPolynomialVerifier(res, ctx, stark);

    if(stark) {
        generateFRIPolynomial(res, pil, ctx_ext);
        generateVerifierQuery(res, ctx_ext);
    } 

    fixCode(res, stark);

    setDimensions(res, stark);

    delete res.imPolsMap;
    delete res.cExp;
    delete res.friExpId;
    
    return res;

}
