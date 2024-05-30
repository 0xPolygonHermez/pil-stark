
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
    for (let i=0; i<res.evMap.length; i++) {
        const ev = res.evMap[i];
        let friExp = ev.prime ? fri2exp : fri1exp;
        const e = E[ev.type](ev.id);
        if (friExp) {
            friExp = E.add(E.mul(friExp, vf2), E.sub(e,  E.eval(i)));
        } else {
            friExp = E.sub(e,  E.eval(i));
        }
        if (ev.prime) {
            fri2exp = friExp;
        } else {
            fri1exp = friExp;
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

    res.friExpId = pil.expressions.length;
    pil.expressions.push(friExp);

    pilCodeGen(ctx2ns, res.friExpId);

    const code = ctx2ns.code[ctx2ns.code.length-1].code;

    code[code.length-1].dest = { type: "f", id: 0 };

    res.step52ns = buildCode(ctx2ns);

}
