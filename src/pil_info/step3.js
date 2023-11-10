
const { generateConnectionsZ } = require("./arguments/connections.js");
const { generateLookupS } = require("./arguments/lookups.js");
const { compressAndSelectPermutation, generatePermutationS, generatePermutationZ } = require("./arguments/permutations.js");
const {buildCode} = require("./codegen.js");

module.exports = function generateStep3(res, pil, ctx) {

    compressAndSelectPermutation(res, pil);
    generateLookupS(res, pil, ctx);
    generatePermutationZ(res, pil, ctx);
    generateConnectionsZ(res, pil, ctx);

    res.step3prev = buildCode(ctx);
    ctx.calculated =  { exps: {}, expsPrime: {} }
}