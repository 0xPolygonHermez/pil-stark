const {pilCodeGen, buildCode, replaceExpByIm} = require("./starkinfo_codegen.js");
const ExpressionOps = require("./expressionops.js");

module.exports = function generateConstraintPolynomial(res, pil, ctx, ctx2ns) {

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

    [res.imExps, res.qDeg] = calculateImPols(pil, cExp, (1 << (res.starkStruct.nBitsExt- res.starkStruct.nBits)) + 1);
    const m = Object.keys(res.imExps);
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
    for (let i=0; i<res.qDeg; i++) {
        res.qs[i] = pil.nCommitments++;
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

    res.step42ns = buildCode(ctx2ns);
    res.nCm4 = res.qDeg;
}

function calculateImPols(pil, _exp, maxDeg) {

    const imExpressions = {};
    const absoluteMax = maxDeg;

    [re, rd] = _calculateImPols(pil, _exp, imExpressions, maxDeg);

    console.log(`maxDeg: ${maxDeg}, nIm: ${Object.keys(re).length}, d: ${rd}`);

    return [re, rd - 1];  // We divide the exp polynomial by 1.

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
            const [e,d] = _calculateImPols(pil, pil.expressions[exp.id], imExpressions, absoluteMax);
            if (e === false) {
                return [false, -1];
            }
            if (d > maxDeg) {
                const ce = Object.assign({}, e);
                ce[exp.id] = true;
                return [ce, 1];
            } else {
                return [e, d];
            }
        } else {
            throw new Error("Exp op not defined: "+ exp.op);
        }
    }

}