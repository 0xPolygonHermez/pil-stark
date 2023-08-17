
const generatePublicCalculators = require("./helpers/publics.js");

const generateConstraintPolynomial = require("./helpers/quotientPolynomial/cp_prover");
const generateConstraintPolynomialVerifier = require("./helpers/quotientPolynomial/cp_ver");

const generateFRIPolynomial = require("./helpers/fri/fri_prover");
const generateVerifierQuery = require("./helpers/fri/fri_verifier");

const map = require("./map.js");

const { log2 } = require("pilcom/src/utils.js");

const ExpressionOps = require("./expressionops.js");

const { grandProductPlookup } = require("./helpers/pil1_libs/grandProductPlookup.js");
const { grandProductConnection } = require("./helpers/pil1_libs/grandProductConnection.js");
const { grandProductPermutation } = require("./helpers/pil1_libs/grandProductPermutation.js");
const { pilCodeGen, buildCode } = require("./codegen.js");


module.exports = function pilInfo(F, _pil, stark = true, starkStruct) {
    const pil = JSON.parse(JSON.stringify(_pil));    // Make a copy as we are going to destroy pil

    const res = {
        varPolMap: [],
        libs: {}
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
    res.nLibStages = 0;
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

    let pilLibs = [];

    if(pil.plookupIdentities.length > 0) {
        pilLibs.push({
            nChallenges: [2,2],
            lib: function() { grandProductPlookup(res, pil) },
        });
    }

    if(pil.connectionIdentities.length > 0) {
        pilLibs.push({
            nChallenges: [2],
            lib: function() { grandProductConnection(res, pil, F)},
        });
    }

    if(pil.permutationIdentities.length > 0) {
        pilLibs.push({
            nChallenges: [3],
            lib: function() { grandProductPermutation(res, pil, F)},
        });
    }

    if(pilLibs.length > 0) {
        res.nLibStages = Math.max(...pilLibs.map(lib => lib.nChallenges.length));
    }
    
    for(let i = 0; i < res.nLibStages; ++i) {
        const stage = 2 + i;
        for(let j = 0; j < pilLibs.length; ++j) {
            const lib = pilLibs[j];
            if(lib.nChallenges <= res.nLibStages) continue;
            if(!res.challenges[stage]) res.challenges[stage] = [];
            const nChallenges = res.challenges[stage].length;
            for(let k = nChallenges; k < lib.nChallenges[i]; ++k) {
                res.challenges[stage].push(res.nChallenges++);
                E.challenge(`stage${i+1}_challenge${k}`);
            }    
        }
    }

    for(let i = 0; i < pilLibs.length; ++i) {
        pilLibs[i].lib();
    }

    for(let i = 0; i < res.nLibStages; ++i) {
        for(let j = 0; j < Object.keys(res.libs).length; ++j) {
            const libName = Object.keys(res.libs)[j];
            const lib = res.libs[libName];
            if(lib.length > i) {
                const polsStage = lib[i].pols;
                for(let k = 0; k < Object.keys(polsStage).length; ++k) {
                    let name = Object.keys(polsStage)[k];
                    if(polsStage[name].tmp) {
                        pilCodeGen(ctx, polsStage[name].id, false);
                    }                    
                }
            }
        }
        const stage = 2 + i;
        res.steps[`stage${stage}`] = buildCode(ctx);
        ctx.calculated =  { exps: {}, expsPrime: {} }
    }

    const imPolsMap = generateConstraintPolynomial(res, pil, ctx, ctx_ext, stark);

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
