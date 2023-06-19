
const workerpool = require('workerpool');

async function fflonkgen_execute(ctx, cFirstSrc, n, execInfo, st_name, st_i, st_n) {

    cFirst = new Function("ctx", "i", cFirstSrc);

    console.log(`start exec ${st_name}... ${st_i}/${st_n} `);
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
        fflonkgen_execute: fflonkgen_execute,
    });
}

module.exports.fflonkgen_execute = fflonkgen_execute;