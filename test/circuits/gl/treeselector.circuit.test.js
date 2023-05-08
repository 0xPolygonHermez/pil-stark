const chai = require("chai");
const path = require("path");

const wasm_tester = require("circom_tester").wasm;

function getBits(idx, nBits) {
    res = [];
    for (let i=0; i<nBits; i++) {
        res[i] = (idx >> i)&1 ? 1n : 0n;
    }
    return res;
}

describe("TreeSelector Circuit Test", function () {
    let eddsa;
    let F;
    let circuit;

    this.timeout(10000000);

    before( async() => {
        circuit = await wasm_tester(path.join(__dirname, "circom", "treeselector.test.circom"), {O:1, prime: "goldilocks"});
    });

    it("Should calculate tree selector", async () => {
        const nBits = 5;
        const idx = 9;
        const N = 1 << nBits;

        const values = [];
        for (let j=0; j<N; j++) {
            values[j] = [];
            for (let k=0; k<3; k++) {
                values[j][k] = BigInt(k*100+j);
            }
        }

        const input={
            values: values,
            key: getBits(idx, nBits)
        };
        const w1 = await circuit.calculateWitness(input, true);

        await circuit.assertOut(w1, {out: values[idx]});
    });
});
