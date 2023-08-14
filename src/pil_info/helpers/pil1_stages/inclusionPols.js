
const {pilCodeGen, buildCode} = require("../../codegen.js");
const ExpressionOps = require("../../expressionops");


module.exports = function generateInclusionPols(stage, res, pil, ctx) {

    const E = new ExpressionOps();

    const alpha = E.challenge("alpha");
    const beta = E.challenge("beta");

    res.nChallenges += 2;

    res.nCm[stage] = 0;
    for (let i=0; i<pil.plookupIdentities.length; i++) {
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

        pilCodeGen(ctx, puCtx.fExpId, false);
        pilCodeGen(ctx, puCtx.tExpId, false);

        puCtx.h1Id = pil.nCommitments++;
        puCtx.h2Id = pil.nCommitments++;

        res.puCtx.push(puCtx);

        res.nCm[stage] += 2;
    }

    res.challenges[stage] = [alpha.id, beta.id];
    res.steps["stage" + stage] = buildCode(ctx);
    ctx.calculated =  { exps: {}, expsPrime: {} }

    res.nStages++;
}
