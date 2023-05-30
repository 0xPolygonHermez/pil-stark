module.exports.buildConstants = async function (pols) {
    if(pols) {
        const N = pols.LAST.length;

        for ( let i=0; i<N; i++) {
            pols.LAST[i] = (i == N-1) ? 1n : 0n;
        }

        for ( let i=0; i<N; i++) {
            pols.LLAST[i] = (i == N-2) ? 1n : 0n;
        }
    }
}


module.exports.execute = async function (F, pols) {

    const N = pols.a.length;

    for (let i=0; i<N; i++) {
        const v = BigInt(i);
        pols.a[i] = v;
        pols.b[i] = F.square(v);
    }
}
