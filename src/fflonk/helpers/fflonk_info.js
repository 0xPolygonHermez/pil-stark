
const generatePublicCalculators = require("../../pil_info/publics.js");
const generateStep2 = require("../../pil_info/step2");
const generateStep3 = require("../../pil_info/step3");
const generateConstraintPolynomial = require("../../pil_info/cp_prover");
const generateConstraintPolynomialVerifier = require("../../pil_info/cp_ver");
const map = require("../../pil_info/map.js");
const { log2 } = require("pilcom/src/utils.js");

module.exports = function fflonkInfoGen(F, _pil) {
    const pil = JSON.parse(JSON.stringify(_pil));    // Make a copy as we are going to destroy pil



    const res = {
        varPolMap: [],
        puCtx: [],
        peCtx: [],
        ciCtx: []
    };

    // for (let i = 0; i < primePols.length; i++) {
    //     const reference = findPolynomialByTypeId(pil, primePols[i].type + "P", primePols[i].id);
    //     let name = reference;
    //     if (pil.references[reference].isArray) {
    //         name += (primePols[i].id - pil.references[reference].id);
    //     }
    //     const stage = pil.references[reference].stage;
    //     polsWXi.push({ name, stage, degree: pil.references[reference].polDeg });
    //     if (!polsOpenings[name]) polsOpenings[name] = 1;
    //     ++polsOpenings[name];
    // }

    let maxPilPolDeg = 0;
    for (const polRef in pil.references) {
        let currentDeg = pil.references[polRef].polDeg;
        // TODO REVIEW
        if(pil.references[polRef].type === 'cmP') currentDeg += 3;
        maxPilPolDeg = Math.max(maxPilPolDeg, currentDeg);
    }
    res.pilPower = log2(maxPilPolDeg - 1) + 1;

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

    generateConstraintPolynomialVerifier(res, pil, false);

    map(res, pil, false);
    res.publics = pil.publics;

    return res;

}
