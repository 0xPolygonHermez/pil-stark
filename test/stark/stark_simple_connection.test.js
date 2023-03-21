const chai = require("chai");
const assert = chai.assert;
const F3g = require("../../src/helpers/f3g");
const path = require("path");
const starkSetup = require("../../src/stark/helpers/stark_setup.js");
const starkGen = require("../../src/stark/helpers/stark_gen.js");
const starkVerify = require("../../src/stark/helpers/stark_verify.js");
const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");

const smGlobal = require("../state_machines/sm/sm_global.js");
const smSimpleConnection = require("../state_machines/sm_simple_connection/sm_simple_connection.js");

describe("test simple connection sm", async function () {
    this.timeout(10000000);

    it("It should create the pols main", async () => {
        const starkStruct = {
            nBits: 2,
            nBitsExt: 4,
            nQueries: 8,
            verificationHashType : "GL",
            steps: [
                {nBits: 4},
                {nBits: 2}
            ]
        };

        const F = new F3g("0xFFFFFFFF00000001");
        const pil = await compile(F, path.join(__dirname, "../state_machines/", "sm_simple_connection", "simple_connection_main.pil"));
        const constPols =  newConstantPolsArray(pil, F);

        await smGlobal.buildConstants(constPols.Global);
        await smSimpleConnection.buildConstants(F, constPols.SimpleConnection);

        const cmPols = newCommitPolsArray(pil, F);

        await smSimpleConnection.execute(cmPols.SimpleConnection);

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
