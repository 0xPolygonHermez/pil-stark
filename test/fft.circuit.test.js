const chai = require("chai");
const path = require("path");
const F3g = require("../src/f3g");
const {polMulAxi} = require("../src/polutils");

const assert = chai.assert;

const wasm_tester = require("circom_tester").wasm;

describe("FFT Circuit Test", function () {
    let eddsa;
    let F;
    let circuitFFT;
    let circuitIFFT;

    this.timeout(10000000);

    before( async() => {
        circuitFFT = await wasm_tester(path.join(__dirname, "circuits", "fft.test.circom"), {O:1, prime: "goldilocks"});
        circuitIFFT = await wasm_tester(path.join(__dirname, "circuits", "ifft.test.circom"), {O:1, prime: "goldilocks"});
    });

    it("Should calculate shifted fft and shifted ifft size 8", async () => {
        const F = new F3g();

        const input={
            in: [
                [1n,2n,3n],
                [4n,5n,6n],
                [7n,8n,9n],
                [10n,11n,12n],
                [13n,14n,15n],
                [16n,17n,18n],
                [19n,20n,21n],
                [22n,23n,24n]
            ]
        };

        const w1 = await circuitFFT.calculateWitness(input, true);

        const e = [];
        for (let i=0; i<input.in.length; i++) {
            e[i] = input.in[i].slice();
        }
        polMulAxi(F, e, F.one, F.shift);
        const e2 = F.fft(e);

        await circuitFFT.assertOut(w1, {out: e2});

        const input2={
            in: e2
        };

        const w2 = await circuitIFFT.calculateWitness(input2, true);

        await circuitIFFT.assertOut(w2, {out: input.in });

    });
});
