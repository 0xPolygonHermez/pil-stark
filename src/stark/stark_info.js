
const generatePublicCalculators = require("../pil_info/publics.js");
const generateStep2 = require("../pil_info/step2");
const generateStep3 = require("../pil_info/step3");
const generateConstraintPolynomial = require("../pil_info/cp_prover");
const generateFRIPolynomial = require("../pil_info/fri_prover");

const generateConstraintPolynomialVerifier = require("../pil_info/cp_ver");
const generateVerifierQuery = require("../pil_info/fri_verifier");
const map = require("../pil_info/map");

module.exports = function starkInfoGen(_pil, starkStruct, options) {
    const pil = JSON.parse(JSON.stringify(_pil));    // Make a copy as we are going to destroy pil
    const pilDeg = Object.values(pil.references)[0].polDeg;
    const starkDeg = 2 ** starkStruct.nBits;

    if ( starkDeg != pilDeg) {
        throw new Error(`Starkpil and pil have degree mismatch (starkpil:${starkDeg} pil:${pilDeg})`);
    }

    if ( starkStruct.nBitsExt != starkStruct.steps[0].nBits) {
        throw new Error(`Starkpil.nBitsExt and first step of Starkpil have a mismatch (nBitsExt:${starkStruct.nBitsExt} pil:${starkStruct.steps[0].nBits})`);
    }

    const res = {
        varPolMap: [],
        puCtx: [],
        peCtx: [],
        ciCtx: []
    };

    res.starkStruct = starkStruct;
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

    const addMul = starkStruct.verificationHashType == "GL" ? true : false; 

    generateStep2(res, pil, ctx);                        // H1, H2

    generateStep3(res, pil, ctx);                        // Z Polynomials and LC of permutation chcks.

    generateConstraintPolynomial(res, pil, ctx, ctx2ns);            // Step4

    generateConstraintPolynomialVerifier(res, pil, addMul);

    generateFRIPolynomial(res, pil, ctx2ns);

    generateVerifierQuery(res, pil, addMul);

    map(res, pil);

    res.publics = pil.publics;
    
    if(starkStruct.verificationHashType === "BN128") {
        res.merkleTreeArity = options.arity || 16;
    }

    console.log("--------------------- POLINOMIALS INFO ---------------------")
    console.log(`Columns stage 1: ${res.nCm1} -> Columns in the basefield: ${res.mapSectionsN.cm1_2ns}`);
    console.log(`Columns stage 2: ${res.nCm2} -> Columns in the basefield: ${res.mapSectionsN.cm2_2ns}`);
    console.log(`Columns stage 3: ${res.nCm3} (${res.nImPols} intermediate polinomials) -> Columns in the basefield: ${res.mapSectionsN.cm3_2ns}`);
    console.log(`Columns stage 4: ${res.nCm4} -> Columns in the basefield: ${res.mapSectionsN.cm4_2ns}`);
    console.log(`Total Columns: ${res.nCm1 + res.nCm2 + res.nCm3 + res.nCm4} -> Total Columns in the basefield: ${res.mapSectionsN.cm1_2ns + res.mapSectionsN.cm2_2ns + res.mapSectionsN.cm3_2ns + res.mapSectionsN.cm4_2ns}`);
    console.log(`Total Constraints: ${res.nConstraints}`)
    console.log(`Number of evaluations: ${res.evMap.length}`)
    console.log("------------------------------------------------------------")

    return res;

}




