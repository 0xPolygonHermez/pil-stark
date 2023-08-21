
const {pilCodeGen, buildCode} = require("../../codegen.js");

module.exports = function generateVerifierQuery(res, ctx) {

    pilCodeGen(ctx, res.friExpId, 0, true);
    res.code.queryVerifier = buildCode(ctx);

}

