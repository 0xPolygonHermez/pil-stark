const { buildCode, pilCodeGen } = require("../codegen");
const ExpressionOps = require("../expressionops");
const { grandProductConnection } = require("./pil1_libs/grandProductConnection.js");
const { grandProductPermutation } = require("./pil1_libs/grandProductPermutation.js");
const { grandProductPlookup } = require("./pil1_libs/grandProductPlookup.js");

module.exports = function generateLibsCode(F, res, pil, ctx) {
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
        res.code[`stage${stage}`] = buildCode(ctx);
        ctx.calculated =  { exps: {}, expsPrime: {} }
    }
}