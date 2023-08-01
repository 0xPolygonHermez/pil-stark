const buildMH = require("../src/helpers/hash/merklehash/merklehash_bn128_p.js");
const chai = require("chai");
const assert = chai.assert;
var tmp = require('tmp-promise');
var fs = require("fs");
const { BigBuffer } = require("pilcom");

describe("merkle hash", async function () {
    let MH16;
    let MH4;
    let MH8;
    let MH6;
    this.timeout(10000000);

    describe(" Merkle Hash arity 16", async () => {
        before( async() => {
            MH16 = await buildMH(16, false);
        });

        it("It should merkelize and validate a proof of a very small tree with arity 16", async () => {
            const N = 256;
            const idx = 3;
            const nPols = 3;
    
            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }
    
            const tree = await MH16.merkelize(pols, nPols, N);
    
            const [groupElements, mp] = MH16.getGroupProof(tree, idx);
            const root = MH16.root(tree);
            assert(MH16.verifyGroupProof(root, mp, idx, groupElements));
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
    
            const tree = await MH16.merkelize(pols, nPols, N);
    
            const [groupElements, mp] = MH16.getGroupProof(tree, idx);
            const root = MH16.root(tree);

            assert(MH16.verifyGroupProof(root, mp, idx, groupElements));
        });
    
        it("It should merkelize and validate a proof not multiple of 2 with arity 16", async () => {
            const N = 33;
            const idx = 32;
            const nPols = 6;
    
            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }
    
            const tree = await MH16.merkelize(pols, nPols, N);
    
            const [groupElements, mp] = MH16.getGroupProof(tree, idx);
            const root = MH16.root(tree);
    
            assert(MH16.verifyGroupProof(root, mp, idx, groupElements));
        });

        it("Big one (parallel) with arity 16", async () => {
            const N = 1<<17;
            const idx = 32;
            const nPols = 10;
    
            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }
    
            const tree = await MH16.merkelize(pols, nPols, N);
    
            const [groupElements, mp] = MH16.getGroupProof(tree, idx);
            const root = MH16.root(tree);
        
            assert(MH16.verifyGroupProof(root, mp, idx, groupElements));
        });

        it("Should save and restore to file with arity 16", async() => {
            const N = 1<<18;
            const nPols = 10;
    
            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }
    
            const tree = await MH16.merkelize(pols, nPols, N);
    
            fileName = await tmp.tmpName();
            await MH16.writeToFile(tree, fileName);
    
            const tree2 = await MH16.readFromFile(fileName);
    
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

    it("It should merkelize and validate a proof of a very small tree with arity 6", async () => {
        const N = 256;
        const idx = 3;
        const nPols = 3;

        const pols = new BigBuffer(nPols*N);
        for (let i=0; i<N; i++) {
            for (let j=0; j<nPols; j++) {
                pols.setElement(i*nPols + j, BigInt(i + j*1000));
            }
        }

        const tree = await MH6.merkelize(pols, nPols, N);

        const [groupElements, mp] = MH6.getGroupProof(tree, idx);

        const root = MH6.root(tree);

        assert(MH6.verifyGroupProof(root, mp, idx, groupElements));
    });

    describe(" Merkle Hash arity 4", async () => {
        before( async() => {
            MH4 = await buildMH(4, true);
        });


        it("It should merkelize and validate a proof of a very small tree with arity 4", async () => {
            const N = 256;
            const idx = 3;
            const nPols = 3;

            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }

            const tree = await MH4.merkelize(pols, nPols, N);

            const [groupElements, mp] = MH4.getGroupProof(tree, idx);

            const root = MH4.root(tree);

            assert(MH4.verifyGroupProof(root, mp, idx, groupElements));
        });

        it("It should merkelize and validate a proof not multiple of 2 with arity 4", async () => {
            const N = 33;
            const idx = 32;
            const nPols = 6;

            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }

            const tree = await MH4.merkelize(pols, nPols, N);

            const [groupElements, mp] = MH4.getGroupProof(tree, idx);
            const root = MH4.root(tree);

            assert(MH4.verifyGroupProof(root, mp, idx, groupElements));
        });

        it("Big one (parallel) with arity 4", async () => {
            const N = 1<<14;
            const idx = 32;
            const nPols = 31;
    
            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }
    
            const tree = await MH4.merkelize(pols, nPols, N);
    
            const [groupElements, mp] = MH4.getGroupProof(tree, idx);
            const root = MH4.root(tree);
        
            assert(MH4.verifyGroupProof(root, mp, idx, groupElements));
        });

        it("Should save and restore to file with arity 4", async() => {
            const N = 1<<14;
            const nPols = 10;
    
            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }
    
            const tree = await MH4.merkelize(pols, nPols, N);
    
            fileName = await tmp.tmpName();
            await MH4.writeToFile(tree, fileName);
    
            const tree2 = await MH4.readFromFile(fileName);
    
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
   
    describe(" Merkle Hash arity 8", async () => {
        before( async() => {
            MH8 = await buildMH(8, true);
        });

        it("Big one (parallel) with arity 8", async () => {
            const N = 1<<14 + 3;
            const idx = 32;
            const nPols = 10;
    
            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }
    
            const tree = await MH8.merkelize(pols, nPols, N);
    
            const [groupElements, mp] = MH8.getGroupProof(tree, idx);
            const root = MH8.root(tree);
        
            assert(MH8.verifyGroupProof(root, mp, idx, groupElements));
        });
    
    
        it("Should save and restore to file with arity 8", async() => {
            const N = 1<<14;
            const nPols = 10;
    
            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }
    
            const tree = await MH8.merkelize(pols, nPols, N);
    
            fileName = await tmp.tmpName();
            await MH8.writeToFile(tree, fileName);
    
            const tree2 = await MH8.readFromFile(fileName);
    
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

    describe.only(" Merkle Hash arity 6", async () => {
        before( async() => {
            MH6 = await buildMH(8, true);
        });

        it("It should merkelize and validate a proof not multiple of 2 with arity 6", async () => {
            const N = 37;
            const idx = 14;
            const nPols = 5;
    
            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }
    
            const tree = await MH6.merkelize(pols, nPols, N);
    
            const [groupElements, mp] = MH6.getGroupProof(tree, idx);
            const root = MH6.root(tree);
            assert(MH6.verifyGroupProof(root, mp, idx, groupElements));
        });

        it("Big one (parallel) with arity 6", async () => {
            const N = 1<<14 + 34;
            const idx = 245;
            const nPols = 10;
    
            const pols = new BigBuffer(nPols*N);
            for (let i=0; i<N; i++) {
                for (let j=0; j<nPols; j++) {
                    pols.setElement(i*nPols + j, BigInt(i + j*1000));
                }
            }
    
            const tree = await MH6.merkelize(pols, nPols, N);
    
            const [groupElements, mp] = MH6.getGroupProof(tree, idx);
            const root = MH6.root(tree);
        
            assert(MH6.verifyGroupProof(root, mp, idx, groupElements));
        });
    

    });
    

});
