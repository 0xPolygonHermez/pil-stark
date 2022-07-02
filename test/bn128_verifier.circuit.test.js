const chai = require("chai");
const path = require("path");
const fs = require("fs");

const assert = chai.assert;

const wasm_tester = require("circom_tester").wasm;
var JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true });;

describe("Poseidon Circuit Test", function () {
    let eddsa;
    let F;
    let circuit;
    let input;

    this.timeout(10000000);

    before( async() => {
        input = JSONbig.parse(await fs.promises.readFile(path.join(__dirname, "..", "tmp", "fibonacci.proof.zkin.json"),  "utf8"));
        circuit = await wasm_tester(path.join(__dirname, "..", "tmp", "fibonacci.verifier.circom"), {O:1});
    });

    it("Should calculate poseidon of all 0", async () => {


        const w = await circuit.calculateWitness(input, true);

    });
});