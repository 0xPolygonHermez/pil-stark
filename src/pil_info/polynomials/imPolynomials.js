
const ExpressionOps = require("../../helpers/expressionops");

module.exports.addIntermediatePolynomials = function addIntermediatePolynomials(res, expressions, imExps, qDeg) {
    const E = new ExpressionOps();

    console.log("Number of intermediate expressions: " + imExps.length);
    console.log("Q degree: " + qDeg);
    
    res.qDeg = qDeg;


    const vc = E.challenge("vc");
    
    res.imExpsList = imExps;
    res.imExp2cm = {};
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

module.exports.calculateIntermediatePolynomials = function calculateIntermediatePolynomials(expressions, cExpId, maxQDeg) {
    let d = 2;

    const cExp = expressions[cExpId];
    let [imExps, qDeg] = calculateImPols(expressions, cExp, d++);
    while(imExps.length > 0 && d <= maxQDeg) {
        let [imExpsP, qDegP] = calculateImPols(expressions, cExp, d++);
        if ((maxQDeg && imExpsP.length + qDegP < imExps.length + qDeg) 
            || (!maxQDeg && imExpsP.length === 0)) {
            [imExps, qDeg] = [imExpsP, qDegP];
        }
        if(imExpsP === 0) break;
    }

    return {newExpressions: expressions, imExps, qDeg};
}

function calculateImPols(expressions, _exp, maxDeg) {

    const imExpressions = [];
    const absoluteMax = maxDeg;
    let absMaxD = 0;

    [re, rd] = _calculateImPols(expressions, _exp, imExpressions, maxDeg);

    console.log(`maxDeg: ${maxDeg}, nIm: ${Object.keys(re).length}, d: ${rd}`);

    return [re, Math.max(rd, absMaxD) - 1];  // We divide the exp polynomial by 1.

    function _calculateImPols(expressions, exp, imExpressions, maxDeg) {
        if (imExpressions === false) {
            return [false, -1];
        }
        if(["add", "sub", "neg"].indexOf(exp.op)  >= 0) {
            let md =0;
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
            const maxDegHere = getExpDim(expressions, exp, maxDeg);
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


function getExpDim(expressions, exp, maxDeg) {
    switch (exp.op) {
        case "add":
        case "sub":
        case "addc":
        case "mulc":
        case "neg":
            let md = 1;
            for (let i=0; i<exp.values.length; i++) {
                const d = getExpDim(expressions, exp.values[i], maxDeg);
                if (d>md) md=d;
            }
            return md;
        case "mul":
            return getExpDim(expressions, exp.values[0], maxDeg) + getExpDim(expressions, exp.values[1], maxDeg)
        case "muladd":
            return Math.max(getExpDim(expressions, exp.values[0], maxDeg) + getExpDim(expressions, exp.values[1], maxDeg), getExpDim(expressions, exp.values[2], maxDeg));
        case "cm": return 1;
        case "const": return 1;
        case "exp": 
            if(exp.dim && exp.dim[maxDeg] >= 0) return exp.dim[maxDeg];
            if(!exp.dim) exp.dim = {};
            exp.dim[maxDeg] = getExpDim(expressions, expressions[exp.id], maxDeg);
            return exp.dim[maxDeg];
        case "number": return 0;
        case "public": return 0;
        case "challenge": return 0;
        case "eval": return 0;
        case "x": return 1;
        default: throw new Error("Exp op not defined: " + exp.op);
    }
}