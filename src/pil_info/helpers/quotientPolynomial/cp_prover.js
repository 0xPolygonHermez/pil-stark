const {pilCodeGen, buildCode} = require("../../codegen.js");
const ExpressionOps = require("../../expressionops");

module.exports = function generateConstraintPolynomial(res, pil, ctx, ctxExt, stark) {

    const E = new ExpressionOps();

    const vc = E.challenge("vc");
    res.challenges["Q"] = [vc.id];
    res.nChallenges++;

    if(stark) {
        const xi = E.challenge("xi");
        res.challenges["xi"] = [xi.id];
        res.nChallenges++;
    }

    let cExp = null;
    for (let i=0; i<pil.polIdentities.length; i++) {
        calculateDegreeExpressions(pil, pil.expressions[pil.polIdentities[i].e]);
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
        maxDeg = Math.pow(2,3) + 1;
    }
    let d = 2;
    let [imExps, qDeg] = calculateImPols(pil, cExp, d++);
    while(Object.keys(imExps).length > 0 && d <= maxDeg) {
        let [imExpsP, qDegP] = calculateImPols(pil, cExp, d++);
        if ((maxDeg && (Object.keys(imExpsP).length + qDegP < Object.keys(imExps).length + qDeg)) 
            || (!maxDeg && Object.keys(imExpsP).length === 0)) {
            [imExps, qDeg] = [imExpsP, qDegP];
        }
        if(Object.keys(imExpsP).length === 0) break;
    }

    console.log("Number of intermediate expressions: " + Object.keys(imExps).length);
    console.log("Q degree: " + qDeg);

    res.qDeg = qDeg;

    let imExpsList = Object.keys(imExps).map(Number);
    res.imPolsMap = {}
    for (let i=0; i<imExpsList.length; i++) {
        res.imPolsMap[imExpsList[i]] = {id: pil.nCommitments++, imPol: true};
        const e = {
            op: "sub",
            values: [
                Object.assign({}, pil.expressions[imExpsList[i]]),
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
    
    if(stark) {
        res.qs = [];
        for (let i=0; i<res.qDeg; i++) {
            res.qs[i] = pil.nCommitments++;
        }
    }

    for (let i=0; i<imExpsList.length; i++) {
        pilCodeGen(ctx, imExpsList[i]);
    }

    res.code["imPols"] = buildCode(ctx);

    // This variables are already calculated by expanding the ones in deg n
    ctxExt.calculated.exps = {};
    ctxExt.calculated.expsPrime= {};

    for(let i = 0; i < Object.keys(res.imPolsMap).length; i++) {
        const expId = Object.keys(res.imPolsMap)[i];
        ctxExt.calculated.exps[expId] = true;
        ctxExt.calculated.expsPrime[expId] = true;
    }

    pilCodeGen(ctxExt, res.cExp);
    const code = ctxExt.code[ctxExt.code.length-1].code;
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
    
    res.code["Q"] = buildCode(ctxExt);
}

function calculateImPols(pil, _exp, maxDeg) {

    const imPols = {};
    const absoluteMax = maxDeg;
    let absMaxD = 0;

    [re, rd] = _calculateImPols(pil, _exp, imPols, maxDeg);

    console.log(`maxDeg: ${maxDeg}, nIm: ${Object.keys(re).length}, d: ${rd}`);

    return [re, Math.max(rd, absMaxD) - 1];  // We divide the exp polynomial by 1.

    function _calculateImPols(pil, exp, imPols, maxDeg) {
        if (imPols === false) {
            return [false, -1];
        }
        if (["add", "sub", "neg"].indexOf(exp.op) >=0 ) {
            let md =0;
            for (let i=0; i<exp.values.length; i++) {
                [imPols , d] = _calculateImPols(pil, exp.values[i], imPols, maxDeg);
                if (d>md) md = d;
            }
            return [imPols, md];
        } else if (["number", "public", "challenge"].indexOf(exp.op) >=0 ) {
            return [imPols, 0];
        } else if (["x", "const", "cm"].indexOf(exp.op) >= 0) {
            if (maxDeg < 1) {
                return [false, -1];
            }
            return [imPols, 1];
        } else if (exp.op == "mul") {
            let eb = false;
            let ed = -1;
            if (["number", "public", "challenge"].indexOf(exp.values[0].op) >= 0 ) {
                return _calculateImPols(pil, exp.values[1], imPols, maxDeg);
            }
            if (["number", "public", "challenge"].indexOf(exp.values[1].op) >= 0 ) {
                return _calculateImPols(pil, exp.values[0], imPols, maxDeg);
            }
            const maxDegHere = exp.expDeg;
            if (maxDegHere <= maxDeg) {
                return [imPols, maxDegHere];
            }
            for (let l=0; l<=maxDeg; l++) {
                let r = maxDeg-l;
                const [e1, d1] = _calculateImPols(pil, exp.values[0], imPols, l);
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
                    if (Object.keys(eb).length == Object.keys(imPols).length) return [eb, ed];  // Cannot o it better.
                }
            }
            return [eb, ed]
        } else if (exp.op == "exp") {
            if (maxDeg < 1) {
                return [false, -1];
            }
            if (imPols[exp.id]) return [imPols, 1];
            let e,d;
            if(exp.res && exp.res[absoluteMax] && exp.res[absoluteMax][JSON.stringify(imPols)]) {
                [e,d] = exp.res[absoluteMax][JSON.stringify(imPols)];
            } else {
                [e,d] = _calculateImPols(pil, pil.expressions[exp.id], imPols, absoluteMax);
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
                exp.res[absoluteMax][JSON.stringify(imPols)] = [e, d];
                return exp.res[absoluteMax][JSON.stringify(imPols)];
            }
        } else {
            throw new Error("Exp op not defined: "+ exp.op);
        }
    }

}

function calculateDegreeExpressions(pil, exp) {
    if(exp.expDeg) return exp.expDeg;

    if (exp.op == "exp") {
        if (pil.expressions[exp.id].expDeg) exp.expDeg = pil.expressions[exp.id].expDeg;
        if (!exp.expDeg) exp.expDeg = calculateDegreeExpressions(pil, pil.expressions[exp.id]);
    } else if (["x", "cm", "const"].includes(exp.op)) {
        exp.expDeg = 1;
    } else if (["number", "challenge", "public", "eval"].includes(exp.op)) {
        exp.expDeg = 0;
    } else if(exp.op == "neg") {
        exp.expDeg = calculateDegreeExpressions(pil, exp.values[0]);
    } else if(["add", "sub"].includes(exp.op)) {
        exp.expDeg = Math.max(calculateDegreeExpressions(pil, exp.values[0]), calculateDegreeExpressions(pil, exp.values[1]));
    } else if (exp.op == "mul") {
        exp.expDeg = calculateDegreeExpressions(pil, exp.values[0]) + calculateDegreeExpressions(pil, exp.values[1]);
    } else {
        throw new Error("Exp op not defined: "+ exp.op);
    }

    return exp.expDeg;
}
