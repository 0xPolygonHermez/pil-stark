const path = require("path");
const fs = require("fs");

const wasm_tester = require("circom_tester").wasm;
var JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true });;

describe("Fibonacci bn128 Verifier circuit Tester", function () {
    let eddsa;
    let F;
    let circuit;
    let input;

    this.timeout(10000000);

    before( async() => {
        input = JSONbig.parse(await fs.promises.readFile(path.join(__dirname, "../../", "tmp", "fibonacci.c12.proof.zkin.json"),  "utf8"));
        circuit = await wasm_tester(path.join(__dirname, "../../", "tmp", "fibonacci.c12.verifier.circom"), {O:1, verbose:true, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
    });

    it("Should calculate Fibonacci witness", async () => {


        const w = await circuit.calculateWitness(input, true);

    });
});
