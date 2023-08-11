
const {pilCodeGen, buildCode} = require("../../codegen.js");
const ExpressionOps = require("../../expressionops");

const getKs = require("pilcom").getKs;

module.exports = function generateStage3(F, res, pil, ctx) {

    const E = new ExpressionOps();
    const gamma = E.challenge("gamma");
    const delta = E.challenge("delta");

    res.cm3_challenges = [gamma.id, delta.id];

    if (pil.permutationIdentities.length > 0) {
        const epsilon = E.challenge("epsilon");
        res.cm3_challenges.push(epsilon.id);
    }

    generatePermutationLC(res, pil, ctx);
    generatePlookupZ(res, pil, ctx);
    generatePermutationZ(res, pil, ctx);
    generateConnectionsZ(F, res, pil, ctx);


    res.step3prev = buildCode(ctx);
    ctx.calculated =  { exps: {}, expsPrime: {} }
    res.nStages++;

}



function generatePermutationLC(res, pil) {

    const E = new ExpressionOps();

    for (let i=0; i<pil.permutationIdentities.length; i++) {
        const peCtx = {};
        const pi = pil.permutationIdentities[i];

        let tExp = null;
        const gamma = E.challenge("gamma");
        const delta = E.challenge("delta");
        for (let j=0; j<pi.t.length; j++) {
            const e = E.exp(pi.t[j]);
            if (tExp) {
                tExp = E.add(E.mul(gamma, tExp), e);
            } else {
                tExp = e;
            }
        }
        if (pi.selT !== null) {
            tExp = E.sub(tExp, delta);
            tExp = E.mul(tExp, E.exp(pi.selT));
            tExp = E.add(tExp, delta);

            tExp.idQ = pil.nQ;
            pil.nQ++;
        }

        peCtx.tExpId = pil.expressions.length;
        pil.expressions.push(tExp);


        fExp = null;
        for (let j=0; j<pi.f.length; j++) {
            const e = E.exp(pi.f[j]);
            if (fExp) {
                fExp = E.add(E.mul(fExp, gamma), e);
            } else {
                fExp = e;
            }
        }
        if (pi.selF !== null) {
            fExp = E.sub(fExp, delta);
            fExp = E.mul(fExp, E.exp(pi.selF));
            fExp = E.add(fExp, delta);

            fExp.idQ = pil.nQ;
            pil.nQ++;
        }

        peCtx.fExpId = pil.expressions.length;
        pil.expressions.push(fExp);

        res.peCtx.push(peCtx);
    }
}


function generatePlookupZ(res, pil, ctx) {
    const E = new ExpressionOps();

    for (let i=0; i<pil.plookupIdentities.length; i++) {
        const puCtx = res.puCtx[i];
        puCtx.zId = pil.nCommitments++;


        const h1 = E.cm(puCtx.h1Id);
        const h2 =  E.cm(puCtx.h2Id);
        const h1p = E.cm(puCtx.h1Id, true);
        const f = E.exp(puCtx.fExpId);
        const t = E.exp(puCtx.tExpId);
        const tp = E.exp(puCtx.tExpId, true);
        const z = E.cm(puCtx.zId);
        const zp = E.cm(puCtx.zId, true);

        if ( typeof pil.references["Global.L1"] === "undefined") throw new Error("Global.L1 must be defined");

        const l1 = E.const(pil.references["Global.L1"].id);

        const c1 = E.mul(l1,  E.sub(z, E.number(1)));
        c1.deg=2;
        puCtx.c1Id = pil.expressions.length;
        pil.expressions.push(c1);
        pil.polIdentities.push({e: puCtx.c1Id});

        const gamma = E.challenge("gamma");
        const delta = E.challenge("delta");

        const numExp = E.mul(
            E.mul(
                E.add(f, gamma),
                E.add(
                    E.add(
                        t,
                        E.mul(
                            tp,
                            delta
                        )
                    ),
                    E.mul(gamma,E.add(E.number(1), delta))
                )
            ),
            E.add(E.number(1), delta)
        );
        numExp.idQ = pil.nQ++;
        puCtx.numId = pil.expressions.length;
        numExp.keep = true;
        pil.expressions.push(numExp);

        const denExp = E.mul(
            E.add(
                E.add(
                    h1,
                    E.mul(
                        h2,
                        delta
                    )
                ),
                E.mul(gamma,E.add(E.number(1), delta))
            ),
            E.add(
                E.add(
                    h2,
                    E.mul(
                        h1p,
                        delta
                    )
                ),
                E.mul(gamma,E.add(E.number(1), delta))
            )
        );
        denExp.idQ = pil.nQ++;
        puCtx.denId = pil.expressions.length;
        denExp.keep = true;
        pil.expressions.push(denExp);

        const num = E.exp(puCtx.numId);
        const den = E.exp(puCtx.denId);

        const c2 = E.sub(  E.mul(zp, den), E.mul(z, num)  );
        c2.deg=2;
        puCtx.c2Id = pil.expressions.length;
        pil.expressions.push(c2);
        pil.polIdentities.push({e: puCtx.c2Id});

        pilCodeGen(ctx, puCtx.numId, false);
        pilCodeGen(ctx, puCtx.denId, false);
    }
}


