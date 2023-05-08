const path = require("path");
const F3g = require("../../../src/helpers/f3g");

const wasm_tester = require("circom_tester").wasm;

describe("FFT Circuit Test", function () {
    let circuitFFT;
    let circuitIFFT;

    this.timeout(10000000);

    before( async() => {
        circuitFFT = await wasm_tester(path.join(__dirname, "circom", "fft.bn128.test.circom"), {O:1, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
        circuitIFFT = await wasm_tester(path.join(__dirname, "circom", "ifft.bn128.test.circom"), {O:1, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
    });

    it("Should calculate shifted fft and shifted ifft size 8", async () => {
        const F = new F3g();

        const v = [
            [1n,2n,3n],
            [4n,5n,6n],
            [7n,8n,9n],
            [10n,11n,12n],
            [13n,14n,15n],
            [16n,17n,18n],
            [19n,20n,21n],
            [22n,23n,24n]
        ];

        const input={
            in: v
        };

        const inFFT = F.fft(v);

        const w1 = await circuitFFT.calculateWitness(input, true);

        await circuitFFT.assertOut(w1, {out: inFFT});

        const input2 = {
            in: inFFT
        };

        const w2 = await circuitIFFT.calculateWitness(input2, true);

        await circuitIFFT.assertOut(w2, {out: v});

    });
});
