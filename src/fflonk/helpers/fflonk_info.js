
const generatePublicCalculators = require("../../pil_info/publics.js");
const generateStep2 = require("../../pil_info/step2");
const generateStep3 = require("../../pil_info/step3");
const generateConstraintPolynomial = require("../../pil_info/cp_prover");
const generateConstraintPolynomialVerifier = require("../../pil_info/cp_ver");
const map = require("../../pil_info/map.js");
const { log2 } = require("pilcom/src/utils.js");

module.exports.fflonkInfoGen = function fflonkInfoGen(F, _pil) {
    const pil = JSON.parse(JSON.stringify(_pil));    // Make a copy as we are going to destroy pil

    let maxPilPolDeg = 0;
    for (const polRef in pil.references) {
        maxPilPolDeg = Math.max(maxPilPolDeg, pil.references[polRef].polDeg);
    }

    const pilPower = log2(maxPilPolDeg - 1) + 1;

    const res = {
        varPolMap: [],
        puCtx: [],
        peCtx: [],
        ciCtx: []
    };

    res.nConstants = pil.nConstants;
    res.nPublics = pil.publics.length;

    generatePublicCalculators(res, pil);
    res.nCm1 = pil.nCommitments;

    const ctx = {
        pil: pil,
        calculated: {
            exps: {},
            expsPrime: {}
        },
        tmpUsed: 0,
        code: []
    };

    const ctx_2ns = {
        pil: pil,
        calculated: {
            exps: {},
            expsPrime: {}
        },
        tmpUsed: 0,
        code: []
    };

    generateStep2(res, pil, ctx);                        // H1, H2

    generateStep3(F, res, pil, ctx);                        // Z Polynomials and LC of permutation checks.

    generateConstraintPolynomial(res, pil, ctx, ctx_2ns, false);            // Step4

    generateConstraintPolynomialVerifier(res, pil);

    console.log(res.qDeg);
    let N = 1 << pilPower;
    map(res, pil, N, N, false);
    res.publics = pil.publics;

    return res;

}
