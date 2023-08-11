const chai = require("chai");
const assert = chai.assert;
const F3g = require("../../src/helpers/f3g");
const path = require("path");
const starkSetup = require("../../src/stark/stark_setup.js");
const starkGen = require("../../src/stark/stark_gen.js");
const starkVerify = require("../../src/stark/stark_verify.js");

const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");
const {log2} = require("pilcom/src/utils");


const smFibonacci = require("../state_machines/sm_fibonacci/sm_fibonacci.js");

describe("test fibonacci sm", async function () {
    this.timeout(10000000);

    it("It should create the pols main", async () => {
        const starkStruct = {
            nBits: 6,
            nBitsExt: 8,
            nQueries: 8,
            verificationHashType : "GL",
            steps: [
                {nBits: 8},
                {nBits: 3}
            ]
        };

        const F = new F3g("0xFFFFFFFF00000001");
        const pil = await compile(F, path.join(__dirname, "../state_machines/", "sm_fibonacci", "fibonacci_main.pil"));
        const constPols =  newConstantPolsArray(pil, F);
        
        let maxPilPolDeg = 0;
        for (const polRef in pil.references) {
            maxPilPolDeg = Math.max(maxPilPolDeg, pil.references[polRef].polDeg);
        }
        const N = 2**(log2(maxPilPolDeg - 1) + 1);
        await smFibonacci.buildConstants(N, constPols.Fibonacci);

        const cmPols = newCommitPolsArray(pil, F);

        const result = await smFibonacci.execute(N, cmPols.Fibonacci, [1,2], F);
        console.log("Result: " + result);

        const res = await verifyPil(F, pil, cmPols , constPols);

        if (res.length != 0) {
            console.log("Pil does not pass");
            for (let i=0; i<res.length; i++) {
                console.log(res[i]);
            }
            assert(0);
        }

        const setup = await starkSetup(constPols, pil, starkStruct, {F});

        const resP = await starkGen(cmPols, constPols, setup.constTree, setup.starkInfo);

        const resV = await starkVerify(resP.proof, resP.publics, setup.constRoot, setup.starkInfo);

        assert(resV==true);
    });

});
