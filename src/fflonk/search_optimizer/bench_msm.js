const { Polynomial } = require("shplonkjs");


module.exports.msmBench = async function (curve, PTau, powerOfTwo, iterations) {
    const Fr = curve.Fr;
    const domain = Math.pow(2, powerOfTwo);

    const buffer = new Uint8Array(domain * Fr.n8);
    for (let i = 0; i < domain; i++) {
        buffer.set(Fr.e(i), i * Fr.n8);
    }
    let pol = new Polynomial(buffer, curve);

    let accTime = 0;
    for (let i = 0; i < iterations; i++) {
        let time = performance.now();

        const commitment = await pol.multiExponentiation(PTau, "commitment");

        accTime = accTime + (performance.now() - time);
    }

    return accTime / iterations;
}