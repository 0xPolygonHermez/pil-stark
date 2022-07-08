const chai = require("chai");
const assert = chai.assert;
const F1Field = require("../src/f3g");
const path = require("path");
const starkGen = require("../src/stark_gen.js");
const starkVerify = require("../src/stark_verify.js");
const buildPoseidonGL = require("../src/poseidon");
const buildPoseidonBN128 = require("circomlibjs").buildPoseidon;


const { createCommitedPols, createConstantPols, compile, verifyPil } = require("pilcom");


const smGlobal = require("../src/sm/sm_global.js");
const smPermutation = require("./sm_permutation/sm_permutation.js");

const MerkleHashGL = require("../src/merklehash.js");
const MerkleHashBN128 = require("../src/merklehash.bn128.js");

const { extendPol } = require("../src/polutils");



describe("test plookup sm", async function () {
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
        const pil = await compile(Fr, path.join(__dirname, "sm_permutation", "permutation_main.pil"));
        const [constPols, constPolsArray, constPolsDef] =  createConstantPols(pil);
        const [cmPols, cmPolsArray, cmPolsDef] =  createCommitedPols(pil);


        await smGlobal.buildConstants(constPols.Global, constPolsDef.Global);
        await smPermutation.buildConstants(constPols.Permutation, constPolsDef.Permutation);

        await smPermutation.execute(cmPols.Permutation, cmPolsDef.Permutation);

        const res = await verifyPil(Fr, pil, cmPolsArray , constPolsArray);

        if (res.length != 0) {
            console.log("Pil does not pass");
            for (let i=0; i<res.length; i++) {
                console.log(res[i]);
            }
            assert(0);
        }

        const constPolsArrayE = [];
        for (let i=0; i<constPolsArray.length; i++) {
            constPolsArrayE[i] = await extendPol(Fr, constPolsArray[i], 1);
        }

        let MH;
        if (starkStruct.verificationHashType == "GL") {
            const poseidonGL = await buildPoseidonGL();
            MH = new MerkleHashGL(poseidonGL);
        } else if (starkStruct.verificationHashType == "BN128") {
            const poseidonBN128 = await buildPoseidonBN128();
            MH = new MerkleHashBN128(poseidonBN128);
        } else {
            throw new Error("Invalid Hash Type: "+ starkStruct.verificationHashType);
        }


        const constTree = await MH.merkelize(constPolsArrayE, 1, constPolsArrayE.length, constPolsArrayE[0].length);

        const resP = await starkGen(cmPolsArray, constPolsArray, constTree, pil, starkStruct);

        const pil2 = await compile(Fr, path.join(__dirname, "sm_permutation", "permutation_main.pil"));

        const resV = await starkVerify(resP.proof, resP.publics, pil2, MH.root(constTree), starkStruct);

        assert(resV==true);

    });

});
