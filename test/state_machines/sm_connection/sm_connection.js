const F3g = require("../../../src/helpers/f3g.js");
const { log2, getKs } = require("pilcom/src/utils.js");
const { connect } = require("../../../src/helpers/polutils.js");

module.exports.buildConstants = async function (pols) {
    const F = new F3g("0xFFFFFFFF00000001");

    const N = pols.S1.length;

    const pow = log2(N);

    let w = F.one;
    const ks = getKs(F, 2);
    for (let i=0; i<N; i++) {
        pols.S1[i] = w;
        pols.S2[i] = F.mul(w, ks[0]);
        pols.S3[i] = F.mul(w, ks[1]);
        w = F.mul(w, F.w[pow]);
    }

    for (let i=0; i<N; i++) {
        if (i%2 == 0) {
            connect(pols.S1, i, pols.S2, i/2);
            connect(pols.S2, i, pols.S3, i/2);
        } else {
            connect(pols.S1, i, pols.S2, N/2 +  (i-1)/2);
            connect(pols.S2, i, pols.S3, N/2 +  (i-1)/2);
        }
    }

}


module.exports.execute = async function (pols) {

    const N = pols.a.length;


    for (let i=0; i<N; i++) {
        pols.a[i] = BigInt(i);
    }

    for (let i=0; i<N; i++) {
        if (i<N/2) {
            pols.b[i] = pols.a[i*2];
        } else {
            pols.b[i] = pols.a[(i-N/2)*2+1 ];
        }
    }

    for (let i=0; i<N; i++) {
        if (i<N/2) {
            pols.c[i] = pols.b[i*2];
        } else {
            pols.c[i] = pols.b[(i-N/2)*2+1 ];
        }
    }

}