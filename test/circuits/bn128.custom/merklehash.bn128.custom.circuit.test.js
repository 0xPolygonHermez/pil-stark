const chai = require("chai");
const path = require("path");
const { buildPoseidon } = require("circomlibjs");
const MerkleHash = require("../../../src/helpers/hash/merklehash/merklehash_bn128.js");
const tmp = require('temporary');
const fs = require("fs");
const ejs = require("ejs");

const assert = chai.assert;

const wasm_tester = require("circom_tester").wasm;

function getBits(idx, nLevels, arity) {
    const logArity = Math.ceil(Math.log2(arity));
    res = [];
    for (let i = 0; i < nLevels; i++) {
        const curIdx = idx % arity;
        for (let j=0; j<logArity; j++) {
            const bit = (curIdx >> j) & 1 ? 1n : 0n;
            res.push(bit);
        }
        idx = Math.floor(idx / arity);

    }
    return res;
}

describe("Merkle Hash BN128 Circuit Test", function () {
    let poseidon;

    this.timeout(10000000);

    before( async() => {
        poseidon = await buildPoseidon();
    });

    it("Should calculate merkle hash of 9 complex elements with arity 16", async () => {
        const arity = 16;
        const nPols = 9;
        const N = 514;
        const idx = 34;

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

        const MH = new MerkleHash(poseidon, arity, true);
        
        const tree = await MH.merkelize(pols, 3, nPols, N);

        proof = MH.getGroupProof(tree, idx);

        const calcRoot = MH.calculateRootFromGroupProof(proof[1], idx, proof[0]);
        const root = MH.root(tree);
        assert(root == calcRoot);

        const logArity = Math.ceil(Math.log2(arity));
        const nLevels = proof[1].length;
        const nBits = nLevels * logArity;

        const template = await fs.promises.readFile(path.join(__dirname, "circom", "merklehash.bn128.custom.test.circom.ejs"), "utf8");
        const content = ejs.render(template, {nBits, nPols, arity, dirName:path.join(__dirname, "circom")});
        const circuitFile = path.join(new tmp.Dir().path, "circuit.circom");
        await fs.promises.writeFile(circuitFile, content);
        const circuit = await wasm_tester(circuitFile, {O:1, include: ["circuits.bn128.custom", "node_modules/circomlib/circuits"]});

        const input={
            values: proof[0],
            siblings: proof[1],
            key: getBits(idx, nLevels, arity),
            root: root,
            enable: 1,
        };

        const w1 = await circuit.calculateWitness(input, true);

        await circuit.assertOut(w1, {});

        const [groupElements, mp] = MH.getGroupProof(tree, idx);
        assert(MH.verifyGroupProof(root, mp, idx, groupElements));
    });

    it("Should calculate merkle hash of 9 complex elements with arity 4", async () => {
        const arity = 4;
        const nPols = 9;
        const N = 514;
        const idx = 34;

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

        const MH = new MerkleHash(poseidon, arity, true);

        const tree = await MH.merkelize(pols, 3, nPols, N);

        proof = MH.getGroupProof(tree, idx);

        const calcRoot = MH.calculateRootFromGroupProof(proof[1], idx, proof[0]);
        const root = MH.root(tree);
        assert(root == calcRoot);

        const logArity = Math.ceil(Math.log2(arity));
        const nLevels = proof[1].length;
        const nBits = nLevels * logArity;

        const template = await fs.promises.readFile(path.join(__dirname, "circom", "merklehash.bn128.custom.test.circom.ejs"), "utf8");
        const content = ejs.render(template, {nBits, nPols, arity, dirName:path.join(__dirname, "circom")});
        const circuitFile = path.join(new tmp.Dir().path, "circuit.circom");
        await fs.promises.writeFile(circuitFile, content);
        const circuit = await wasm_tester(circuitFile, {O:1, include: ["circuits.bn128.custom", "node_modules/circomlib/circuits"]});

        const input={
            values: proof[0],
            siblings: proof[1],
            key: getBits(idx, nLevels, arity),
            root: root,
            enable: 1,
        };

        const w1 = await circuit.calculateWitness(input, true);

        await circuit.assertOut(w1, {});

        const [groupElements, mp] = MH.getGroupProof(tree, idx);
        assert(MH.verifyGroupProof(root, mp, idx, groupElements));
    });
});