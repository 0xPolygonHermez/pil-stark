
const {pilCodeGen, buildCode} = require("../codegen.js");
const { iterateCode } = require("./helpers.js");

module.exports = function generatePublicCalculators(res, pil, ctx) {
    res.publicsCode = [];
    for (let i=0; i<pil.publics.length; i++) {
        if (pil.publics[i].polType == "imP") {
            pilCodeGen(ctx, pil.publics[i].polId, 0);
            res.publicsCode[i] = buildCode(ctx);
            iterateCode(res.publicsCode[i], "n", fixRef);
        }
    }

    function fixRef(r, ctx) {
        const p = r.prime ? 1 : 0;
        if (r.type === "exp") {
            if (typeof ctx.expMap[p][r.id] === "undefined") {
                ctx.expMap[p][r.id] = ctx.code.tmpUsed ++;
            }
            delete r.prime;
            r.type= "tmp";
            r.id= ctx.expMap[p][r.id];
        }
    }
}
