const chai = require("chai");
const assert = chai.assert;
const F1Field = require("../src/f3g");
const path = require("path");
const starkSetup = require("../src/stark_setup.js");
const starkGen = require("../src/stark_gen.js");
const starkVerify = require("../src/stark_verify.js");

const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");

const smSimple = require("./sm_simple/sm_simple.js");

async function runTest(pilFile) {
    const starkStruct = {
        "nBits": 3,
        "nBitsExt": 4,
        "nQueries": 8,
        "verificationHashType": "GL",
        "steps": [
            {"nBits": 4},
            {"nBits": 3},
            {"nBits": 2}
        ]
    };

    const Fr = new F1Field("0xFFFFFFFF00000001");
    const pil = await compile(Fr, path.join(__dirname, "sm_simple", pilFile));

    const constPols =  newConstantPolsArray(pil);

    await smSimple.buildConstants(constPols.Simple);

    const cmPols = newCommitPolsArray(pil);

    const result = await smSimple.execute(cmPols.Simple);
    console.log("Result: " + result);

    const res = await verifyPil(Fr, pil, cmPols , constPols);

    if (res.length != 0) {
        console.log("Pil does not pass");
        for (let i=0; i<res.length; i++) {
            console.log(res[i]);
        }
        assert(0);
    }

    const setup = await starkSetup(constPols, pil, starkStruct);

    const resP = await starkGen(cmPols, constPols, setup.constTree, setup.starkInfo);

    const resV = await starkVerify(resP.proof, resP.publics, setup.constRoot, setup.starkInfo);

    assert(resV==true);
}

describe("simple sm", async function () {
    this.timeout(10000000);

    it("Simple1", async () => {
        await runTest("simple1.pil");
    });
    it("Simple2", async () => {
        await runTest("simple2.pil");
    });
    it("Simple3", async () => {
        await runTest("simple3.pil");
    });
    it("Simple4", async () => {
        await runTest("simple4.pil");
    });
    it("Simple4p", async () => {
        await runTest("simple4p.pil");
    });

});
