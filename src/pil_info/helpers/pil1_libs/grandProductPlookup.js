const ExpressionOps = require("../../expressionops");

module.exports.grandProductPlookup = function grandProductPlookup(res, pil) {
    const E = new ExpressionOps();

    const alpha = E.challenge("stage1_challenge0");
    const beta = E.challenge("stage1_challenge1");
    const gamma = E.challenge("stage2_challenge0");
    const delta = E.challenge("stage2_challenge1");


    for (let i=0; i<pil.plookupIdentities.length; i++) {
        const name = `Plookup${i}`;
        res.libs[name] = [];

        const puCtx = {};
        const pi = pil.plookupIdentities[i];

        let tExp = null;
        for (let j=0; j<pi.t.length; j++) {
            const e = E.exp(pi.t[j]);
            if (tExp) {
                tExp = E.add(E.mul(alpha, tExp), e);
            } else {
                tExp = e;
            }
        }
        if (pi.selT !== null) {
            tExp = E.sub(tExp, beta);
            tExp = E.mul(tExp, E.exp(pi.selT));
            tExp = E.add(tExp, beta);

            tExp.idQ = pil.nQ;
            pil.nQ++;
        }

        puCtx.tExpId = pil.expressions.length;
        tExp.keep = true;
        pil.expressions.push(tExp);


        fExp = null;
        for (let j=0; j<pi.f.length; j++) {
            const e = E.exp(pi.f[j]);
            if (fExp) {
                fExp = E.add(E.mul(fExp, alpha), e);
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
        pil.expressions.push(fExp);

        puCtx.h1Id = pil.nCommitments++;
        puCtx.h2Id = pil.nCommitments++;
        
        const stage1 = {
            pols: {
                f: {id: puCtx.fExpId, tmp: true},
                t: {id: puCtx.tExpId, tmp: true},
                h1: {id: puCtx.h1Id},
                h2: {id: puCtx.h2Id},
            },
            hints: [
                {
                    inputs: ["f", "t"], 
                    outputs: ["h1", "h2"], 
                    lib: "calculateH1H2"
                }
            ]
        }
        res.libs[name].push(stage1);
        
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
        pil.expressions.push(c1);
        pil.polIdentities.push({e: pil.expressions.length - 1});


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
        pil.expressions.push(c2);
        pil.polIdentities.push({e: pil.expressions.length - 1});

        const stage2 = {
            pols: {
                num: {id: puCtx.numId, tmp: true},
                den: {id: puCtx.denId, tmp: true},
                z: {id: puCtx.zId},
            },
            hints: [
                {
                    inputs: ["num", "den"], 
                    outputs: ["z"], 
                    lib: "calculateZ"
                }
            ]

        }
        res.libs[name].push(stage2);
    }
}
