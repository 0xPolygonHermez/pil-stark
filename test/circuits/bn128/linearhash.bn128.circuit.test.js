const path = require("path");
const { buildPoseidon } = require("circomlibjs");
const LinearHash = require("../../../src/helpers/hash/linearhash/linearhash.bn128");


const wasm_tester = require("circom_tester").wasm;

describe("Linear Hash Circuit Test", function () {
    let eddsa;
    let F;
    let circuit;

    this.timeout(10000000);

    before( async() => {
        circuit = await wasm_tester(path.join(__dirname, "circom", "linearhash.bn128.test.circom"), {O:1, verbose:false, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
        circuit100 = await wasm_tester(path.join(__dirname, "circom", "linearhash100.bn128.test.circom"), {O:1, verbose:false, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
    });

    it("Should calculate linear hash of 9 complex elements", async () => {
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

        const w1 = await circuit.calculateWitness(input, true);

        const lh = new LinearHash(poseidon, 16, false);

        const res = lh.hash(input.in);

        await circuit.assertOut(w1, {out: F.toObject(res)});
    });
    it("Should calculate linear hash of 100 complex elements", async () => {
        const poseidon = await buildPoseidon();
        const F = poseidon.F;

        const input={
            in: []
        };

        for (let i=0; i<100; i++) {
            input.in.push([i, i*1000, i*1000000])
        }

        const w1 = await circuit100.calculateWitness(input, true);

        const lh = new LinearHash(poseidon, 16, false);

        const res = lh.hash(input.in);

        await circuit100.assertOut(w1, {out: F.toObject(res)});
    });
});
