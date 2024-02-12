
const workerpool = require('workerpool');
const F3g = require("../helpers/f3g.js");
const { buildZhInv } = require("../helpers/polutils.js");



 async function starkgen_execute(ctx, cCodeSrc, n, execInfo, st_name, st_i, st_n) {

    cCode = new Function("ctx", "i", cCodeSrc);

    console.log(`start exec ${st_name}... ${st_i}/${st_n} `);
    ctx.F = new F3g();
    ctx.tmp = [];
    ctx.Zi = buildZhInv(ctx.F, ctx.nBits, ctx.extendBits, st_i);

    for (let s=0; s<execInfo.outputSections.length; s++) {
        const si = execInfo.outputSections[s];
        if (typeof ctx[si.name] == "undefined") {
            ctx[si.name] = new BigUint64Array(si.width*(n+ctx.next));
        }
    }

    for (let i=0; i<n; i++) {
        cCode(ctx, i);
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