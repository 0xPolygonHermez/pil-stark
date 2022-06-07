const chai = require("chai");
const assert = chai.assert;
const F1Field = require("../src/f3g");
const path = require("path");
const buildPoseidon = require("../src/poseidon.js");
const starkGen = require("../src/stark_gen.js");
const starkVerify = require("../src/stark_verify.js");


const { createCommitedPols, createConstantPols, compile, verifyPil } = require("zkpil");


const smGlobal = require("../src/sm/sm_global.js");
const smConnection = require("./sm_connection/sm_connection.js");

const MerkleHash = require("../src/merkle_hash.js");
const { extendPol } = require("../src/polutils");



describe("test connection sm", async function () {
    this.timeout(10000000);

    it("It should create the pols main", async () => {
        const starkStruct = {
            nBits: 10,
            nBitsExt: 11,
            nQueries: 128,
            steps: [
                {nBits: 11},
                {nBits: 3}
            ]
        };

        const Fr = new F1Field("0xFFFFFFFF00000001");
        const pil = await compile(Fr, path.join(__dirname, "sm_connection", "connection.pil"));
        const [constPols, constPolsArray, constPolsDef] =  createConstantPols(pil);
        const [cmPols, cmPolsArray, cmPolsDef] =  createCommitedPols(pil);


        await smGlobal.buildConstants(constPols.Global, constPolsDef.Global);
        await smConnection.buildConstants(constPols.Connection, constPolsDef.Connection);

        const result = await smConnection.execute(cmPols.Connection, cmPolsDef.Connection);
        console.log("Result: " + result);


        const res = await verifyPil(Fr, pil, cmPolsArray , constPolsArray);

        if (res.length != 0) {
            console.log("Pil does not pass");
            for (let i=0; i<res.length; i++) {
                console.log(res[i]);
            }
            assert(0);
        }

        const poseidon = await buildPoseidon();

        const constPolsArrayE = [];
        for (let i=0; i<constPolsArray.length; i++) {
            constPolsArrayE[i] = await extendPol(poseidon.F, constPolsArray[i], 1);
        }

        const constTree = MerkleHash.merkelize(constPolsArrayE, 1, constPolsArrayE.length, constPolsArrayE[0].length);


        const resP = await starkGen(cmPolsArray, constPolsArray, constTree, pil, starkStruct);

        const pil2 = await compile(Fr, path.join(__dirname, "sm_connection", "connection.pil"));

        const resV = await starkVerify(resP.proof, resP.publics, pil2, MerkleHash.root(constTree), starkStruct);

        assert(resV==true);

    });

});
