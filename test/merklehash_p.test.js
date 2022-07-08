const MerkleHashP = require("../src/merklehash_p.js");
const buildPoseidon = require("../src/poseidon");
const chai = require("chai");
const assert = chai.assert;

describe("merkle hash", async function () {
    let poseidon;
    let MH;
    this.timeout(10000000);

    before( async() => {
        poseidon = await buildPoseidon();
        MH = new MerkleHashP(poseidon);
    });
    it("It should merkelize and validate a proof", async () => {
        const N = 256;
        const idx = 3;
        const nPols = 9;

        const pols = new BigUint64Array(nPols*N);
        for (let i=0; i<N; i++) {
            for (let j=0; j<nPols; j++) {
                pols[i*nPols + j] = BigInt(i + j*1000);
            }
        }

        const tree = await MH.merkelize(pols, 0, nPols, N);

        const [groupElements, mp] = MH.getGroupProof(tree, idx);
        const root = MH.root(tree);

        assert(MH.verifyGroupProof(root, mp, idx, groupElements));
    });

    it("It should merkelize and validate a proof not multiple of 2", async () => {
        const N = 33;
        const idx = 32;
        const nPols = 6;

        const pols = new BigUint64Array(nPols*N);
        for (let i=0; i<N; i++) {
            for (let j=0; j<nPols; j++) {
                pols[i*nPols + j] = BigInt(i + j*1000);
            }
        }

        const tree = await MH.merkelize(pols, 0, nPols, N);

        const [groupElements, mp] = MH.getGroupProof(tree, idx);
        const root = MH.root(tree);

        assert(MH.verifyGroupProof(root, mp, idx, groupElements));
    });

    it("Big one (parallel)", async () => {
        const N = 1<<21;
        const idx = 32;
        const nPols = 10;

        const pols = new BigUint64Array(nPols*N);
        for (let i=0; i<N; i++) {
            for (let j=0; j<nPols; j++) {
                pols[i*nPols + j] = BigInt(i + j*1000);
            }
        }

        const tree = await MH.merkelize(pols, 0, nPols, N);

        const [groupElements, mp] = MH.getGroupProof(tree, idx);
        const root = MH.root(tree);

        assert(MH.verifyGroupProof(root, mp, idx, groupElements));
    });
});