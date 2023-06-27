module.exports.buildConstants = async function (pols) {
    if(pols) {
        const N = pols.LAST[0].length;

        for ( let i=0; i<N; i++) {
            pols.LAST[0][i] = (i == N-1) ? 1n : 0n;
            pols.LAST[1][i] = (i == N-2) ? 1n : 0n;
        }
    }
}


module.exports.execute = async function (F, pols, isArray = false) {

    const N = pols.b.length;

    for (let i=0; i<N; i++) {
        const v = BigInt(i);
        if(isArray) {
            pols.a[0][i] = v;
            pols.a[1][i] = v;
        } else {
            pols.a[i] = v;
        }
        pols.b[i] = F.square(v);
    }
}
