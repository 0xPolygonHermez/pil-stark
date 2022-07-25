const buildMH = require("../src/merklehash_bn128_p.js");
const chai = require("chai");
const assert = chai.assert;
var tmp = require('tmp-promise');
var fs = require("fs");

describe("merkle hash", async function () {
    let MH;
    this.timeout(10000000);

    before( async() => {
        MH = await buildMH();
    });

    it("It should merkelize and validate a proof of a very small tree", async () => {
        const N = 256;
        const idx = 3;
        const nPols = 3;

        const pols = new BigUint64Array(nPols*N);
        for (let i=0; i<N; i++) {
            for (let j=0; j<nPols; j++) {
                pols[i*nPols + j] = BigInt(i + j*1000);
            }
        }

        const tree = await MH.merkelize(pols, 0, nPols, N);

        const [groupElements, mp] = MH.getGroupProof(tree, idx);
        const root = MH.root(tree);
        console.log(root);

        assert(MH.verifyGroupProof(root, mp, idx, groupElements));
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
        console.log(root);

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
        console.log(root);

        assert(MH.verifyGroupProof(root, mp, idx, groupElements));
    });
    it("Big one (parallel)", async () => {
        const N = 1<<17;
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

        console.log(root);

        assert(MH.verifyGroupProof(root, mp, idx, groupElements));
    });


    it("Should save and restore to file", async() => {
        const N = 1<<18;
        const nPols = 10;

        const pols = new BigUint64Array(nPols*N);
        for (let i=0; i<N; i++) {
            for (let j=0; j<nPols; j++) {
                pols[i*nPols + j] = BigInt(i + j*1000);
            }
        }

        const tree = await MH.merkelize(pols, 0, nPols, N);

        fileName = await tmp.tmpName();
        await MH.writeToFile(tree, fileName);

        const tree2 = await MH.readFromFile(fileName);

        assert.equal(tree2.width, tree.width);
        assert.equal(tree2.heigth, tree.heigth);
        assert.equal(tree2.elements.length, tree.elements.length);
        assert.equal(tree2.nodes.length, tree.nodes.length);
        for (let i=0; i<tree.elements.length; i++) {
            assert.equal(tree2.elements[i], tree.elements[i]);
        }
        for (let i=0; i<tree.nodes.length; i++) {
            assert.equal(tree2.nodes[i], tree.nodes[i]);
        }

        await fs.promises.unlink(fileName);

    });

});