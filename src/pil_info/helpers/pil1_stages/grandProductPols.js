
const {pilCodeGen, buildCode} = require("../../codegen.js");

module.exports = function generateGrandProductPols(res, ctx) {

    for(let i = 0; i < res.ciCtx.length; ++i) {
        pilCodeGen(ctx, res.ciCtx[i].numId, false);
        pilCodeGen(ctx, res.ciCtx[i].denId, false);
    }

    for(let i = 0; i < res.peCtx.length; ++i) {
        pilCodeGen(ctx, res.peCtx[i].numId, false);
        pilCodeGen(ctx, res.peCtx[i].denId, false);
    }

    for(let i = 0; i < res.puCtx.length; ++i) {
        pilCodeGen(ctx, res.puCtx[i].numId, false);
        pilCodeGen(ctx, res.puCtx[i].denId, false);
    }

    res.steps["stage3"] = buildCode(ctx);
    ctx.calculated =  { exps: {}, expsPrime: {} }
    res.nStages++;

}
