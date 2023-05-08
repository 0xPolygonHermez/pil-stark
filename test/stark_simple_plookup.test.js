const chai = require("chai");
const assert = chai.assert;
const F3g = require("../src/helpers/f3g");
const path = require("path");
const starkSetup = require("../src/stark/helpers/stark_setup.js");
const starkGen = require("../src/stark/helpers/stark_gen.js");
const starkVerify = require("../src/stark/helpers/stark_verify.js");
const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");

const smGlobal = require("./sm/sm_global.js");
const smSimplePlookup = require("./sm_simple_plookup/sm_simple_plookup.js");

describe("test plookup sm", async function () {
    this.timeout(10000000);

    it("It should create the pols main", async () => {
        const starkStruct = {
            nBits: 3,
            nBitsExt: 4,
            nQueries: 8,
            verificationHashType : "GL",
            steps: [
                {nBits: 4},
                {nBits: 2}
            ]
        };

        const Fr = new F3g("0xFFFFFFFF00000001");
        const pil = await compile(Fr, path.join(__dirname, "sm_simple_plookup", "simple_plookup_main.pil"));
        const constPols =  newConstantPolsArray(pil);

        await smGlobal.buildConstants(constPols.Global);
        await smSimplePlookup.buildConstants(constPols.SimplePlookup);

        const cmPols = newCommitPolsArray(pil);

        await smSimplePlookup.execute(cmPols.SimplePlookup);

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
