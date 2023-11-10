module.exports.buildConstants = async function (pols) {}


module.exports.execute = async function (pols) {
    const N = pols.a.length;

    for (let i=0; i<N; i++) {
        pols.a[i] = BigInt(i*i+i+1);
        pols.b[N-i-1] = pols.a[i];
    }
}