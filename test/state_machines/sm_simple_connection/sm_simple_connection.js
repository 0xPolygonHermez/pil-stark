const { log2, getKs } = require("pilcom/src/utils.js");

module.exports.buildConstants = async function (F, pols) {

    const N = pols.S1.length;

    const pow = log2(N);

    let w = F.one;
    const ks = getKs(F, 1);
    for (let i=0; i<N; i++) {
        pols.S1[i] = w;
        pols.S2[i] = F.mul(w, ks[0]);
        w = F.mul(w, F.w[pow]);
    }

    function connect(p1, i1, p2, i2) {
        [p1[i1], p2[i2]] = [p2[i2], p1[i1]];
    }

    for (let i=0; i<N; i++) {
        if (i%2 == 0) {
            connect(pols.S1, i, pols.S2, i/2);
        } else {
            connect(pols.S1, i, pols.S2, N/2 +  (i-1)/2);
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
}
