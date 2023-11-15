
const {pilCodeGen, buildCode} = require("./codegen.js");
const ExpressionOps = require("../helpers/expressionops");


module.exports = function generateFRIPolynomial(res, pil, ctx2ns) {
    const E = new ExpressionOps();

    const vf1 = E.challenge("vf1");
    const vf2 = E.challenge("vf2");

    let friExp = null;
    for (let i=0; i<pil.nCommitments; i++) {
        if (friExp) {
            friExp = E.add(E.mul(vf1, friExp), E.cm(i));
        } else {
            friExp = E.cm(i);
        }
    }

    let fri1exp = null;
    let fri2exp = null;
    let frimzexp = null;
    let frimwzexp = null;
    for (let i=0; i<res.evMap.length; i++) {
        const ev = res.evMap[i];
        
        let friExpression;
        let eval;
        if(ev.stage === 1) {
            friExpression = ev.prime ? frimwzexp : frimzexp;
            const evalRIndex = res.evMap.filter(e => e.stage === 1).findIndex(e => JSON.stringify(e) === JSON.stringify(ev));
            eval = E.evalR(evalRIndex);
        } else {
            friExpression = ev.prime ? fri2exp : fri1exp;
            eval = E.eval(i);
        }
        const e = E[ev.type](ev.id);
        if (friExpression) {
            friExpression = E.add(E.mul(friExpression, vf2), E.sub(e,  eval));
        } else {
            friExpression = E.sub(e,  eval);
        }

        if(ev.stage === 1) {
            if (ev.prime) {
                frimwzexp = friExpression;
            } else {
                frimzexp = friExpression;
            }
        } else {
            if (ev.prime) {
                fri2exp = friExpression;
            } else {
                fri1exp = friExpression;
            }
        }
    }


    if (fri1exp) {
        fri1exp = E.mul(fri1exp, E.xDivXSubXi() );
        if (friExp) {
            friExp = E.add(E.mul(vf1, friExp),  fri1exp );
        } else {
            friExp = fri1exp;
        }
    }

    if (fri2exp) {
        fri2exp =  E.mul(fri2exp, E.xDivXSubWXi() );
        if (friExp) {
            friExp = E.add(E.mul(vf1, friExp),  fri2exp );
        } else {
            friExp = fri2exp;
        }
    }

    if (frimzexp) {
        frimzexp = E.mul(frimzexp, E.mz() );
        if (friExp) {
            friExp = E.add(E.mul(vf1, friExp),  frimzexp );
        } else {
            friExp = frimzexp;
        }
    }

    if (frimwzexp) {
        frimwzexp = E.mul(frimwzexp, E.mz() );
        if (friExp) {
            friExp = E.add(E.mul(vf1, friExp),  frimwzexp );
        } else {
            friExp = frimwzexp;
        }
    }

    res.friExpId = pil.expressions.length;
    friExp.keep2ns = true;
    pil.expressions.push(friExp);

    pilCodeGen(ctx2ns, res.friExpId, false, "f");

    const code = ctx2ns.code[ctx2ns.code.length-1].code;

    code[code.length-1].dest = { type: "f", id: 0 };

    res.step52ns = buildCode(ctx2ns);

}
