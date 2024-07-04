
const ExpressionOps = require("../../helpers/expressionops");

module.exports.addIntermediatePolynomials = function addIntermediatePolynomials(res, expressions, imExps, qDeg) {
    const E = new ExpressionOps();

    console.log("Number of intermediate expressions: " + imExps.length);
    console.log("Q degree: " + qDeg);
    
    res.qDeg = qDeg;


    const vc = E.challenge("vc");
    
    console.log("Checking that constraint polynomial numerator expression has degree less than qDeg + 1");
    const maxDegExpr = module.exports.calculateExpDeg(expressions, expressions[res.cExpId], imExps);
    if(maxDegExpr > qDeg + 1) {
        throw new Error(`The maximum degree of the constraint expression has a higher degree (${maxDegExpr}) than the maximum allowed degree (${qDeg + 1})`);
    }

    res.imExpsList = imExps;
    res.imExp2cm = {};

    res.nImPols = res.imExpsList.length;
    res.nConstraints += res.nImPols;
    
    let nImPolsDim1 = 0;
    let nImPolsDim3 = 0;
    console.log("Checking that intermediate polynomials have degree less than qDeg + 1");
    for (let i=0; i<imExps.length; i++) {
        const expId = imExps[i];
        
        if(expressions[expId].dim === 3) {
            nImPolsDim3 += 1;
        } else {
            nImPolsDim1 += 1;
        }
        const imPolDeg = module.exports.calculateExpDeg(expressions, expressions[expId], imExps);
        if(imPolDeg > qDeg + 1) {
            throw new Error(`Intermediate polynomial with id: ${expId} has a higher degree (${imPolDeg}) than the maximum allowed degree (${qDeg + 1})`);
        }
    }

    console.log(`nImPols in the basefield: ${nImPolsDim1}`)
    console.log(`nImPols in the extended field: ${nImPolsDim3}`)
    console.log(`Total imPols columns in the base field: ${nImPolsDim1 + 3*nImPolsDim3}`);

    console.log("Adding intermediate polynomials to the expressions and constraints.");
    for (let i=0; i<imExps.length; i++) {
        res.imExp2cm[res.imExpsList[i]] = res.nCommitments++;
        res.nCm3++;
        const expId = imExps[i];
        expressions[expId].imPol = true;
        let e = {
            op: "sub",
            values: [
                Object.assign({}, expressions[expId]),
                E.cm(res.nCommitments-1),
            ]
        };
        expressions[res.cExpId] = E.add(E.mul(vc, expressions[res.cExpId]), e);
    }

    res.qs = [];
    for (let i=0; i<res.qDeg; i++) {
        res.qs[i] = res.nCommitments++;
    }
}

module.exports.calculateIntermediatePolynomials = function calculateIntermediatePolynomials(expressions, cExpId, maxQDeg, qDim) {
    let d = 2;

    const cExp = expressions[cExpId];
    let [imExps, qDeg] = calculateImPols(expressions, cExp, d);
    let addedBasefieldCols = calculateAddedCols(d++, expressions, imExps, qDeg, qDim);
    while(imExps.length > 0 && d <= maxQDeg) {
        let [imExpsP, qDegP] = calculateImPols(expressions, cExp, d);
        let newAddedBasefieldCols = calculateAddedCols(d, expressions, imExpsP, qDegP, qDim);
        if ((maxQDeg && newAddedBasefieldCols < addedBasefieldCols) 
            || (!maxQDeg && imExpsP.length === 0)) {
            [imExps, qDeg] = [imExpsP, qDegP];
            addedBasefieldCols = newAddedBasefieldCols;
        }
        if(imExpsP === 0) break;
        d++;
    }

    return {newExpressions: expressions, imExps, qDeg};
}



function calculateAddedCols(maxDeg, expressions, imExps, qDeg, qDim) {
    let qCols = qDeg * qDim;
    let imCols = 0;
    for(let i = 0; i < imExps.length; i++) {
        
       imCols += expressions[imExps[i]].dim;
    }
    let addedCols = qCols + imCols;
    console.log(`maxDeg: ${maxDeg}, nIm: ${imExps.length}, d: ${qDeg}, addedCols in the basefield: ${addedCols} (${qCols} + ${imCols})`);

    return addedCols;
}


