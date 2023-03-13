
const generatePublicCalculators = require("../../pil_info/publics.js");
const generateStep2 = require("../../pil_info/step2");
const generateStep3 = require("../../pil_info/step3");
const generateConstraintPolynomial = require("../../pil_info/cp_prover");
const generateConstraintPolynomialVerifier = require("../../pil_info/cp_ver");
const map = require("../../pil_info/map");

module.exports = function fflonkInfoGen(_pil) {
    const pil = JSON.parse(JSON.stringify(_pil));    // Make a copy as we are going to destroy pil

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

    const ctx2ns = {
        pil: pil,
        calculated: {
            exps: {},
            expsPrime: {}
        },
        tmpUsed: 0,
        code: []
    };


    generateStep2(res, pil, ctx);                        // H1, H2

    generateStep3(res, pil, ctx);                        // Z Polynomials and LC of permutation chcks.

    generateConstraintPolynomial(res, pil, ctx, ctx2ns);            // Step4

    generateConstraintPolynomialVerifier(res, pil);

    map(res, pil);

    res.publics = pil.publics;

    return res;

}




