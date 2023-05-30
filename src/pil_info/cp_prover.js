const {pilCodeGen, buildCode} = require("./codegen.js");
const ExpressionOps = require("../helpers/expressionops");

module.exports = function generateConstraintPolynomial(res, pil, ctx, ctx2ns, stark) {

    const E = new ExpressionOps();

    const vc = E.challenge("vc");
    let cExp = null;
    for (let i=0; i<pil.polIdentities.length; i++) {
        const e = E.exp(pil.polIdentities[i].e);
        if (cExp) {
            cExp = E.add(E.mul(vc, cExp), e);
        } else {
            cExp = e;
        }
    }

    let maxDeg;
    if(stark) {
        maxDeg = (1 << (res.starkStruct.nBitsExt- res.starkStruct.nBits)) + 1;
    } else {
        maxDeg = 4;
    }
    let d = 2;
    let [imExps, qDeg] = calculateImPols(pil, cExp, d++);
    [res.imExps, res.qDeg] = [imExps, qDeg];
    while(Object.keys(imExps).length > 0 && d <= maxDeg) {
        [imExps, qDeg] = calculateImPols(pil, cExp, d++);
        if ((maxDeg && (Object.keys(imExps).length + qDeg < Object.keys(res.imExps).length + res.qDeg)) 
            || (!maxDeg && Object.keys(imExps).length === 0)) {
            [res.imExps, res.qDeg] = [imExps, qDeg];
        }
    }

    res.imExpsList = Object.keys(res.imExps).map(Number);
    res.imExp2cm = {}
    for (let i=0; i<res.imExpsList.length; i++) {
        res.imExp2cm[res.imExpsList[i]] = pil.nCommitments++;
        const e = {
            op: "sub",
            values: [
                Object.assign({}, pil.expressions[res.imExpsList[i]]),
                {
                    op: "cm",
                    id: pil.nCommitments-1
                }
            ]
        };
        if (cExp) {
            cExp = E.add(E.mul(vc, cExp), e);
        } else {
            cExp = e;
        }
    }

    res.cExp = pil.expressions.length;
    pil.expressions.push(cExp);

    res.nCm3 = pil.nCommitments - res.nCm1 - res.nCm2;
    
    res.qs = [];
    if(stark) {
        for (let i=0; i<res.qDeg; i++) {
            res.qs[i] = pil.nCommitments++;
        }
    } else {
        res.qs[0] = pil.nCommitments++;
    }

    for (let i=0; i<res.imExpsList.length; i++) {
        pilCodeGen(ctx, res.imExpsList[i]);
    }

    res.step3 = buildCode(ctx);

    // This variables are already calculated by expanding the ones in deg n
    ctx2ns.calculated.exps = Object.assign({}, res.imExps);
    ctx2ns.calculated.expsPrime= Object.assign({}, res.imExps);

    pilCodeGen(ctx2ns, res.cExp);
    const code = ctx2ns.code[ctx2ns.code.length-1].code;
    if(stark) {
        code.push({
            op: "mul",
            dest: {
                type: "q",
                id: 0
            },
            src: [
            code[code.length-1].dest,
            {
                    type: "Zi"
            }
            ]
        });
    } else {
        code.push({
            op: "copy",
            dest: {
                type: "q",
                id: 0
            },
            src: [code[code.length-1].dest],
        });
    }
    
    res.nCm4 = res.qDeg;

    res.step42ns = buildCode(ctx2ns);
}

