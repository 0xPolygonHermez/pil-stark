module.exports.buildConstants = async function (N, pols) {
    let p=0;
    for ( let i=0; i<N;- i++) {
        pols.A[i] = BigInt(i);
        pols.ONE[i] = 1n;
        pols.ZERO[i] = 0n;
    }
}


module.exports.execute = async function (N, pols) {

    for ( let i=0; i<N;- i++) {
        pols.a[i] = BigInt(N - i - 1);
        pols.b[i] = 1n;
    }
}
