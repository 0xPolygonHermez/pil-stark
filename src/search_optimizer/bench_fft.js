const {BigBuffer} = require("ffjavascript");


async function NTT(curve, powerOfTwo, iterations, inverse) {
    const Fr = curve.Fr;
    const domain = 2 ** powerOfTwo;

    const buffer = new BigBuffer(domain * Fr.n8);
    for (let i = 0; i < domain; i++) {
        buffer.set(Fr.e(i), i * Fr.n8);
    }

    let accTime = 0;
    let res;
    for (let i = 0; i < iterations; i++) {
        let time = performance.now();

        if (inverse) {
            res = await Fr.ifft(buffer);
        } else {
            res = await Fr.fft(buffer);
        }

        accTime = accTime + (performance.now() - time);
    }

    return accTime / iterations;
}

module.exports.fftBench = async function (curve, powerOfTwo, iterations) {
    return await NTT(curve, powerOfTwo, iterations, false);
}

module.exports.ifftBench = async function (curve, powerOfTwo, iterations) {
    return await NTT(curve, powerOfTwo, iterations, true);
}