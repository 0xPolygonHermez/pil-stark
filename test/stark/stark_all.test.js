const chai = require("chai");
const assert = chai.assert;
const F3g = require("../../src/helpers/f3g");
const path = require("path");
const starkSetup = require("../../src/stark/stark_setup.js");
const starkGen = require("../../src/stark/stark_gen.js");
const starkVerify = require("../../src/stark/stark_verify.js");

const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");

const smGlobal = require("../state_machines/sm/sm_global.js");
const smPlookup = require("../state_machines/sm_plookup/sm_plookup.js");
const smFibonacci = require("../state_machines/sm_fibonacci/sm_fibonacci.js");
const smPermutation = require("../state_machines/sm_permutation/sm_permutation.js");
const smConnection = require("../state_machines/sm_connection/sm_connection.js");

const Logger = require('logplease');

describe("test All sm", async function () {
    this.timeout(10000000);

    it("It should create the pols main", async () => {
        const logger = Logger.create("pil-stark", {showTimestamp: false});
        Logger.setLogLevel("DEBUG");

        const starkStruct = {
            nBits: 8,
            nBitsExt: 9,
            nQueries: 8,
            verificationHashType : "GL",
            steps: [
                {nBits: 9},
                {nBits: 3}
            ]
        };

        const F = new F3g("0xFFFFFFFF00000001");
        const pil = await compile(F, path.join(__dirname, "../state_machines/", "sm_all", "all_main.pil"));
        const constPols =  newConstantPolsArray(pil, F);

        const N = 2**(starkStruct.nBits);

        await smGlobal.buildConstants(N, constPols.Global);
        await smPlookup.buildConstants(N, constPols.Plookup);
        await smFibonacci.buildConstants(N, constPols.Fibonacci);
        await smPermutation.buildConstants(N, constPols.Permutation);
        await smConnection.buildConstants(N, constPols.Connection, F);

        const cmPols = newCommitPolsArray(pil, F);

        await smPlookup.execute(N, cmPols.Plookup);
        await smFibonacci.execute(N, cmPols.Fibonacci, [1,2], F);
        await smPermutation.execute(N, cmPols.Permutation);
        await smConnection.execute(N, cmPols.Connection);

        const res = await verifyPil(F, pil, cmPols , constPols);

        if (res.length != 0) {
            console.log("Pil does not pass");
            for (let i=0; i<res.length; i++) {
                console.log(res[i]);
            }
            assert(0);
        }

        const setup = await starkSetup(constPols, pil, starkStruct, {F});

        const resP = await starkGen(cmPols, constPols, setup.constTree, setup.starkInfo, {logger});

        const resV = await starkVerify(resP.proof, resP.publics, setup.constRoot, setup.starkInfo, {logger});

        assert(resV==true);
    });

});
