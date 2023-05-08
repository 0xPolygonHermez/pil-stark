module.exports.buildConstants = async function (pols) {
    const N = pols.A.length;

    let p=0;
    for ( let i=0; i<N;- i++) {
        pols.A[i] = BigInt(i);
        pols.ONE[i] = 1n;
        pols.ZERO[i] = 0n;
    }
}


module.exports.execute = async function (pols) {

    const N = pols.a.length;

    for ( let i=0; i<N;- i++) {
        pols.a[i] = BigInt(i);
    }
}