function calculateImPols(pil, _exp, maxDeg) {

    const imExpressions = {};
    const absoluteMax = maxDeg;
    let absMaxD = 0;

    [re, rd] = _calculateImPols(pil, _exp, imExpressions, maxDeg);

    console.log(`maxDeg: ${maxDeg}, nIm: ${Object.keys(re).length}, d: ${rd}`);

    return [re, Math.max(rd, absMaxD) - 1];  // We divide the exp polynomial by 1.   

    function _calculateImPols(pil, exp, imExpressions, maxDeg) {
        if (imExpressions === false) {
            return [false, -1];
        }
        if (["add", "sub", "addc", "mulc", "neg"].indexOf(exp.op) >=0 ) {
            let md =0;
            for (let i=0; i<exp.values.length; i++) {
                [imExpressions , d] = _calculateImPols(pil, exp.values[i], imExpressions, maxDeg);
                if (d>md) md = d;
            }
            return [imExpressions, md];
        } else if (["number", "public", "challenge"].indexOf(exp.op) >=0 ) {
            return [imExpressions, 0];
        } else if (["x", "const", "cm"].indexOf(exp.op) >= 0) {
            if (maxDeg < 1) {
                return [false, -1];
            }
            return [imExpressions, 1];
        } else if (exp.op == "mul") {
            let eb = false;
            let ed = -1;
            if (["number", "public", "challenge"].indexOf(exp.values[0].op) >= 0 ) {
                return _calculateImPols(pil, exp.values[1], imExpressions, maxDeg);
            }
            if (["number", "public", "challenge"].indexOf(exp.values[1].op) >= 0 ) {
                return _calculateImPols(pil, exp.values[0], imExpressions, maxDeg);
            }
            const maxDegHere = getExpDim(pil, exp, maxDeg);
            if (maxDegHere <= maxDeg) {
                return [imExpressions, maxDegHere];
            }
            for (let l=0; l<=maxDeg; l++) {
                let r = maxDeg-l;
                const [e1, d1] = _calculateImPols(pil, exp.values[0], imExpressions, l);
                const [e2, d2] = _calculateImPols(pil,  exp.values[1], e1, r );
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
            if (imExpressions[exp.id]) return [imExpressions, 1];
            let e,d;
            if(exp.res && exp.res[absoluteMax] && exp.res[absoluteMax][JSON.stringify(imExpressions)]) {
                [e,d] = exp.res[absoluteMax][JSON.stringify(imExpressions)];
            } else {
                [e,d] = _calculateImPols(pil, pil.expressions[exp.id], imExpressions, absoluteMax);
            }
            if (e === false) {
                return [false, -1];
            }
            if (d > maxDeg) {
                const ce = Object.assign({}, e);
                ce[exp.id] = true;
                if (d>absMaxD) absMaxD = d;
                return [ce, 1];
            } else {
                if(!exp.res) exp.res = {};
                if(!exp.res[absoluteMax]) exp.res[absoluteMax] = {};
                exp.res[absoluteMax][JSON.stringify(imExpressions)] = [e, d];
                return exp.res[absoluteMax][JSON.stringify(imExpressions)];
            }
        } else {
            throw new Error("Exp op not defined: "+ exp.op);
        }
    }

}


function getExpDim(pil, exp, maxDeg) {
    switch (exp.op) {
        case "add":
        case "sub":
        case "addc":
        case "mulc":
        case "neg":
            let md = 1;
            for (let i=0; i<exp.values.length; i++) {
                const d = getExpDim(pil, exp.values[i]);
                if (d>md) md=d;
            }
            return md;
        case "mul":
            return getExpDim(pil, exp.values[0]) + getExpDim(pil, exp.values[1])
        case "muladd":
            return Math.max(getExpDim(pil, exp.values[0]) + getExpDim(pil, exp.values[1]), getExpDim(pil, exp.values[2]));
        case "cm": return 1;
        case "const": return 1;
        case "exp": 
            if(exp.dim && exp.dim[maxDeg] >= 0) return exp.dim[maxDeg];
            if(!exp.dim) exp.dim = {};
            exp.dim[maxDeg] = getExpDim(pil, pil.expressions[exp.id]);
            return exp.dim[maxDeg];
        case "number": return 0;
        case "public": return 0;
        case "challenge": return 0;
        case "eval": return 0;
        case "x": return 1;
        default: throw new Error("Exp op not defined: " + exp.op);
    }
}
