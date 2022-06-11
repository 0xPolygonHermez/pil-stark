const chai = require("chai");
const path = require("path");
const fs = require("fs");
const pil2circom = require("../src/pil2circom");
const F1Field = require("../src/f3g");
const { compile } = require("zkpil");
const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true });
const proof2zkin = require("../src/proof2zkin").proof2zkin;

const assert = chai.assert;

const wasm_tester = require("circom_tester").wasm;

describe("Stark Verification Circuit Test", function () {
    let eddsa;
    let F;
    let circuit;

    this.timeout(10000000);

    before( async() => {
    });

    it("Should test circom circuit", async () => {

        const circomFile = path.join(__dirname, "..", "tmp", "fibonacci_verifier.circom");
        const verKeyFile = path.join(__dirname, "..","tmp", "fibonacci.verkey.json");
        const starkStructFile = path.join(__dirname, "sm_fibonacci", "fibonacci.starkstruct.json");
        const pilFile = path.join(__dirname, "sm_fibonacci", "fibonacci.pil");
        const proofFile = path.join(__dirname, "..", "tmp", "fibonacci.proof.json");
        const publicsFile = path.join(__dirname, "..", "tmp", "fibonacci.public.json")
        const zkInputFile = path.join(__dirname, "..", "tmp", "fibonacci.zkinput.json")


        const template = await fs.promises.readFile(path.join(__dirname, ".." , "circuitsGL", "stark_verifier.circom.ejs"), "utf8");
        const Fr = new F1Field("0xFFFFFFFF00000001");
        const pil = await compile(Fr, pilFile);
        const verKey = JSON.parse(await fs.promises.readFile(verKeyFile, "utf8"));
        const constRoot = [];
        for (let i=0; i<4; i++) {
            constRoot[i] = BigInt(verKey.constRoot[i]);
        }
        const starkStruct = JSON.parse(await fs.promises.readFile(starkStructFile, "utf8"));
        const publics = JSONbig.parse(await fs.promises.readFile(publicsFile, "utf8"));


        const circuitSrc = await pil2circom(template, pil, constRoot, starkStruct)

        await fs.promises.writeFile(circomFile, circuitSrc, "utf8");

        circuit = await wasm_tester(circomFile, {O:1, prime: "goldilocks"});

        const proof= JSONbig.parse( await fs.promises.readFile(proofFile, "utf8") );
        const input = proof2zkin(proof);
        input.publics = publics;

        await fs.promises.writeFile(zkInputFile, JSONbig.stringify(input, null, 1), "utf8");

        const w = await circuit.calculateWitness(input, true);

    });
});
