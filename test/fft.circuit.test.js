const chai = require("chai");
const path = require("path");
const F3g = require("../src/f3g");
const {polMulAxi} = require("../src/polutils");

const assert = chai.assert;

const wasm_tester = require("circom_tester").wasm;

describe("FFT Circuit Test", function () {
    let eddsa;
    let F;
    const circuitFFT = [];
    const circuitIFFT = [];

    this.timeout(10000000);

    before( async() => {
        for (let i=0; i<=7; i++) {
            circuitFFT[i] = await wasm_tester(path.join(__dirname, "circuits", `fft${i}.test.circom`), {O:1, prime: "goldilocks"});
            circuitIFFT[i] = await wasm_tester(path.join(__dirname, "circuits", `fft${i}i.test.circom`), {O:1, prime: "goldilocks"});
        }
    });

    async function testFFT(nBits) {
        const F = new F3g();

        const input={
            in: []
        };

        const N=1 << nBits;
        let p=1n;
        for (let i=0; i<N; i++) {
            input.in[i] = [];
            for (let j=0; j<3; j++) {
                input.in[i][j] = p++;
            }
        }

        const w1 = await circuitFFT[nBits].calculateWitness(input, true);

        const e = [];
        for (let i=0; i<input.in.length; i++) {
            e[i] = input.in[i].slice();
        }
        const e2 = F.fft(e);
        const e3 = F.ifft(e2);
        for (let i=0; i<input.in.length; i++) {
            assert(F.eq(e3[i], input.in[i]));
        }


        await circuitFFT[nBits].assertOut(w1, {out: e2});

        const input2={
            in: e2
        };

        const w2 = await circuitIFFT[nBits].calculateWitness(input2, true);

        await circuitIFFT[nBits].assertOut(w2, {out: input.in });
    }

    for (let i=0; i<=7; i++) {
        it(`Should fft and ifft size ${1<<i}`, async () => {
            await testFFT(i);
        });
    }
});
