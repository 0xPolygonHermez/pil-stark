const F1Field = require("../../src/f3g");

module.exports.buildConstants = async function (pols) {

}


module.exports.execute = async function (pols, input) {

    const N = pols.a.length;

    const Fr = new F1Field("0xFFFFFFFF00000001");

    for (let i=0; i<N; i++) {
        const v = BigInt(i);
        pols.a[i] = v;
        pols.b[i] = Fr.square(v);
    }
}