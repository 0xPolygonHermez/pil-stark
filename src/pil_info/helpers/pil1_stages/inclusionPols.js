
const {pilCodeGen, buildCode} = require("../../codegen.js");

module.exports = function generateInclusionPols(res, ctx) {
   
    for(let i = 0; i < res.puCtx.length; ++i) {
        console.log(res.puCtx);
        pilCodeGen(ctx, res.puCtx[i].fExpId, false);
        pilCodeGen(ctx, res.puCtx[i].tExpId, false);
    }

    res.steps["stage2"] = buildCode(ctx);
    ctx.calculated =  { exps: {}, expsPrime: {} }

    res.nStages++;
}
