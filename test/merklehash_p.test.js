const buildMH = require("../src/helpers/hash/merklehash/merklehash_p.js");
const chai = require("chai");
const fs = require("fs");
const assert = chai.assert;
var tmp = require('tmp-promise');
const { BigBuffer } = require("pilcom");

describe("merkle hash", async function () {
    let MH;
    let MH_gpu;
    this.timeout(10000000);

    before( async() => {
        MH = await buildMH(false);
        MH_gpu = await buildMH(true);
    });

    describe("Using regular Linear Hash", async function () {
        it("It should merkelize and validate a proof of a very small tree", async () => {
            const N = 256;
            const idx = 3;
            const nPols = 3;
    
            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }
    
            const tree = await MH.merkelize(pols, nPols, N);
    
            const [groupElements, mp] = MH.getGroupProof(tree, idx);
            const root = MH.root(tree);
    
            assert(MH.verifyGroupProof(root, mp, idx, groupElements));
        });
    
        it("It should merkelize and validate a proof", async () => {
            const N = 256;
            const idx = 3;
            const nPols = 9;
    
            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }
    
            const tree = await MH.merkelize(pols, nPols, N);
    
            const [groupElements, mp] = MH.getGroupProof(tree, idx);
            const root = MH.root(tree);
    
            assert(MH.verifyGroupProof(root, mp, idx, groupElements));
        });
    
        it("It should merkelize and validate a proof not multiple of 2", async () => {
            const N = 33;
            const idx = 32;
            const nPols = 6;
    
            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }
    
            const tree = await MH.merkelize(pols, nPols, N);
    
            const [groupElements, mp] = MH.getGroupProof(tree, idx);
            const root = MH.root(tree);
    
            assert(MH.verifyGroupProof(root, mp, idx, groupElements));
        });
    
        it("Big one (parallel)", async () => {
            const N = 1<<18;
            const idx = 33;
            const nPols = 10;
    
            console.log("initialize..");
            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }
    
            console.log("computing values...");
            const tree = await MH.merkelize(pols, nPols, N);
    
            const [groupElements, mp] = MH.getGroupProof(tree, idx);
            const root = MH.root(tree);
    
            assert(MH.verifyGroupProof(root, mp, idx, groupElements));
        });
    
        it("Should save and restore to file", async() => {
            const N = 1<<18;
            const nPols = 10;
    
            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }
    
            const tree = await MH.merkelize(pols, nPols, N);
    
            fileName = await tmp.tmpName();
            await MH.writeToFile(tree, fileName);
    
            const tree2 = await MH.readFromFile(fileName);
    
            assert.equal(tree2.width, tree.width);
            assert.equal(tree2.heigth, tree.heigth);
            assert.equal(tree2.elements.length, tree.elements.length);
            assert.equal(tree2.nodes.length, tree.nodes.length);
            for (let i=0; i<tree.elements.length; i++) {
                assert.equal(tree2.elements.getElement(i), tree.elements.getElement(i));
            }
            for (let i=0; i<tree.nodes.length; i++) {
                assert.equal(tree2.nodes[i], tree.nodes[i]);
            }
    
            await fs.promises.unlink(fileName);
    
        });
    });

    describe("Using Linear Hash optimized for CPU", async function () {
        it("It should merkelize and validate a proof of a very small tree", async () => {
            const N = 256;
            const idx = 3;
            const nPols = 3;
    
            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }
    
            const tree = await MH_gpu.merkelize(pols, nPols, N);
    
            const [groupElements, mp] = MH_gpu.getGroupProof(tree, idx);
            const root = MH_gpu.root(tree);
    
            assert(MH_gpu.verifyGroupProof(root, mp, idx, groupElements));
        });
    
        it("It should merkelize and validate a proof", async () => {
            const N = 256;
            const idx = 3;
            const nPols = 9;
    
            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }
    
            const tree = await MH_gpu.merkelize(pols, nPols, N);
    
            const [groupElements, mp] = MH_gpu.getGroupProof(tree, idx);
            const root = MH_gpu.root(tree);
    
            assert(MH_gpu.verifyGroupProof(root, mp, idx, groupElements));
        });
    
        it("It should merkelize and validate a proof not multiple of 2", async () => {
            const N = 33;
            const idx = 32;
            const nPols = 6;
    
            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }
    
            const tree = await MH_gpu.merkelize(pols, nPols, N);
    
            const [groupElements, mp] = MH_gpu.getGroupProof(tree, idx);
            const root = MH_gpu.root(tree);
    
            assert(MH_gpu.verifyGroupProof(root, mp, idx, groupElements));
        });
    
        it("Big one (parallel)", async () => {
            const N = 1<<18;
            const idx = 33;
            const nPols = 10;
    
            console.log("initialize..");
            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }
    
            console.log("computing values...");
            const tree = await MH_gpu.merkelize(pols, nPols, N);
    
            const [groupElements, mp] = MH_gpu.getGroupProof(tree, idx);
            const root = MH_gpu.root(tree);
    
            assert(MH_gpu.verifyGroupProof(root, mp, idx, groupElements));
        });
    
        it("Should save and restore to file", async() => {
            const N = 1<<18;
            const nPols = 10;
    
            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }
    
            const tree = await MH_gpu.merkelize(pols, nPols, N);
    
            fileName = await tmp.tmpName();
            await MH_gpu.writeToFile(tree, fileName);
    
            const tree2 = await MH_gpu.readFromFile(fileName);
    
            assert.equal(tree2.width, tree.width);
            assert.equal(tree2.heigth, tree.heigth);
            assert.equal(tree2.elements.length, tree.elements.length);
            assert.equal(tree2.nodes.length, tree.nodes.length);
            for (let i=0; i<tree.elements.length; i++) {
                assert.equal(tree2.elements.getElement(i), tree.elements.getElement(i));
            }
            for (let i=0; i<tree.nodes.length; i++) {
                assert.equal(tree2.nodes[i], tree.nodes[i]);
            }
    
            await fs.promises.unlink(fileName);
    
        });
    });
});