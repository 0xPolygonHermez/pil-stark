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
    let circuit16;
    let circuit4;

    let MH16;
    let MH4;
    let poseidon;


    this.timeout(10000000);

    before( async() => {
        poseidon = await buildPoseidon();
        MH16 = new MerkleHash(poseidon, 16);
        MH4 = new MerkleHash(poseidon, 4);


        circuit16 = await wasm_tester(path.join(__dirname, "circom", "merklehash16.bn128.test.circom"), {O:1, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
        circuit4 = await wasm_tester(path.join(__dirname, "circom", "merklehash4.bn128.test.circom"), {O:1, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});

    });

    it("Should calculate linear hash of 9 complex elements and arity 16", async () => {
        const NPols = 9;
        const arity = 16;
        const nBitsArity = Math.ceil(Math.log2(arity));
        const nBits = Math.ceil(NPols*3/arity)*nBitsArity;
        const idx = 9;

        const N = 1<<nBits;

        const pols = [];
        for (let i=0; i<NPols;i++) {
            pols[i] = [];
            for (let j=0; j<N; j++) {
                pols[i][j] = [];
                for (let k=0; k<3; k++) {
                    pols[i][j][k] = BigInt(i*1000+j*10+k+1);
                }
            }
        }

        const tree = await MH16.merkelize(pols, 3, NPols, N);

        proof = MH16.getGroupProof(tree, idx);

        const calcRoot = MH16.calculateRootFromGroupProof(proof[1], idx, proof[0]);
        const root = MH16.root(tree);
        assert(root == calcRoot);

        const input={
            values: proof[0],
            siblings: proof[1],
            key: getBits(idx, nBits),
            root: root,
            enable: 1,
        };

        const w1 = await circuit16.calculateWitness(input, true);

        await circuit16.assertOut(w1, {});
    });

    it("Should calculate linear hash of 9 complex elements and arity 4", async () => {
        const NPols = 9;
        const arity = 4;
        const nBitsArity = Math.ceil(Math.log2(arity));
        const nBits = Math.ceil(NPols*3/arity)*nBitsArity;
        const idx = 9;

        const N = 1<<nBits;

        const pols = [];
        for (let i=0; i<NPols;i++) {
            pols[i] = [];
            for (let j=0; j<N; j++) {
                pols[i][j] = [];
                for (let k=0; k<3; k++) {
                    pols[i][j][k] = BigInt(i*1000+j*10+k+1);
                }
            }
        }

        const tree = await MH4.merkelize(pols, 3, NPols, N);

        proof = MH4.getGroupProof(tree, idx);

        const calcRoot = MH4.calculateRootFromGroupProof(proof[1], idx, proof[0]);
        const root = MH4.root(tree);
        assert(root == calcRoot);

        const input={
            values: proof[0],
            siblings: proof[1],
            key: getBits(idx, nBits),
            root: root,
            enable: 1,
        };

        const w1 = await circuit4.calculateWitness(input, true);

        await circuit4.assertOut(w1, {});
    });
});
