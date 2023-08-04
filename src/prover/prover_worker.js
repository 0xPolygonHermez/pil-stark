
const workerpool = require('workerpool');
const F3g = require("../helpers/f3g.js");


async function proofgen_execute(ctx, stark, cFirstSrc, n, execInfo, st_name, st_i, st_n) {

    cFirst = new Function("ctx", "i", cFirstSrc);

    console.log(`start exec ${st_name}... ${st_i}/${st_n} `);
    if(stark) {
        ctx.F = new F3g();
    }
    ctx.tmp = [];

    for (let i=0; i<n; i++) {
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
        proofgen_execute: proofgen_execute,
    });
}
module.exports.proofgen_execute = proofgen_execute;