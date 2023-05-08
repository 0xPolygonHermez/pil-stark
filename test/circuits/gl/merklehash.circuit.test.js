const chai = require("chai");
const path = require("path");
const MerkleHash = require("../../../src/helpers/hash/merklehash/merklehash.js");
const buildPoseidon = require("../../../src/helpers/hash/poseidon/poseidon");



const assert = chai.assert;

const wasm_tester = require("circom_tester").wasm;

function getBits(idx, nBits) {
    res = [];
    for (let i=0; i<nBits; i++) {
        res[i] = (idx >> i)&1 ? 1n : 0n;
    }
    return res;
}

describe("Linear Hash Circuit Test", function () {
    let poseidon;
    let MH;
    let circuit;

    this.timeout(10000000);

    before( async() => {
        poseidon = await buildPoseidon();
        MH = new MerkleHash(poseidon);

        circuit = await wasm_tester(path.join(__dirname, "circom", "merklehash.test.circom"), {O:1, prime: "goldilocks"});
    });

    it("Should calculate linear hash of 9 complex elements", async () => {
        const NPols = 9;
        const nBits = 5;
        const idx = 9;

        const poseidon = await buildPoseidon();
        const F = poseidon.F;
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

        const tree = await MH.merkelize(pols, 3, NPols, N);

        proof = MH.getGroupProof(tree, idx);

        const calcRoot = MH.calculateRootFromGroupProof(proof[1], idx, proof[0]);
        const root = MH.root(tree);
        for (let i=0; i<4; i++) {
            assert(root[i] == calcRoot[i]);
        }

        const input={
            values: proof[0],
            siblings: proof[1],
            key: getBits(idx, nBits),
            enable: 1,
            root: MH.root(tree),
        };
        const w1 = await circuit.calculateWitness(input, true);

        await circuit.assertOut(w1, {});
    });
});
