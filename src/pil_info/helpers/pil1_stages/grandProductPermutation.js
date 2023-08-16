const ExpressionOps = require("../../expressionops");

module.exports.grandProductPermutation = function grandProductPermutation(res, pil) {
    const E = new ExpressionOps();

    const gamma = E.challenge("gamma");
    const delta = E.challenge("delta");
    const epsilon = E.challenge("epsilon");

    for (let i=0; i<pil.permutationIdentities.length; i++) {
        const peCtx = {};
        const pi = pil.permutationIdentities[i];

        let tExp = null;
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

        peCtx.zId = pil.nCommitments++;

        const f = E.exp(peCtx.fExpId);
        const t = E.exp(peCtx.tExpId);
        const z = E.cm(peCtx.zId);
        const zp = E.cm(peCtx.zId, true);

        if ( typeof pil.references["Global.L1"] === "undefined") throw new Error("Global.L1 must be defined");

        const l1 = E.const(pil.references["Global.L1"].id);

        const c1 = E.mul(l1,  E.sub(z, E.number(1)));
        c1.deg=2;
        pil.expressions.push(c1);
        pil.polIdentities.push({e: pil.expressions.length - 1});

        const numExp = E.add(f, epsilon);
        peCtx.numId = pil.expressions.length;
        numExp.keep = true;
        pil.expressions.push(numExp);

        const denExp = E.add(t, epsilon);
        peCtx.denId = pil.expressions.length;
        denExp.keep = true;
        pil.expressions.push(denExp);

        const c2 = E.sub(  E.mul(zp,  E.exp( peCtx.denId )), E.mul(z, E.exp( peCtx.numId )));
        c2.deg=2;
        pil.expressions.push(c2);
        pil.polIdentities.push({e: pil.expressions.length - 1});

        res.peCtx.push(peCtx);
    }
}