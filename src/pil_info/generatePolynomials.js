const { log2 } = require("pilcom/src/utils");
const { grandProductConnection } = require("./libs/grandProductConnection");
const { grandProductPermutation } = require("./libs/grandProductPermutation");
const { grandProductPlookup } = require("./libs/grandProductPlookup");

module.exports.generatePolynomials = function generatePolynomials(F, res, _pil) {
    const pil = JSON.parse(JSON.stringify(_pil));    // Make a copy as we are going to destroy the original

    res.nPublics = pil.publics.length;
    res.nConstants = pil.nConstants;

    res.nCm1 = pil.nCommitments;
    res.nCm2 = 0;
    res.nCm3 = 0;

    grandProductPlookup(res, pil);

    grandProductPermutation(res, pil);

    grandProductConnection(res, pil, F);

    res.nCommitments = pil.nCommitments;
    res.pilPower = log2(Object.values(pil.references)[0].polDeg);

    const expressions = [...pil.expressions];
    const constraints = [...pil.polIdentities]
    const publicsInfo = pil.publics;

    return { publicsInfo, expressions, constraints };
}
