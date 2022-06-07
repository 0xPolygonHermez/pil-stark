const chai = require("chai");
const path = require("path");

const assert = chai.assert;

const wasm_tester = require("circom_tester").wasm;

describe("Poseidon Circuit Test", function () {
    let eddsa;
    let F;
    let circuit;

    this.timeout(10000000);

    before( async() => {
        circuit = await wasm_tester(path.join(__dirname, "circuits", "poseidon.test.circom"), {O:1, prime: "goldilocks"});
    });

    it("Should calculate poseidon of all 0", async () => {

        const input={
            in: [0,0,0,0,0,0,0,0],
            capacity: [0,0,0,0]
        };

        const w = await circuit.calculateWitness(input, true);

        await circuit.assertOut(w, {out: [ 0x3c18a9786cb0b359n, 0xc4055e3364a246c3n, 0x7953db0ab48808f4n, 0xc71603f33a1144can] });
    });
});
