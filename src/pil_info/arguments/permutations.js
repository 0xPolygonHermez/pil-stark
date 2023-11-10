const ExpressionOps = require("../../helpers/expressionops");
const {pilCodeGen} = require("../codegen.js");

module.exports.compressAndSelectPermutation = function compressAndSelectPermutation(res, pil) {

    const E = new ExpressionOps();

    for (let i=0; i<pil.permutationIdentities.length; i++) {
        const peCtx = {};
        const pi = pil.permutationIdentities[i];

        let tExp = null;
        const alpha = E.challenge("alpha");
        const beta = E.challenge("beta");
        for (let j=0; j<pi.t.length; j++) {
            const e = E.exp(pi.t[j]);
            if (tExp) {
                tExp = E.add(E.mul(tExp, alpha), e);
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

        peCtx.tExpId = pil.expressions.length;
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
            fExp = E.sub(fExp, beta);
            fExp = E.mul(fExp, E.exp(pi.selF));
            fExp = E.add(fExp, beta);

            fExp.idQ = pil.nQ;
            pil.nQ++;
        }

        peCtx.fExpId = pil.expressions.length;
        pil.expressions.push(fExp);

        res.peCtx.push(peCtx);
    }
}

module.exports.generatePermutationS = function generatePermutationS(res, pil, ctx) {
    const E = new ExpressionOps();

    const gamma = E.challenge("gamma");

    for (let i=0; i<pil.permutationIdentities.length; i++) {
        const pi = pil.permutationIdentities[i];
        peCtx = res.peCtx[i];

        peCtx.sId = pil.nCommitments++;

        const f = E.add(E.exp(peCtx.fExpId), gamma);
        const t = E.add(E.exp(peCtx.tExpId), gamma);

        const s = E.cm(peCtx.sId);
        const sp = E.cm(peCtx.sId, true);

        if ( typeof pil.references["Global.L1"] === "undefined") throw new Error("Global.L1 must be defined");

        const l1 = E.const(pil.references["Global.L1"].id);

        const c1 = E.mul(l1,  E.sub(s, E.number(0)));
        c1.deg=2;
        peCtx.c1Id = pil.expressions.length;
        pil.expressions.push(c1);
        pil.polIdentities.push({e: peCtx.c1Id});

        // num = t*selF - f*selT
        const num1 = pi.selF !== null ? E.mul(t, E.exp(pi.selF)) : t;
        const num2 = pi.selT !== null ? E.mul(f, E.exp(pi.selT)) : f;
        const numExp = E.sub(num1, num2); 
        peCtx.numId = pil.expressions.length;
        numExp.keep = true;
        pil.expressions.push(numExp);

        // den = f*t
        const denExp = E.mul(f, t);
        peCtx.denId = pil.expressions.length;
        denExp.keep = true;
        pil.expressions.push(denExp);
        
        //s' = s + (t*selF - f*selT) / (f*t) -> (s' - s)*(f*t) - (t*selF - f*selT) -> (s'-s)*den - num = 0;
        const c2 = E.sub(E.mul(E.sub(sp, s),  E.exp( peCtx.denId )), E.exp( peCtx.numId ));
        c2.deg=2;
        peCtx.c2Id = pil.expressions.length;
        pil.expressions.push(c2);
        pil.polIdentities.push({e: peCtx.c2Id});

        pilCodeGen(ctx, peCtx.numId, false);
        pilCodeGen(ctx, peCtx.denId, false);
    }
}


module.exports.generatePermutationZ = function generatePermutationZ(res, pil, ctx) {
    const E = new ExpressionOps();

    const gamma = E.challenge("gamma");

    for (let i=0; i<pil.permutationIdentities.length; i++) {
        peCtx = res.peCtx[i];

        peCtx.zId = pil.nCommitments++;

        const f = E.add(E.exp(peCtx.fExpId), gamma);
        const t = E.add(E.exp(peCtx.tExpId), gamma);
        const z = E.cm(peCtx.zId);
        const zp = E.cm(peCtx.zId, true);

        if ( typeof pil.references["Global.L1"] === "undefined") throw new Error("Global.L1 must be defined");

        const l1 = E.const(pil.references["Global.L1"].id);

        const c1 = E.mul(l1,  E.sub(z, E.number(1)));
        c1.deg=2;
        peCtx.c1Id = pil.expressions.length;
        pil.expressions.push(c1);
        pil.polIdentities.push({e: peCtx.c1Id});

        const numExp = f;
        peCtx.numId = pil.expressions.length;
        numExp.keep = true;
        pil.expressions.push(numExp);

        const denExp = t;
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
