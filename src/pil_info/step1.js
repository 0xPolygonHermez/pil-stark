
const { compressAndSelectLookup } = require("./arguments/lookups.js");
const {pilCodeGen, buildCode} = require("./codegen.js");

module.exports = function generateStep1(res, pil, ctx) {

    compressAndSelectLookup(res, pil, false);

    for (let i=0; i<res.puCtx.length; i++) {
        const puCtx = res.puCtx[i];
        if(puCtx.fSelExpId !== null) {
            pilCodeGen(ctx, puCtx.fSelExpId, false);
        }
        for(let j = 0; j < puCtx.fVals.length; ++j) {
            const fVal = puCtx.fVals[j];
            pilCodeGen(ctx, fVal, false);
        }

        if(puCtx.tSelExpId !== null) {
            pilCodeGen(ctx, puCtx.tSelExpId, false);
        }
        for(let j = 0; j < puCtx.tVals.length; ++j) {
            const tVal = puCtx.tVals[j];
            pilCodeGen(ctx, tVal, false);
        }

        puCtx.mId = pil.nCommitments++;
        res.nCm1++;
    }

    res.step1 = buildCode(ctx);
    ctx.calculated =  { exps: {}, expsPrime: {} }
}
