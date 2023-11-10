const {pilCodeGen} = require("../codegen.js");
const ExpressionOps = require("../../helpers/expressionops");

module.exports.compressAndSelectLookup = function compressAndSelectLookup(res, pil) {

    const E = new ExpressionOps();

    for (let i=0; i<pil.plookupIdentities.length; i++) {
        const puCtx = {};

        const pi = pil.plookupIdentities[i];

        puCtx.fVals = [];
        puCtx.tVals = [];

        let tExp = null;
        const alpha = E.challenge("alpha");
        const beta = E.challenge("beta");
        for (let j=0; j<pi.t.length; j++) {
            let tValExpId = pi.t[j];
            if(["neg","add", "sub", "mul", "exp"] !== pil.expressions[pi.t[j]].op) {
                tValExpId = pil.expressions.length;
                pil.expressions.push(E.exp(pi.t[j]));
            }
            const e = E.exp(tValExpId);
            if (tExp) {
                tExp = E.add(E.mul(tExp, alpha), e);
            } else {
                tExp = e;
            }

            if(pi.selT !== null) {
                let tVal = E.mul(E.exp(tValExpId), E.exp(pi.selT));
                tValExpId = pil.expressions.length;
                pil.expressions.push(tVal);
            }

            pil.expressions[tValExpId].keep = true;
            puCtx.tVals[j] = tValExpId;
        }

        if (pi.selT !== null) {
            tExp = E.sub(tExp, beta);
            tExp = E.mul(tExp, E.exp(pi.selT));
            tExp = E.add(tExp, beta);

            pil.expressions[pi.selT].keep = true;

            tExp.idQ = pil.nQ;
            pil.nQ++;
        }

        puCtx.tExpId = pil.expressions.length;
        puCtx.tSelExpId = pi.selT;
        pil.expressions.push(tExp);


        fExp = null;
        for (let j=0; j<pi.f.length; j++) {
           let fValExpId = pi.f[j];
	        if(["neg","add", "sub", "mul", "exp"] !== pil.expressions[pi.f[j]].op) {
                fValExpId = pil.expressions.length;
                pil.expressions.push(E.exp(pi.f[j]));
            }
            const e = E.exp(fValExpId);

            if (fExp) {
                fExp = E.add(E.mul(fExp, alpha), e);
            } else {
                fExp = e;
            }

            if(pi.selF !== null) {
                let fVal = E.mul(E.exp(fValExpId), E.exp(pi.selF));
                fValExpId = pil.expressions.length;
                pil.expressions.push(fVal);
            }

            pil.expressions[fValExpId].keep = true;
            puCtx.fVals[j] = fValExpId; 
        }
        if (pi.selF !== null) {
            fExp = E.sub(fExp, E.exp(puCtx.tExpId));
            fExp = E.mul(fExp, E.exp(pi.selF));
            fExp = E.add(fExp, E.exp(puCtx.tExpId));

            pil.expressions[pi.selF].keep = true;

            fExp.idQ = pil.nQ;
            pil.nQ++;
        }

        puCtx.fExpId = pil.expressions.length;
        puCtx.fSelExpId = pi.selF;
        pil.expressions.push(fExp);

        res.puCtx.push(puCtx);
    }
}


module.exports.generateLookupS = function generateLookupS(res, pil, ctx) {
    const E = new ExpressionOps();

    const gamma = E.challenge("gamma");

    for (let i=0; i<res.puCtx.length; i++) {
        const puCtx = res.puCtx[i];

        puCtx.sId = pil.nCommitments++;

        const m = E.cm(puCtx.mId);
        const f = E.add(E.exp(puCtx.fExpId), gamma);
        const t = E.add(E.exp(puCtx.tExpId), gamma);

        const s = E.cm(puCtx.sId);
        const sp = E.cm(puCtx.sId, true);

        if ( typeof pil.references["Global.L1"] === "undefined") throw new Error("Global.L1 must be defined");

        const l1 = E.const(pil.references["Global.L1"].id);

        const c1 = E.mul(l1,  E.sub(s, E.number(0)));
        c1.deg=2;
        puCtx.c1Id = pil.expressions.length;
        pil.expressions.push(c1);
        pil.polIdentities.push({e: puCtx.c1Id});

        // num = t*selF - m*f*selT
        const num1 = puCtx.fSelExpId !== null ? E.mul(t, E.exp(puCtx.fSelExpId)) : t;
        const num2 = puCtx.tSelExpId !== null ? E.mul(f, E.exp(puCtx.tSelExpId)) : f;
        pil.expressions.push(num2);
        const num2Id = pil.expressions.length-1;
        const numExp = E.sub(num1, E.mul(E.exp(num2Id), m)); 
        puCtx.numId = pil.expressions.length;
        numExp.keep = true;
        pil.expressions.push(numExp);

        // den = f*t
        const denExp = E.mul(f, t);
        puCtx.denId = pil.expressions.length;
        denExp.keep = true;
        pil.expressions.push(denExp);
        
        // s' = s + (t*selF - m*f*selT) / (f*t) -> (s' - s)*(f*t) - (t*selF - degf*selT) -> (s'-s)*den - num = 0;
        const c2 = E.sub(E.mul(E.sub(E.sub(sp, E.number(0)), E.sub(s, E.number(0))),  E.exp( puCtx.denId )), E.exp( puCtx.numId ));
        c2.deg=2;
        puCtx.c2Id = pil.expressions.length;
        pil.expressions.push(c2);
        pil.polIdentities.push({e: puCtx.c2Id});

        for(let i = 0; i < puCtx.fVals.length; i++) {
            const expId = puCtx.fVals[i];
            ctx.calculated.exps[expId] = true;
            ctx.calculated.expsPrime[expId] = true;
        }

        for(let i = 0; i < puCtx.tVals.length; i++) {
            const expId = puCtx.tVals[i];
            ctx.calculated.exps[expId] = true;
            ctx.calculated.expsPrime[expId] = true;
        }

        pilCodeGen(ctx, puCtx.numId, false);
        pilCodeGen(ctx, puCtx.denId, false);
    }
}

