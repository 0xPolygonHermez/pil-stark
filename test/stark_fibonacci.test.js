const chai = require("chai");
const assert = chai.assert;
const F1Field = require("../src/f3g");
const path = require("path");
const starkSetup = require("../src/stark_setup.js");
const starkGen = require("../src/stark_gen.js");
const starkVerify = require("../src/stark_verify.js");

const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");

const smFibonacci = require("./sm_fibonacci/sm_fibonacci.js");

describe("test fibonacci sm", async function () {
    this.timeout(10000000);

    it("It should create the pols main", async () => {
        const starkStruct = {
            nBits: 10,
            nBitsExt: 11,
            nQueries: 8,
            verificationHashType : "GL",
            steps: [
                {nBits: 11},
                {nBits: 3}
            ]
        };

        const Fr = new F1Field("0xFFFFFFFF00000001");
        const pil = await compile(Fr, path.join(__dirname, "sm_fibonacci", "fibonacci_main.pil"));
        const constPols =  newConstantPolsArray(pil);

        await smFibonacci.buildConstants(constPols.Fibonacci);

        const cmPols = newCommitPolsArray(pil);

        const result = await smFibonacci.execute(cmPols.Fibonacci, [1,2]);
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
    });

});
