
const generatePublicCalculators = require("./helpers/publics.js");

const generateConstraintPolynomial = require("./helpers/quotientPolynomial/cp_prover");
const generateConstraintPolynomialVerifier = require("./helpers/quotientPolynomial/cp_ver");

const generateFRIPolynomial = require("./helpers/fri/fri_prover");
const generateVerifierQuery = require("./helpers/fri/fri_verifier");

const map = require("./map.js");

const { log2 } = require("pilcom/src/utils.js");
const generateLibsCode = require("./helpers/generateLibsCode.js");
const { setMapOffsets, fixCode, setDimensions } = require("./helpers/helpers.js");

module.exports = function pilInfo(F, _pil, stark = true, starkStruct) {
    const pil = JSON.parse(JSON.stringify(_pil));    // Make a copy as we are going to destroy pil

    const res = {
        varPolMap: [],
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

    generateLibsCode(F, res, pil, ctx);
    
    generateConstraintPolynomial(res, pil, ctx, ctx_ext, stark);

    map(res, pil, stark);

    generateConstraintPolynomialVerifier(res, pil, stark);

    if(stark) {
        generateFRIPolynomial(res, pil, ctx_ext);
        generateVerifierQuery(res, pil);
    } 

    fixCode(res, stark);

    setDimensions(res, stark);

    delete res.imPolsMap;
    delete res.cExp;
    delete res.friExpId;

    if(!stark) {
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
    } else {
        setMapOffsets(res); 
    }
    
    return res;

}
