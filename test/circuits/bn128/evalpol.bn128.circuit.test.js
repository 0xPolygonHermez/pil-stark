const chai = require("chai");
const path = require("path");
const {evalPol} = require("../../../src/helpers/polutils");
const F3g = require("../../../src/helpers/f3g");


const assert = chai.assert;

const wasm_tester = require("circom_tester").wasm;


describe("EvalPol Circuit Test", function () {
    let eddsa;
    let F;
    let circuit;

    this.timeout(10000000);

    before( async() => {
        circuit = await wasm_tester(path.join(__dirname, "circom", "evalpol.bn128.test.circom"), {O:1, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
    });

    it("Should calculate polynomial evaluation selector", async () => {
        const F = new F3g();

        const nBits = 5;
        const N = 1 << nBits;

        const pol = [];
        for (let j=0; j<N; j++) {
            pol[j] = [];
            for (let k=0; k<3; k++) {
                pol[j][k] = BigInt(k*100+j);
            }
        }
        const x = [555n, 666n, 777n];

        const input={
            pol: pol,
            x: x
        };

        const res = evalPol(F, pol, x);

        const w1 = await circuit.calculateWitness(input, true);

        await circuit.assertOut(w1, {out: res});
    });
});
