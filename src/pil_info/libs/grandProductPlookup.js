const ExpressionOps = require("../../helpers/expressionops");

module.exports.grandProductPlookup = function grandProductPlookup(res, pil) {
    const E = new ExpressionOps();

    const u = E.challenge("u");
    const defVal = E.challenge("defVal");
    const gamma = E.challenge("gamma");
    const beta = E.challenge("beta");

    res.puCtx = [];
    for (let i=0; i<pil.plookupIdentities.length; i++) {
        const puCtx = {};
        const pi = pil.plookupIdentities[i];

        let tExp = null;
        for (let j=0; j<pi.t.length; j++) {
            const e = E.exp(pi.t[j]);
            if (tExp) {
                tExp = E.add(E.mul(u, tExp), e);
            } else {
                tExp = e;
            }
        }
        if (pi.selT !== null) {
            tExp = E.sub(tExp, defVal);
            tExp = E.mul(tExp, E.exp(pi.selT));
            tExp = E.add(tExp, defVal);

            tExp.idQ = pil.nQ;
            pil.nQ++;
        }

        puCtx.tExpId = pil.expressions.length;
        tExp.keep = true;
        tExp.stage = 2;
        pil.expressions.push(tExp);

        fExp = null;
        for (let j=0; j<pi.f.length; j++) {
            const e = E.exp(pi.f[j]);
            if (fExp) {
                fExp = E.add(E.mul(fExp, u), e);
            } else {
                fExp = e;
            }
        }
        if (pi.selF !== null) {
            fExp = E.sub(fExp, E.exp(puCtx.tExpId));
            fExp = E.mul(fExp, E.exp(pi.selF));
            fExp = E.add(fExp, E.exp(puCtx.tExpId));

            fExp.idQ = pil.nQ;
            pil.nQ++;
        }

        puCtx.fExpId = pil.expressions.length;
        fExp.keep = true;
        fExp.stage = 2;
        pil.expressions.push(fExp);

        puCtx.h1Id = pil.nCommitments++;
        puCtx.h2Id = pil.nCommitments++;
        res.nCm2+=2;

        res.puCtx.push(puCtx);
    }

    for (let i=0; i<pil.plookupIdentities.length; i++) {
        const puCtx = res.puCtx[i];
        puCtx.zId = pil.nCommitments++;
        res.nCm3++;

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
        c1.stage = 4;
        puCtx.c1Id = pil.expressions.length;
        pil.expressions.push(c1);
        pil.polIdentities.push({e: puCtx.c1Id});

        const numExp = E.mul(
            E.mul(
                E.add(f, gamma),
                E.add(
                    E.add(
                        t,
                        E.mul(
                            tp,
                            beta
                        )
                    ),
                    E.mul(gamma,E.add(E.number(1), beta))
                )
            ),
            E.add(E.number(1), beta)
        );
        puCtx.numId = pil.expressions.length;
        numExp.keep = true;
        numExp.stage = 3;
        pil.expressions.push(numExp);

        const denExp = E.mul(
            E.add(
                E.add(
                    h1,
                    E.mul(
                        h2,
                        beta
                    )
                ),
                E.mul(gamma,E.add(E.number(1), beta))
            ),
            E.add(
                E.add(
                    h2,
                    E.mul(
                        h1p,
                        beta
                    )
                ),
                E.mul(gamma,E.add(E.number(1), beta))
            )
        );
        puCtx.denId = pil.expressions.length;
        denExp.keep = true;
        denExp.stage = 3;
        pil.expressions.push(denExp);

        const num = E.exp(puCtx.numId);
        const den = E.exp(puCtx.denId);

        const c2 = E.sub(  E.mul(zp, den), E.mul(z, num)  );
        c2.deg=2;
        c2.stage = 4;
        puCtx.c2Id = pil.expressions.length;
        pil.expressions.push(c2);
        pil.polIdentities.push({e: puCtx.c2Id});
    }
}
