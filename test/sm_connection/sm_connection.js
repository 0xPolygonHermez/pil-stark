const F1Field = require("../../src/f3g.js");
const {log2} = require("../../src/utils.js");

module.exports.buildConstants = async function (pols, polsDef) {
    const F = new F1Field("0xFFFFFFFF00000001");

    const N = Number(polsDef.S1.polDeg);

    const pow = log2(N);

    let w = F.one;
    const k1 = F.k;
    const k2= F.mul(F.k, F.k);
    for (let i=0; i<N; i++) {
        pols.S1[i] = w;
        pols.S2[i] = F.mul(w, k1);
        pols.S3[i] = F.mul(w, k2);
        w = F.mul(w, F.w[pow]);
    }

    function connect(p1, i1, p2, i2) {
        [p1[i1], p2[i2]] = [p2[i2], p1[i1]];
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


module.exports.execute = async function (pols, polsDef) {


    const N = Number(polsDef.a.polDeg);


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