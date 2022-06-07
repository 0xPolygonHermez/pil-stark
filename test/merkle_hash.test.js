const MerkleHash = require("../src/merkle_hash.js");
const buildPoseidon = require("../src/poseidon");
const chai = require("chai");
const assert = chai.assert;

describe("merkle hash", async function () {
    let poseidon;
    let F;
    this.timeout(10000000);

    it("It should merkelize and return the right number of elements", async () => {
        const N = 256;
        const idx = 3;
        const nPols = 9;

        const pols = [];
        for (let i=0; i<nPols; i++) pols[i] = [];
        for (let i=0; i<N; i++) {
            for (let j=0; j<nPols; j++) {
                pols[j].push(BigInt(i + j*1000));
            }
        }

        const tree = await MerkleHash.merkelize(pols, 1, nPols, N);

        const [groupElements, mp] = MerkleHash.getGroupProof(tree, idx);
        const root = MerkleHash.root(tree);

        assert(MerkleHash.verifyGroupProof(root, mp, idx, groupElements));
    });
    it("It should merkelize polynomials in ext 3", async () => {
        const N = 256;
        const idx = 3;
        const nPols = 9;

        const pols = [];
        for (let i=0; i<nPols; i++) pols[i] = [];
        for (let i=0; i<N; i++) {
            for (let j=0; j<nPols; j++) {
                pols[j].push([ BigInt(i + j*1000), BigInt(i+10+j*1000), BigInt(i+20+j*1000)]);
            }
        }

        const tree = MerkleHash.merkelize(pols, 3, nPols, N);

        const [groupElements, mp] = MerkleHash.getGroupProof(tree, idx);
        const root = MerkleHash.root(tree);

        assert(MerkleHash.verifyGroupProof(root, mp, idx, groupElements));
    });
    it("It should merkelize polynomials in ext 3", async () => {
        const N = 256;
        const idx = 3;
        const groupSize = 4;
        const nGroups = N/groupSize;


        const pol = [];
        for (let i=0; i<N; i++) {
            pol.push([ BigInt(i), BigInt(i+10), BigInt(i+20)]);
        }

        const tree = MerkleHash.merkelize(pol, 3, groupSize, nGroups);

        const [groupElements, mp] = MerkleHash.getGroupProof(tree, idx);
        const root = MerkleHash.root(tree);

        assert(MerkleHash.verifyGroupProof(root, mp, idx, groupElements));
    });
    it("It should merkelize and return the right number of elements", async () => {
        const N = 2**24;
        const idx = 2334;
        const nPols = 700;

        const pols = [];
        for (let i=0; i<nPols; i++) pols[i] = [];
        for (let i=0; i<N; i++) {
            if (i%10000 == 0) console.log(`Building pols...${i+1}/${N}`);
            for (let j=0; j<nPols; j++) {
                pols[j].push(BigInt(i + j*1000));
            }
        }

        const tree = await MerkleHash.merkelize(pols, 1, nPols, N);

        const [groupElements, mp] = MerkleHash.getGroupProof(tree, idx);
        const root = MerkleHash.root(tree);

        assert(MerkleHash.verifyGroupProof(root, mp, idx, groupElements));
    });
});