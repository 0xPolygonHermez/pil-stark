
const {pilCodeGen, buildCode} = require("../../codegen.js");

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
    res.code.queryVerifier = buildCode(ctxFri);

    const ctxF = {};
    ctxF.expMap = [{}, {}];
    ctxF.code = res.code.queryVerifier;
}

