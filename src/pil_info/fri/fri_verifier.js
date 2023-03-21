
const {pilCodeGen, buildCode} = require("../codegen.js");

module.exports = function generateVerifierQuery(res, pil) {

    const ctxFri = {
        pil: pil,
        calculated: {
            exps: {},
            expsPrime: {}
        },
        tmpUsed: 0,
        code: []
    };

    pilCodeGen(ctxFri, res.friExpId, false, null, null, true);
    res.verifierQueryCode = buildCode(ctxFri);
    res.nExps = pil.expressions.length;

    const ctxF = {};
    ctxF.expMap = [{}, {}];
    ctxF.code = res.verifierQueryCode;
}

