const ExpressionOps = require("../../helpers/expressionops");

module.exports.grandProductPermutation = function grandProductPermutation(res,pil) {
    const E = new ExpressionOps();

    const u = E.challenge("u");
    const defVal = E.challenge("defVal");
    const beta = E.challenge("beta");
    
    res.peCtx = [];
    
    for (let i=0; i<pil.permutationIdentities.length; i++) {
        const peCtx = {};
        const pi = pil.permutationIdentities[i];

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
        }

        peCtx.tExpId = pil.expressions.length;
        tExp.stage = 3;
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
            fExp = E.sub(fExp, defVal);
            fExp = E.mul(fExp, E.exp(pi.selF));
            fExp = E.add(fExp, defVal);
        }

        peCtx.fExpId = pil.expressions.length;
        fExp.stage = 3;
        pil.expressions.push(fExp);

        peCtx.zId = pil.nCommitments++;
        res.nCm3++;

        const f = E.exp(peCtx.fExpId);
        const t = E.exp(peCtx.tExpId);
        const z = E.cm(peCtx.zId);
        const zp = E.cm(peCtx.zId, true);

        if ( typeof pil.references["Global.L1"] === "undefined") throw new Error("Global.L1 must be defined");
        const l1 = E.const(pil.references["Global.L1"].id);

        const c1 = E.mul(l1,  E.sub(z, E.number(1)));

        c1.deg=2;
        peCtx.c1Id = pil.expressions.length;
        c1.stage = 3;
        pil.expressions.push(c1);
        pil.polIdentities.push({e: peCtx.c1Id});


        const numExp = E.add(f, beta);
        peCtx.numId = pil.expressions.length;
        numExp.keep = true;
        numExp.stage = 3;
        pil.expressions.push(numExp);

        const denExp = E.add( t, beta);
        peCtx.denId = pil.expressions.length;
        denExp.keep = true;
        denExp.stage = 3;
        pil.expressions.push(denExp);

        const c2 = E.sub(  E.mul(zp,  E.exp( peCtx.denId )), E.mul(z, E.exp( peCtx.numId )));
        c2.deg=2;
        c2.stage = 4;
        peCtx.c2Id = pil.expressions.length;
        pil.expressions.push(c2);
        pil.polIdentities.push({e: peCtx.c2Id});

        res.peCtx.push(peCtx);

    }
}
