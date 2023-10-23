const generateFRIPolynomial = require("./polynomials/friPolinomial");

const { generateConstraintPolynomialCode, generateConstraintPolynomialVerifierCode, generateFRICode, generatePublicsCode, generateStagesCode } = require("./code/generateCode");

module.exports.generatePilCode = function generatePilCode(res, pil, expressions) {
    generatePublicsCode(res, pil, expressions);

    generateStagesCode(res, pil, expressions);

    generateConstraintPolynomialCode(res, pil, expressions);

    generateConstraintPolynomialVerifierCode(res, pil, expressions);

    generateFRIPolynomial(res, expressions);

    generateFRICode(res, pil, expressions);

    return res;
}