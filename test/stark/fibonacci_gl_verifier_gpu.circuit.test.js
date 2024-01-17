const path = require("path");
const fs = require("fs");
const pil2circom = require("../../src/pil2circom");
const { compile } = require("pilcom");
const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true });
const proof2zkin = require("../../src/proof2zkin").proof2zkin;
const starkInfoGen = require("../../src/stark/stark_info.js")
const F3g = require("../../src/helpers/f3g");

const wasm_tester = require("circom_tester").wasm;

describe("Stark Verification Circuit Test", function () {
    let eddsa;
    let F;
    let circuit;

    this.timeout(10000000);

    before( async() => {
    });

    it("Should test circom circuit", async () => {

        const circomFile = path.join(__dirname, "../../", "tmp", "fibonacci.verifier.circom");
        const verKeyFile = path.join(__dirname, "../../","tmp", "fibonacci.verkey.json");
        const starkStructFile = path.join(__dirname, "../state_machines/sm_fibonacci", "fibonacci.starkstruct.gpu.json");
        const pilFile = path.join(__dirname, "../state_machines/sm_fibonacci", "fibonacci_main.pil");
        const proofFile = path.join(__dirname, "../../", "tmp", "fibonacci.proof.json");
        const publicsFile = path.join(__dirname, "../../", "tmp", "fibonacci.public.json")
        const zkInputFile = path.join(__dirname, "../../", "tmp", "fibonacci.zkinput.json")


        const F = new F3g("0xFFFFFFFF00000001");
        const pil = await compile(F, pilFile);
        const verKey = JSONbig.parse(await fs.promises.readFile(verKeyFile, "utf8"));
        const constRoot = [];
        for (let i=0; i<4; i++) {
            constRoot[i] = BigInt(verKey.constRoot[i]);
        }
        const starkStruct = JSON.parse(await fs.promises.readFile(starkStructFile, "utf8"));
        const publics = JSONbig.parse(await fs.promises.readFile(publicsFile, "utf8"));

        const starkInfo = starkInfoGen(pil, starkStruct);
        const circuitSrc = await pil2circom(constRoot, starkInfo);

        await fs.promises.writeFile(circomFile, circuitSrc, "utf8");

        console.log("Start compiling...");
        circuit = await wasm_tester(circomFile, {O:1, prime: "goldilocks", include: "circuits.gl"});
        console.log("End compiling...");

        const proof= JSONbig.parse( await fs.promises.readFile(proofFile, "utf8") );
        const input = proof2zkin(proof);
        input.publics = publics;

        console.log("Start wc...");
        await fs.promises.writeFile(zkInputFile, JSONbig.stringify(input, null, 1), "utf8");
        console.log("End wc...");

        const w = await circuit.calculateWitness(input, true);

    });
});
