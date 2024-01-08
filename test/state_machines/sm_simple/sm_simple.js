const F3g = require("../../../src/helpers/f3g.js");

module.exports.buildConstants = async function (pols) {

}


module.exports.execute = async function (pols, input) {

    const N = pols.a.length;

    const F = new F3g("0xFFFFFFFF00000001");

    for (let i=0; i<N; i++) {
        const v = BigInt(i);
        pols.a[i] = v;
        pols.b[i] = F.square(v);
    }
}