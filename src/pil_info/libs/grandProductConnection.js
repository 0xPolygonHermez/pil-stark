
const ExpressionOps = require("../../helpers/expressionops");

const getKs = require("pilcom").getKs;

module.exports.grandProductConnection = function grandProductConnection(res, pil, F) {
    const E = new ExpressionOps();

    const gamma = E.challenge("gamma");
    const beta = E.challenge("beta");

    res.ciCtx = [];
    for (let i=0; i<pil.connectionIdentities.length; i++) {
        const ci = pil.connectionIdentities[i];
        const ciCtx = {};

        ciCtx.zId = pil.nCommitments++;
        res.nCm3++;

        let numExp = E.add(
            E.add(
                E.exp(ci.pols[0]),
                E.mul(beta, E.x())
            ), gamma);

        let denExp = E.add(
            E.add(
                E.exp(ci.pols[0]),
                E.mul(beta, E.exp(ci.connections[0]))
            ), gamma);
        
        ciCtx.numId = pil.expressions.length;
        numExp.stage = 3;
        pil.expressions.push(numExp);

        ciCtx.denId = pil.expressions.length;
        denExp.stage = 3;
        pil.expressions.push(denExp);

        let ks = getKs(F, ci.pols.length-1);
        for (let i=1; i<ci.pols.length; i++) {
            const numExp =
                E.mul(
                    E.exp(ciCtx.numId),
                    E.add(
                        E.add(
                            E.exp(ci.pols[i]),
                            E.mul(E.mul(beta, E.number(ks[i-1])), E.x())
                        ),
                        gamma
                    )
                );

            const denExp =
                E.mul(
                    E.exp(ciCtx.denId),
                    E.add(
                        E.add(
                            E.exp(ci.pols[i]),
                            E.mul(beta, E.exp(ci.connections[i]))
                        ),
                        gamma
                    )
                );

            ciCtx.numId = pil.expressions.length;
            numExp.stage = 3;
            numExp.keep = true;
            pil.expressions.push(numExp);

            ciCtx.denId = pil.expressions.length;
            denExp.stage = 3;
            denExp.keep = true;
            pil.expressions.push(denExp);
        }

        const z = E.cm(ciCtx.zId);
        const zp = E.cm(ciCtx.zId, true);

        if ( typeof pil.references["Global.L1"] === "undefined") throw new Error("Global.L1 must be defined");
        const l1 = E.const(pil.references["Global.L1"].id);

        const c1 = E.mul(l1,  E.sub(z, E.number(1)));
        c1.deg=2;
        ciCtx.c1Id = pil.expressions.length;
        c1.stage = 4;
        pil.expressions.push(c1);
        pil.polIdentities.push({e: ciCtx.c1Id});

        const c2 = E.sub(  E.mul(zp,  E.exp( ciCtx.denId )), E.mul(z, E.exp( ciCtx.numId )));
        c2.deg=2;
        c2.stage = 4;
        ciCtx.c2Id = pil.expressions.length;
        pil.expressions.push(c2);
        pil.polIdentities.push({e: ciCtx.c2Id});

        res.ciCtx.push(ciCtx);
    }
}
