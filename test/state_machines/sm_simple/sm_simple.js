module.exports.buildConstants = async function (pols) {

}


module.exports.execute = async function (F, pols, input) {

    const N = pols.a.length;

    for (let i=0; i<N; i++) {
        const v = BigInt(i);
        pols.a[i] = v;
        pols.b[i] = F.square(v);
    }
}