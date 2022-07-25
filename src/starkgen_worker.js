
const workerpool = require('workerpool');
const GL3 = require("./f3g.js");
const { buildZhInv } = require("./polutils.js");



 async function starkgen_execute(ctx, cFirstSrc, cISrc, cLastSrc, n, execInfo, st_name, st_i, st_n) {

    cFirst = new Function("ctx", "i", cFirstSrc);
    cI = new Function("ctx", "i", cISrc);
    cLast = new Function("ctx", "i", cLastSrc);

    console.log(`start exec ${st_name}... ${st_i}/${st_n} `);
    ctx.F = new GL3();
    ctx.tmp = [];
    ctx.Zi = buildZhInv(ctx.F, ctx.nBits, ctx.extendBits, st_i);

    for (let s=0; s<execInfo.outputSections.length; s++) {
        const si = execInfo.outputSections[s];
        if (typeof ctx[si.name] == "undefined") {
            ctx[si.name] = new BigUint64Array(si.width*(n+ctx.next));
        }
    }

    for (let i=0; i<ctx.next; i++) {
        cFirst(ctx, i);
    }
    for (let i=ctx.next; i<n-ctx.next; i++) {
        // cI(ctx, i);
        cFirst(ctx, i);
    }
    for (let i=n-ctx.next; i<n; i++) {
        // cLast(ctx, i);
        cFirst(ctx, i);
    }

    const ctxOut = {}
    for (let s=0; s<execInfo.outputSections.length; s++) {
        const si = execInfo.outputSections[s];
        ctxOut[si.name] = ctx[si.name];
    }

    console.log(`end exec ${st_name}... ${st_i}/${st_n} `);
    return ctxOut;
}

if (!workerpool.isMainThread) {
    workerpool.worker({
        starkgen_execute: starkgen_execute,
    });
}
module.exports.starkgen_execute = starkgen_execute;