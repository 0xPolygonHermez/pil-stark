const ExpressionOps = require("../../helpers/expressionops");
const { getExpDim } = require("../helpers");

module.exports.generateConstraintPolynomial = function generateConstraintPolynomial(res, expressions, constraints) {

    const E = new ExpressionOps();

    const vc = E.challenge("vc");
    
    let cExp = null;
    for (let i=0; i<constraints.length; i++) {
        const e = E.exp(constraints[i].e);
        if (cExp) {
            cExp = E.add(E.mul(vc, cExp), e);
        } else {
            cExp = e;
        }
    }

    res.cExpId = expressions.length;
    cExp.stage = 4;
    expressions.push(cExp);

    res.qDim = getExpDim(expressions, res.cmDims, res.cExpId);
}
