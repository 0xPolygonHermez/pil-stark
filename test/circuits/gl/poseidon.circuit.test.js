const chai = require("chai");
const path = require("path");

const assert = chai.assert;
const getPoseidon = require('../../../src/helpers/hash/poseidon/poseidon.js');


const wasm_tester = require("circom_tester").wasm;

describe("Poseidon Circuit Test", function () {
    let eddsa;
    let F;
    let circuit;

    this.timeout(10000000);

    before( async() => {
        circuit = await wasm_tester(path.join(__dirname, "circom", "poseidon.test.circom"), {O:1, prime: "goldilocks"});
    });

    it("Should calculate poseidon of all 0", async () => {

        const input={
            in: [0,0,0,0,0,0,0,0],
            capacity: [0,0,0,0]
        };

        const w = await circuit.calculateWitness(input, true);
        const poseidon = await getPoseidon();
        
        const res = poseidon([0, 0, 0, 0, 0, 0, 0, 0]);
        await circuit.assertOut(w, {out: res });
    });
});
