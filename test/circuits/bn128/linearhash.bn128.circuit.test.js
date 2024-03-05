const path = require("path");
const { buildPoseidon } = require("circomlibjs");
const LinearHash = require("../../../src/helpers/hash/linearhash/linearhash.bn128");


const wasm_tester = require("circom_tester").wasm;

describe("Linear Hash Circuit Test", function () {
    let circuit4;
    let circuit16;

    let circuit4_100;
    let circuit16_100;


    this.timeout(10000000);

    before( async() => {
        circuit16 = await wasm_tester(path.join(__dirname, "circom", "linearhash16.bn128.test.circom"), {O:1, verbose:false, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
        circuit16_100 = await wasm_tester(path.join(__dirname, "circom", "linearhash16_100.bn128.test.circom"), {O:1, verbose:false, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
    
        circuit4 = await wasm_tester(path.join(__dirname, "circom", "linearhash4.bn128.test.circom"), {O:1, verbose:false, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
        circuit4_100 = await wasm_tester(path.join(__dirname, "circom", "linearhash4_100.bn128.test.circom"), {O:1, verbose:false, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
    });

    it("Should calculate linear hash of 9 complex elements and arity 16", async () => {
        const poseidon = await buildPoseidon();
        const F = poseidon.F;

        const input={
            in: [
                [1n,2n,3n],
                [4n,5n,6n],
                [7n,8n,9n],
                [10n,11n,12n],
                [13n,14n,15n],
                [16n,17n,18n],
                [19n,20n,21n],
                [22n,23n,24n],
                [25n,26n,27n]
            ]
        };

        const w1 = await circuit16.calculateWitness(input, true);

        const lh = new LinearHash(poseidon, 16);

        const res = lh.hash(input.in);

        await circuit16.assertOut(w1, {out: F.toObject(res)});
    });
    it("Should calculate linear hash of 100 complex elements and arity 16", async () => {
        const poseidon = await buildPoseidon();
        const F = poseidon.F;

        const input={
            in: []
        };

        for (let i=0; i<100; i++) {
            input.in.push([i, i*1000, i*1000000])
        }

        const w1 = await circuit16_100.calculateWitness(input, true);

        const lh = new LinearHash(poseidon, 16);

        const res = lh.hash(input.in);

        await circuit16_100.assertOut(w1, {out: F.toObject(res)});
    });

    it("Should calculate linear hash of 9 complex elements and arity 4", async () => {
        const poseidon = await buildPoseidon();
        const F = poseidon.F;

        const input={
            in: [
                [1n,2n,3n],
                [4n,5n,6n],
                [7n,8n,9n],
                [10n,11n,12n],
                [13n,14n,15n],
                [16n,17n,18n],
                [19n,20n,21n],
                [22n,23n,24n],
                [25n,26n,27n]
            ]
        };

        const w1 = await circuit4.calculateWitness(input, true);

        const lh = new LinearHash(poseidon, 4);

        const res = lh.hash(input.in);

        await circuit4.assertOut(w1, {out: F.toObject(res)});
    });
    it("Should calculate linear hash of 100 complex elements and arity 4", async () => {
        const poseidon = await buildPoseidon();
        const F = poseidon.F;

        const input={
            in: []
        };

        for (let i=0; i<100; i++) {
            input.in.push([i, i*1000, i*1000000])
        }

        const w1 = await circuit4_100.calculateWitness(input, true);

        const lh = new LinearHash(poseidon, 4);

        const res = lh.hash(input.in);

        await circuit4_100.assertOut(w1, {out: F.toObject(res)});
    });
});
