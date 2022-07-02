
const F1Field = require("./f3g.js");
const getKs = require("zkpil").getKs;

const generatePublicCalculators = require("./starkinfo_publics");
const generateStep2 = require("./starkinfo_step2");
const generateStep3 = require("./starkinfo_step3");
const generateConstraintPolynomial = require("./starkinfo_cp_prover");
const generateFRIPolynomial = require("./starkinfo_fri_prover");

const generateConstraintPolynomialVerifier = require("./starkinfo_cp_ver");
const generateVerifierQuery = require("./starkinfo_fri_ver");
const map = require("./starkinfo_map");

module.exports = function starkInfoGen(pil, starkStruct) {
    const F = new F1Field();

    const res = {
        varPolMap: [],
        puCtx: [],
        peCtx: [],
        ciCtx: []
    };

    res.starkStruct = starkStruct;
    res.nConstants = pil.nConstants;


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
    res.nCm2 = pil.nCommitments - res.nCm1;

    generateStep3(res, pil, ctx);                        // Z Polynomials and LC of permutation chcks.
    res.nCm3 = pil.nCommitments - res.nCm1 - res.nCm2;

    generateConstraintPolynomial(res, pil, ctx, ctx2ns);            // Step4
    res.nCm4 = pil.nCommitments - res.nCm3 -res.nCm2-res.nCm1;
    res.nQ = pil.nQ;

    generateConstraintPolynomialVerifier(res, pil);

    generateFRIPolynomial(res, pil, ctx2ns);

    generateVerifierQuery(res, pil);

    map(res, pil);

    return res;

}




