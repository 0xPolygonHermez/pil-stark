const assert = require("chai").assert;
const F3g = require("../../src/helpers/f3g.js");
const path = require("path");
const starkSetup = require("../../src/stark/stark_setup.js");
const starkGen = require("../../src/stark/stark_gen.js");
const starkVerify = require("../../src/stark/stark_verify.js");
const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");

const smGlobal = require("../state_machines/sm/sm_global.js");
const smBatchLookup = require("../state_machines/sm_batch_lookup/sm_batch_lookup.js");

describe("test plookup sm", async function () {
    this.timeout(10000000);

    it("It should create the pols main", async () => {
        const starkStruct = {
            nBits: 12,
            nBitsExt: 13,
            nQueries: 128,
            verificationHashType : "GL",
            steps: [
                {nBits: 13},
                {nBits: 10},
                {nBits: 7},
                {nBits: 4},
            ]
        };

        const F = new F3g("0xFFFFFFFF00000001");
        const pil = await compile(F, path.join(__dirname, "../state_machines", "sm_batch_lookup", "batch_lookup_main.pil"));
        
        const constPols =  newConstantPolsArray(pil);

        await smGlobal.buildConstants(constPols.Global);

        const cmPols = newCommitPolsArray(pil);

        await smBatchLookup.execute(cmPols.BatchLookup);

        const res = await verifyPil(F, pil, cmPols , constPols);

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

        assert(resV == true);
    });

});
