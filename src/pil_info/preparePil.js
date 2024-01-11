

const { generatePolynomials } = require("./generatePolynomials");
const { generateConstraintPolynomial } = require("../pil_info/polynomials/constraintPolynomial");


module.exports.preparePil = function preparePil(F, pil, starkStruct) {
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
    
    for(let i = 0; i < constraints.length; ++i) {
        addInfoExpressions(expressions, expressions[constraints[i].e]);
    }

    generateConstraintPolynomial(res, expressions, constraints);

    res.nConstraints = constraints.length;


    return {res, expressions, constraints}
}


function addInfoExpressions(expressions, exp) {
    if("expDeg" in exp) return;

    if (exp.op == "exp") {
        if (expressions[exp.id].expDeg) {
            exp.expDeg = expressions[exp.id].expDeg;
        }
        if (!exp.expDeg) {
            addInfoExpressions(expressions, expressions[exp.id]);
            exp.expDeg = expressions[exp.id].expDeg;
        }
    } else if (["x", "cm", "const"].includes(exp.op)) {
        exp.expDeg = 1;
    } else if (["challenge", "eval", "number", "public"].includes(exp.op)) {
        exp.expDeg = 0;
    } else if(exp.op === "neg") {
        addInfoExpressions(expressions, exp.values[0]);
        exp.expDeg = exp.values[0].expDeg;
    } else if(["add", "sub", "mul"].includes(exp.op)) {
        addInfoExpressions(expressions, exp.values[0]);
        addInfoExpressions(expressions, exp.values[1]);
        const lhsDeg = exp.values[0].expDeg;
        const rhsDeg = exp.values[1].expDeg;
        exp.expDeg = exp.op === "mul" ? lhsDeg + rhsDeg : Math.max(lhsDeg, rhsDeg);
    } else {
        throw new Error("Exp op not defined: "+ exp.op);
    }

    return;
}
