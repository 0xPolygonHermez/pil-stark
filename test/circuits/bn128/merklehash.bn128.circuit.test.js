const chai = require("chai");
const path = require("path");
const { buildPoseidon } = require("circomlibjs");
const MerkleHash = require("../../../src/helpers/hash/merklehash/merklehash_bn128.js");

const assert = chai.assert;

const wasm_tester = require("circom_tester").wasm;

function getBits(idx, nBits) {
    res = [];
    for (let i=0; i<nBits; i++) {
        res[i] = (idx >> i)&1 ? 1n : 0n;
    }
    return res;
}

describe("Merkle Hash Circuit Test", function () {
    let circuit;
    let poseidon;


    this.timeout(10000000);

    before( async() => {
        poseidon = await buildPoseidon();

        circuit = await wasm_tester(path.join(__dirname, "circom", "merklehash.bn128.test.circom"), {O:1, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
    });

    it("Should calculate linear hash of 9 complex elements", async () => {
        const arity = 16;
        const nPols = 9;
        const N = 512;
        const idx = 34;

        const nBits = Math.ceil(Math.log2(N));

        let MH = new MerkleHash(poseidon, arity, false);

        const pols = [];
        for (let i=0; i<nPols;i++) {
            pols[i] = [];
            for (let j=0; j<N; j++) {
                pols[i][j] = [];
                for (let k=0; k<3; k++) {
                    pols[i][j][k] = BigInt(i*1000+j*10+k+1);
                }
            }
        }

        const tree = await MH.merkelize(pols, 3, nPols, N);

        proof = MH.getGroupProof(tree, idx);

        const calcRoot = MH.calculateRootFromGroupProof(proof[1], idx, proof[0]);
        const root = MH.root(tree);
        assert(root == calcRoot);

        const input={
            values: proof[0],
            siblings: proof[1],
            key: getBits(idx, nBits),
            root: root,
            enable: 1,
        };

        const w1 = await circuit.calculateWitness(input, true);

        await circuit.assertOut(w1, {});
    });
});