function calculateImPols(expressions, _exp, maxDeg) {

    const imExpressions = [];
    const absoluteMax = maxDeg;
    let absMaxD = 0;

    [re, rd] = _calculateImPols(expressions, _exp, imExpressions, maxDeg);

    return [re, Math.max(rd, absMaxD) - 1];  // We divide the exp polynomial by 1.

    function _calculateImPols(expressions, exp, imExpressions, maxDeg) {
        if (imExpressions === false) {
            return [false, -1];
        }
        if(["add", "sub", "neg"].indexOf(exp.op)  >= 0) {
            let md = 0;
            for (let i=0; i<exp.values.length; i++) {
                [imExpressions , d] = _calculateImPols(expressions, exp.values[i], imExpressions, maxDeg);
                if (d>md) md = d;
            }
            return [imExpressions, md];
        } else if (exp.op == "mul") {
            let eb = false;
            let ed = -1;
            if (["number", "public", "challenge"].indexOf(exp.values[0].op) >= 0 ) {
                return _calculateImPols(expressions, exp.values[1], imExpressions, maxDeg);
            }
            if (["number", "public", "challenge"].indexOf(exp.values[1].op) >= 0 ) {
                return _calculateImPols(expressions, exp.values[0], imExpressions, maxDeg);
            }
            const maxDegHere = exp.expDeg;
            if (maxDegHere <= maxDeg) {
                return [imExpressions, maxDegHere];
            }
            for (let l=0; l<=maxDeg; l++) {
                let r = maxDeg-l;
                const [e1, d1] = _calculateImPols(expressions, exp.values[0], imExpressions, l);
                const [e2, d2] = _calculateImPols(expressions,  exp.values[1], e1, r );
                if (e2 !== false) {
                    if (eb === false) {
                        eb = e2;
                    ed = d1+d2;
                    } else {
                        if (Object.keys(e2).length < Object.keys(eb).length) {
                            eb=e2;
                            ed = d1+d2;
                        }
                    }
                }
                if (eb !== false) {
                    if (Object.keys(eb).length == Object.keys(imExpressions).length) return [eb, ed];  // Cannot o it better.
                }
            }
            return [eb, ed]
        } else if (exp.op == "exp") {
            if (maxDeg < 1) {
                return [false, -1];
            }
            if (imExpressions.findIndex(im => im === exp.id) !== -1) return [imExpressions, 1];
            let e,d;
            if(exp.res && exp.res[absoluteMax] && exp.res[absoluteMax][JSON.stringify(imExpressions)]) {
                [e,d] = exp.res[absoluteMax][JSON.stringify(imExpressions)];
            } else {
                [e,d] = _calculateImPols(expressions, expressions[exp.id], imExpressions, absoluteMax);
            }
            if (e === false) {
                return [false, -1];
            }
            if (d > maxDeg) {
                if (d>absMaxD) absMaxD = d;
                return [[...e, exp.id], 1];
            } else {
                if(!exp.res) exp.res = {};
                if(!exp.res[absoluteMax]) exp.res[absoluteMax] = {};
                exp.res[absoluteMax][JSON.stringify(imExpressions)] = [e, d];
                return exp.res[absoluteMax][JSON.stringify(imExpressions)];
            }
        } else {
            if(exp.expDeg === 0) {
                return [imExpressions, 0];
            } else if (maxDeg < 1) {
                return [false, -1];
            } else {
                return [imExpressions, 1];
            }
        }
    }
}

module.exports.calculateExpDeg = function calculateExpDeg(expressions, exp, imExps = [], expsDegs = []) {
    if (exp.op == "exp") {
        if (expsDegs[exp.id]) return expsDegs[exp.id];
        if (imExps.includes(exp.id)) return 1;
        expsDegs[exp.id] = calculateExpDeg(expressions, expressions[exp.id], imExps, expsDegs);
        return expsDegs[exp.id];
    } else if (["x", "const", "cm"].includes(exp.op) || (exp.op === "Zi" && exp.boundary !== "everyRow")) {
        return 1;
    } else if (["number", "public", "challenge", "eval", "subproofValue"].includes(exp.op) || (exp.op === "Zi" && exp.boundary === "everyRow")) {
        return 0;
    } else if(exp.op === "neg") {
        return calculateExpDeg(expressions, exp.values[0], imExps, expsDegs);
    } else if(["add", "sub", "mul"].includes(exp.op)) {
        const lhsDeg = calculateExpDeg(expressions, exp.values[0], imExps, expsDegs);
        const rhsDeg = calculateExpDeg(expressions, exp.values[1], imExps, expsDegs);
        return exp.op === "mul" ? lhsDeg + rhsDeg : Math.max(lhsDeg, rhsDeg);
    } else {
        throw new Error("Exp op not defined: "+ exp.op);
    }
}