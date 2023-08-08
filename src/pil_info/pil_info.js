
const generatePublicCalculators = require("./publics.js");
const generateStep2 = require("./step2");
const generateStep3 = require("./step3");
const generateConstraintPolynomial = require("./cp_prover");
const generateConstraintPolynomialVerifier = require("./cp_ver");

const generateFRIPolynomial = require("./fri_prover");
const generateVerifierQuery = require("./fri_verifier");

const map = require("./map.js");

const { log2 } = require("pilcom/src/utils.js");

module.exports = function pilInfo(F, _pil, stark = true, starkStruct) {
    const pil = JSON.parse(JSON.stringify(_pil));    // Make a copy as we are going to destroy pil

    const res = {
        varPolMap: [],
        puCtx: [],
        peCtx: [],
        ciCtx: []
    };

    if(stark) {
        const pilDeg = Object.values(pil.references)[0].polDeg;
        const starkDeg = 2 ** starkStruct.nBits;

        if (starkDeg != pilDeg) {
            throw new Error(`Starkpil and pil have degree mismatch (starkpil:${starkDeg} pil:${pilDeg})`);
        }

        if (starkStruct.nBitsExt != starkStruct.steps[0].nBits) {
            throw new Error(`Starkpil.nBitsExt and first step of Starkpil have a mismatch (nBitsExt:${starkStruct.nBitsExt} pil:${starkStruct.steps[0].nBits})`);
        }

        res.starkStruct = starkStruct;
    } else {
        let maxPilPolDeg = 0;
        for (const polRef in pil.references) {
            maxPilPolDeg = Math.max(maxPilPolDeg, pil.references[polRef].polDeg);
        }
        
        res.pilPower = log2(maxPilPolDeg - 1) + 1;
    }
   
    res.nConstants = pil.nConstants;
    res.nPublics = pil.publics.length;
    res.publics = pil.publics;

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

    generateStep2(res, pil, ctx);  // H1, H2

    generateStep3(F, res, pil, ctx);  // Z Polynomials and LC of permutation checks.

    generateConstraintPolynomial(res, pil, ctx, ctx_2ns, stark);            // Step4

    generateConstraintPolynomialVerifier(res, pil, stark);

    if(stark) {
        generateFRIPolynomial(res, pil, ctx_2ns);
        generateVerifierQuery(res, pil);
    } else {
        // Calculate maxPolsOpenings
        let nOpenings = {};
        for(let i = 0; i < res.evMap.length; ++i) {
            if(res.evMap[i].type === "const") continue;
            const name = res.evMap[i].type + res.evMap[i].id;
            if(!nOpenings[name]) nOpenings[name] = 1;
            ++nOpenings[name];
        }

        res.maxPolsOpenings = Math.max(...Object.values(nOpenings));
        
        res.nBitsZK = Math.ceil(Math.log2((res.pilPower + res.maxPolsOpenings) / res.pilPower));
    }
    
    map(res, pil, stark);

    return res;

}
