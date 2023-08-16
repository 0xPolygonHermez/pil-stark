
const generatePublicCalculators = require("./helpers/publics.js");
const generateInclusionPols = require("./helpers/pil1_stages/inclusionPols");
const generateGrandProductPols = require("./helpers/pil1_stages/grandProductPols");

const generateConstraintPolynomial = require("./helpers/quotientPolynomial/cp_prover");
const generateConstraintPolynomialVerifier = require("./helpers/quotientPolynomial/cp_ver");

const generateFRIPolynomial = require("./helpers/fri/fri_prover");
const generateVerifierQuery = require("./helpers/fri/fri_verifier");

const map = require("./map.js");

const { log2 } = require("pilcom/src/utils.js");

const ExpressionOps = require("./expressionops.js");

const { grandProductPlookup } = require("./helpers/pil1_stages/grandProductPlookup.js");
const { grandProductConnection } = require("./helpers/pil1_stages/grandProductConnection.js");
const { grandProductPermutation } = require("./helpers/pil1_stages/grandProductPermutation.js");


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
    res.nCommitments = pil.nCommitments;
    res.nPublics = pil.publics.length;
    res.publics = pil.publics;
    res.nStages = 0;
    res.nChallenges = 0;
    res.challenges = {};
    res.steps = {};

    generatePublicCalculators(res, pil);
    
    const ctx = {
        pil: pil,
        calculated: {
            exps: {},
            expsPrime: {}
        },
        tmpUsed: 0,
        code: []
    };

    const ctx_ext = {
        pil: pil,
        calculated: {
            exps: {},
            expsPrime: {}
        },
        tmpUsed: 0,
        code: []
    };

    const E = new ExpressionOps();

    const alpha = E.challenge("alpha");
    const beta = E.challenge("beta");

    res.challenges[2] = [alpha.id, beta.id];
    res.nChallenges += 2;

    const gamma = E.challenge("gamma");
    const delta = E.challenge("delta");

    res.nChallenges += 2;
    res.challenges[3] = [gamma.id, delta.id];

    if (pil.permutationIdentities.length > 0) {
        const epsilon = E.challenge("epsilon");
        res.challenges[3].push(epsilon.id);
        res.nChallenges++;
    }

    grandProductPlookup(res, pil);
    grandProductPermutation(res, pil);
    grandProductConnection(F, res, pil);

    generateInclusionPols(res, ctx);  // H1, H2

    generateGrandProductPols(res, ctx);

    const imPolsMap = generateConstraintPolynomial(res, pil, ctx, ctx_ext, stark);            // Step4

    generateConstraintPolynomialVerifier(res, imPolsMap, pil, stark);

    if(stark) {
        generateFRIPolynomial(res, pil, ctx_ext);
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
    
    map(res, imPolsMap, pil, stark);

    return res;

}
