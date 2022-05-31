const chai = require("chai");
const assert = chai.assert;
const F1Field = require("../src/f3g");
const path = require("path");
// const starkGen = require("../src/stark_gen.js");
const MerkleGroupMultipolLHash = require("../src/merkle_group_multipol_lhash.js");
const buildPoseidon = require("../src/poseidon.js");
const starkGen = require("../src/stark_gen.js");
const starkVerify = require("../src/stark_verify.js");


const { createCommitedPols, createConstantPols, compile, verifyPil } = require("zkpil");


const smFibonacci = require("./sm_fibonacci/sm_fibonacci.js");

const Merkle = require("../src/merkle.js");
const LinearHash = require("../src/linearhash.js");
const { extendPol } = require("../src/polutils");



describe("test fibonacci sm", async function () {
    this.timeout(10000000);

    it("It should create the pols main", async () => {
        const Fr = new F1Field("0xFFFFFFFF00000001");
        const pil = await compile(Fr, path.join(__dirname, "sm_fibonacci", "fibonacci.pil"));
        const [constPols, constPolsArray, constPolsDef] =  createConstantPols(pil);
        const [cmPols, cmPolsArray, cmPolsDef] =  createCommitedPols(pil);

        await smFibonacci.buildConstants(constPols.Fibonacci, constPolsDef.Fibonacci);


        const result = await smFibonacci.execute(cmPols.Fibonacci, cmPolsDef.Fibonacci, [1,2]);
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
        const LH = new LinearHash(poseidon);
        const M = new Merkle(poseidon);
        const MM = new MerkleGroupMultipolLHash(LH, M, constPolsDef.Fibonacci.L1.polDeg*2, 1, constPolsArray.length);

        const constPolsArrayE = [];
        for (let i=0; i<constPolsArray.length; i++) {
            constPolsArrayE[i] = await extendPol(poseidon.F, constPolsArray[i], 1);
        }
        const constTree = MM.merkelize(constPolsArrayE);

        const starkStruct = {
            nBits: 10,
            nBitsExt: 11,
            nQueries: 128,
            steps: [
                {nBits: 11}, 
                {nBits: 5}
            ]
        };

        const resP = await starkGen(cmPolsArray, constPolsArray, constTree, pil, starkStruct);

        const resV = await starkVerify(resP.proof, resP.publics, pil, MM.root(constTree), starkStruct);

        assert(resV==true);
    });

});