function generatePermutationZ(res, pil, ctx) {
    const E = new ExpressionOps();

    for (let i=0; i<pil.permutationIdentities.length; i++) {
        peCtx = res.peCtx[i];

        peCtx.zId = pil.nCommitments++;

        const f = E.exp(peCtx.fExpId);
        const t = E.exp(peCtx.tExpId);
        const z = E.cm(peCtx.zId);
        const zp = E.cm(peCtx.zId, true);

        if ( typeof pil.references["Global.L1"] === "undefined") throw new Error("Global.L1 must be defined");

        const l1 = E.const(pil.references["Global.L1"].id);

        const c1 = E.mul(l1,  E.sub(z, E.number(1)));
        c1.deg=2;
        peCtx.c1Id = pil.expressions.length;
        pil.expressions.push(c1);
        pil.polIdentities.push({e: peCtx.c1Id});

        const epsilon = E.challenge("epsilon");

        const numExp = E.add( f, epsilon);
        peCtx.numId = pil.expressions.length;
        numExp.keep = true;
        pil.expressions.push(numExp);

        const denExp = E.add( t, epsilon);
        peCtx.denId = pil.expressions.length;
        denExp.keep = true;
        pil.expressions.push(denExp);

        const c2 = E.sub(  E.mul(zp,  E.exp( peCtx.denId )), E.mul(z, E.exp( peCtx.numId )));
        c2.deg=2;
        peCtx.c2Id = pil.expressions.length;
        pil.expressions.push(c2);
        pil.polIdentities.push({e: peCtx.c2Id});

        pilCodeGen(ctx, peCtx.numId, false);
        pilCodeGen(ctx, peCtx.denId, false);
    }
}

function generateConnectionsZ(F, res, pil, ctx) {
    const E = new ExpressionOps();

    for (let i=0; i<pil.connectionIdentities.length; i++) {
        const ci = pil.connectionIdentities[i];
        const ciCtx = {};

        ciCtx.zId = pil.nCommitments++;

        const gamma = E.challenge("gamma");
        const delta = E.challenge("delta");

        let numExp = E.add(
            E.add(
                E.exp(ci.pols[0]),
                E.mul(delta, E.x())
            ), gamma);

        let denExp = E.add(
            E.add(
                E.exp(ci.pols[0]),
                E.mul(delta, E.exp(ci.connections[0]))
            ), gamma);

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
                            E.mul(E.mul(delta, E.number(ks[i-1])), E.x())
                        ),
                        gamma
                    )
                );
            numExp.idQ = pil.nQ++;

            const denExp =
                E.mul(
                    E.exp(ciCtx.denId),
                    E.add(
                        E.add(
                            E.exp(ci.pols[i]),
                            E.mul(delta, E.exp(ci.connections[i]))
                        ),
                        gamma
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