// This is currently not used since intermediate polynomials are not optimized
// module.exports.generateLookupMergedS = function generateLookupMergedS(res, pil, ctx) {
//     const E = new ExpressionOps();

//     const gamma = E.challenge("gamma");

//     for (let i=0; i<res.puCtx.length; i++) {
//         puCtx = res.puCtx[i];

//         puCtx.sId = pil.nCommitments++;

//         const m = E.cm(puCtx.mId);
//         const t = E.add(E.exp(puCtx.tExpId), gamma);
//         const f = [];
//         for(let k = 0; k < puCtx.fVals.length; k++) {
//             f[k] = E.add(E.exp(puCtx.fExpIds[k]), gamma);
//         }
        
//         const s = E.cm(puCtx.sId);
//         const sp = E.cm(puCtx.sId, true);

//         if ( typeof pil.references["Global.L1"] === "undefined") throw new Error("Global.L1 must be defined");

//         const l1 = E.const(pil.references["Global.L1"].id);

//         const c1 = E.mul(l1,  E.sub(s, E.number(0)));
//         c1.deg=2;
//         puCtx.c1Id = pil.expressions.length;
//         pil.expressions.push(c1);
//         pil.polIdentities.push({e: puCtx.c1Id});
        
//         let numId = pil.expressions.length;
//         for(let k = 1; k < puCtx.fVals.length; k++) {
//             let num = k === 1 ? E.mul(f[0], f[1]) : E.mul(E.exp(numId-1), f[k]);
//             pil.expressions.push(num);
//             numId++;
//         }

//         const fProdId = numId - 1; 

//         if(puCtx.tSelExpId !== null) {
//             const num = puCtx.fVals.length === 1 ? E.mul(f[0], E.exp(puCtx.tSelExpId)) : E.mul(E.exp(numId - 1), E.exp(puCtx.tSelExpId));
//             pil.expressions.push(num);
//             numId++; 
//         }
        
//         const nums = [];
//         const numSelTId = numId - 1;

//         for(let i = 0; i < puCtx.fVals.length; i++) {
//             const numSelF0 = puCtx.fSelExpIds[0] !== null ? E.mul(t, E.exp(puCtx.fSelExpIds[0])) : t;
//             pil.expressions.push(numSelF0);
//             numId++;
//             for(let k = 0; k < puCtx.fVals.length; k++) {
//                 if(k === i) continue;
//                 let num = E.mul(E.exp(numId-1), f[k]);
//                 pil.expressions.push(num);
//                 numId++;
//             }

//             nums[i] = numId - 1;
//         }

//         // num = t*selF - m*f*selT
//         let numExp = E.sub(E.exp(nums[0]), E.mul(E.exp(numSelTId), m));
//         for(let i = 1; i < puCtx.fVals.length; ++i) {
//             numExp = E.add(numExp, E.exp(nums[i]));
//         }
//         puCtx.numId = pil.expressions.length;
//         numExp.keep = true;
//         pil.expressions.push(numExp);

//         // den = f*t
//         let den = puCtx.fVals.length === 1 ? E.mul(f[0], t) : E.mul(E.exp(fProdId), t);
//         puCtx.denId = pil.expressions.length;
//         pil.expressions.push(den);
//         pil.expressions[puCtx.denId].keep = true;

//         // s' = s + (t*selF - m*f*selT) / (f*t) -> (s' - s)*(f*t) - (t*selF - degf*selT) -> (s'-s)*den - num = 0;
//         const c2 = E.sub(E.mul(E.sub(sp, E.sub(s, E.number(0))),  E.exp( puCtx.denId )), E.exp( puCtx.numId ));
//         c2.deg=2;
//         puCtx.c2Id = pil.expressions.length;
//         pil.expressions.push(c2);
//         pil.polIdentities.push({e: puCtx.c2Id});

//         for(let k = 0; k < puCtx.fVals.length; k++) {
//             const fVals = puCtx.fVals[k];
//             for(let i = 0; i < fVals.length; i++) {
//                 const expId = fVals[i];
//                 ctx.calculated.exps[expId] = true;
//                 ctx.calculated.expsPrime[expId] = true;
//             }
//         }
        

//         for(let i = 0; i < puCtx.tVals.length; i++) {
//             const expId = puCtx.tVals[i];
//             ctx.calculated.exps[expId] = true;
//             ctx.calculated.expsPrime[expId] = true;
//         }

//         pilCodeGen(ctx, puCtx.numId, false);
//         pilCodeGen(ctx, puCtx.denId, false);
//     }
// }
