

const { generatePolynomials } = require("./generatePolynomials");
const { generateConstraintPolynomial } = require("../pil_info/polynomials/constraintPolynomial");
const { getExpDim } = require("./helpers");


module.exports.preparePil = function preparePil(F, pil, starkStruct, options = {}) {
    const res = {};

    for(let i = 0; i < pil.expressions.length; ++i) {
        pil.expressions[i].stage = 1;
    }

    let {expressions, constraints, publicsInfo} = generatePolynomials(F, res, pil);
    
    res.starkStruct = starkStruct;
    if (res.starkStruct.nBits != res.pilPower) {
        throw new Error(`starkStruct and pilfile have degree mismatch (starkStruct:${res.starkStruct.nBits} pilfile:${res.pilPower})`);
    }

    if (res.starkStruct.nBitsExt != res.starkStruct.steps[0].nBits) {
        throw new Error(`starkStruct.nBitsExt and first step of starkStruct have a mismatch (nBitsExt:${res.starkStruct.nBitsExt} pil:${res.starkStruct.steps[0].nBits})`);
    }

    res.publics = publicsInfo;
    
    if(res.starkStruct.verificationHashType === "BN128") {
        res.merkleTreeArity = options.arity || 16;
    }

    res.cmDims = [];

    for(let i = 0; i < res.nCm1; ++i) {
        res.cmDims[i] = 1;
    }

    for(let i = 0; i < res.puCtx.length; ++i) {
        const dim = Math.max(getExpDim(expressions, res.cmDims, res.puCtx[i].fExpId), getExpDim(expressions, res.cmDims, res.puCtx[i].tExpId));
        res.cmDims[res.nCm1 + i*2] = dim;
        res.cmDims[res.nCm1 + i*2 + 1] = dim;
    }

    for(let i = 0; i < res.nCm3; ++i) {
        res.cmDims[res.nCm1 + res.nCm2 + i] = 3;
    }

    for(let i = 0; i < constraints.length; ++i) {
        addInfoExpressions(res, expressions, expressions[constraints[i].e]);
    }

    generateConstraintPolynomial(res, expressions, constraints);

    res.nConstraints = constraints.length;

    delete res.cmDims;

    return {res, expressions, constraints}
}


function addInfoExpressions(res, expressions, exp) {
    if("expDeg" in exp) return;

    if (exp.op == "exp") {
        if (expressions[exp.id].expDeg) {
            exp.expDeg = expressions[exp.id].expDeg;
            exp.dim = expressions[exp.id].dim;
        }
        if (!exp.expDeg) {
            addInfoExpressions(res, expressions, expressions[exp.id]);
            exp.expDeg = expressions[exp.id].expDeg;
            exp.dim = expressions[exp.id].dim;
        }
    } else if (["x", "const"].includes(exp.op)) {
        exp.expDeg = 1;
        exp.dim = 1;
    } else if (exp.op === "cm") {
        exp.expDeg = 1;
        exp.dim = res.cmDims[exp.id];
    } else if (["number", "public"].includes(exp.op)) {
        exp.expDeg = 0;
        exp.dim = 1;
    } else if (["challenge", "eval"].includes(exp.op)) {
        exp.expDeg = 0;
        exp.dim = 3;
    } else if(exp.op === "neg") {
        addInfoExpressions(res, expressions, exp.values[0]);
        exp.expDeg = exp.values[0].expDeg;
        exp.dim = exp.values[0].dim;
    } else if(["add", "sub", "mul"].includes(exp.op)) {
        addInfoExpressions(res, expressions, exp.values[0]);
        addInfoExpressions(res, expressions, exp.values[1]);
        const lhsDeg = exp.values[0].expDeg;
        const rhsDeg = exp.values[1].expDeg;
        exp.expDeg = exp.op === "mul" ? lhsDeg + rhsDeg : Math.max(lhsDeg, rhsDeg);
        exp.dim = Math.max(exp.values[0].dim, exp.values[1].dim);
    } else {
        throw new Error("Exp op not defined: "+ exp.op);
    }

    return;
}
