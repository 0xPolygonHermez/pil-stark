const chai = require("chai");
const assert = chai.assert;
const { getCurveFromName, Scalar, F1Field } = require("ffjavascript");

const buildPoseidon = require("../src/poseidon_bn128");
const buildPoseidonRef = require("circomlibjs").buildPoseidon;

describe("Poseidon test", async function () {
    let poseidon;
    let poseidonRef
    let F;
    this.timeout(10000000);

    before(async () => {
        poseidon = await buildPoseidon();
        poseidonRef = await buildPoseidonRef();
        const bn128 = await getCurveFromName("bn128", true, buildPoseidonWasm);
        F = bn128.Fr;
    });

    it("Should check constrain reference implementation poseidonperm_x5_254_3", async () => {
        const input = [];
        for (let i=0; i<16; i++) input[i] = F.e(i);
        const resRef = poseidonRef(input);
        const res = poseidon(input);

        assert(F.eq(resRef, res));
    });
});