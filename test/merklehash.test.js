const MerkleHash = require("../src/helpers/hash/merklehash/merklehash.js");
const buildPoseidon = require("../src/helpers/hash/poseidon/poseidon");
const chai = require("chai");
const assert = chai.assert;

describe("merkle hash", async function () {
    let poseidon;
    let MH;
    let MH_gpu;
    this.timeout(10000000);

    before( async() => {
        poseidon = await buildPoseidon();
        MH = new MerkleHash(poseidon, false);
        MH_gpu = new MerkleHash(poseidon, true);
    });

    describe("Using regular Linear Hash", async function () {
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
    
            const tree = await MH.merkelize(pols, 1, nPols, N);
    
            const [groupElements, mp] = MH.getGroupProof(tree, idx);
            const root = MH.root(tree);
    
            assert(MH.verifyGroupProof(root, mp, idx, groupElements));
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
    
            const tree = await MH.merkelize(pols, 3, nPols, N);
    
            const [groupElements, mp] = MH.getGroupProof(tree, idx);
            const root = MH.root(tree);
    
            assert(MH.verifyGroupProof(root, mp, idx, groupElements));
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
    
            const tree = await MH.merkelize(pol, 3, groupSize, nGroups);
    
            const [groupElements, mp] = MH.getGroupProof(tree, idx);
            const root = MH.root(tree);
    
            assert(MH.verifyGroupProof(root, mp, idx, groupElements));
        });
        it("It should merkelize and return the right number of elements", async () => {
            const N = 2**14;
            const idx = 2334;
            const nPols = 40;
    
            const pols = [];
            for (let i=0; i<nPols; i++) pols[i] = [];
            for (let i=0; i<N; i++) {
                if (i%10000 == 0) console.log(`Building pols...${i+1}/${N}`);
                for (let j=0; j<nPols; j++) {
                    pols[j].push(BigInt(i + j*1000));
                }
            }
    
            const tree = await MH.merkelize(pols, 1, nPols, N);
    
            const [groupElements, mp] = MH.getGroupProof(tree, idx);
            const root = MH.root(tree);
    
            assert(MH.verifyGroupProof(root, mp, idx, groupElements));
        });
    });

    describe("Using Linear Hash optimized for GPU", async function () {
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
    
            const tree = await MH_gpu.merkelize(pols, 1, nPols, N);
    
            const [groupElements, mp] = MH_gpu.getGroupProof(tree, idx);
            const root = MH_gpu.root(tree);
    
            assert(MH_gpu.verifyGroupProof(root, mp, idx, groupElements));
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
    
            const tree = await MH_gpu.merkelize(pols, 3, nPols, N);
    
            const [groupElements, mp] = MH_gpu.getGroupProof(tree, idx);
            const root = MH_gpu.root(tree);
    
            assert(MH_gpu.verifyGroupProof(root, mp, idx, groupElements));
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
    
            const tree = await MH_gpu.merkelize(pol, 3, groupSize, nGroups);
    
            const [groupElements, mp] = MH_gpu.getGroupProof(tree, idx);
            const root = MH_gpu.root(tree);
    
            assert(MH_gpu.verifyGroupProof(root, mp, idx, groupElements));
        });
        it("It should merkelize and return the right number of elements", async () => {
            const N = 2**14;
            const idx = 2334;
            const nPols = 40;
    
            const pols = [];
            for (let i=0; i<nPols; i++) pols[i] = [];
            for (let i=0; i<N; i++) {
                if (i%10000 == 0) console.log(`Building pols...${i+1}/${N}`);
                for (let j=0; j<nPols; j++) {
                    pols[j].push(BigInt(i + j*1000));
                }
            }
    
            const tree = await MH_gpu.merkelize(pols, 1, nPols, N);
    
            const [groupElements, mp] = MH_gpu.getGroupProof(tree, idx);
            const root = MH_gpu.root(tree);
    
            assert(MH_gpu.verifyGroupProof(root, mp, idx, groupElements));
        });
    });
    
});
