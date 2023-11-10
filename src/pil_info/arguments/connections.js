const {pilCodeGen} = require("../codegen.js");
const ExpressionOps = require("../../helpers/expressionops");
const getKs = require("pilcom").getKs;
const F3g = require("../../helpers/f3g.js");

module.exports.generateConnectionsZ = function generateConnectionsZ(res, pil, ctx) {
    const E = new ExpressionOps();
    const F = new F3g();

    for (let i=0; i<pil.connectionIdentities.length; i++) {
        const ci = pil.connectionIdentities[i];
        const ciCtx = {};

        ciCtx.zId = pil.nCommitments++;

        const alpha = E.challenge("alpha");
        const beta = E.challenge("beta");

        let numExp = E.add(
            E.add(
                E.exp(ci.pols[0]),
                E.mul(alpha, E.x())
            ), beta);

        let denExp = E.add(
            E.add(
                E.exp(ci.pols[0]),
                E.mul(alpha, E.exp(ci.connections[0]))
            ), beta);

        ciCtx.numId = pil.expressions.length;
        numExp.keep = true;
        pil.expressions.push(numExp);

        ciCtx.denId = pil.expressions.length;
        denExp.keep = true;
        pil.expressions.push(denExp);

        let ks = getKs(F, ci.pols.length-1);
        for (let i=1; i<ci.pols.length; i++) {
            const numExp =
                E.mul(
                    E.exp(ciCtx.numId),
                    E.add(
                        E.add(
                            E.exp(ci.pols[i]),
                            E.mul(E.mul(alpha, E.number(ks[i-1])), E.x())
                        ),
                        beta
                    )
                );
            numExp.idQ = pil.nQ++;

            const denExp =
                E.mul(
                    E.exp(ciCtx.denId),
                    E.add(
                        E.add(
                            E.exp(ci.pols[i]),
                            E.mul(alpha, E.exp(ci.connections[i]))
                        ),
                        beta
                    )
                );
            denExp.idQ = pil.nQ++;

            ciCtx.numId = pil.expressions.length;
            pil.expressions.push(numExp);

            ciCtx.denId = pil.expressions.length;
            pil.expressions.push(denExp);
        }

        const z = E.cm(ciCtx.zId);
        const zp = E.cm(ciCtx.zId, true);

        if ( typeof pil.references["Global.L1"] === "undefined") throw new Error("Global.L1 must be defined");

        const l1 = E.const(pil.references["Global.L1"].id);

        const c1 = E.mul(l1,  E.sub(z, E.number(1)));
        c1.deg=2;
        ciCtx.c1Id = pil.expressions.length;
        pil.expressions.push(c1);
        pil.polIdentities.push({e: ciCtx.c1Id});


        const c2 = E.sub(  E.mul(zp,  E.exp( ciCtx.denId )), E.mul(z, E.exp( ciCtx.numId )));
        c2.deg=2;
        ciCtx.c2Id = pil.expressions.length;
        pil.expressions.push(c2);
        pil.polIdentities.push({e: ciCtx.c2Id});

        pilCodeGen(ctx, ciCtx.numId, false);
        pilCodeGen(ctx, ciCtx.denId, false);

        res.ciCtx.push(ciCtx);
    }
}
