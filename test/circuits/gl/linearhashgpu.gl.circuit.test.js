const path = require("path");
const buildPoseidon = require("../../../src/helpers/hash/poseidon/poseidon");
const LinearHash = require("../../../src/helpers/hash/linearhash/linearhash_gpu");

const wasm_tester = require("circom_tester").wasm;

describe("Linear Hash Circuit Test", function () {
    let circuitBig;
    let circuitSmall;

    this.timeout(10000000);

    before( async() => {
        circuitBig = await wasm_tester(path.join(__dirname, "circom", "linearhashbig_gpu.gl.test.circom"), {O:1, prime: "goldilocks", verbose:true});
        circuitSmall = await wasm_tester(path.join(__dirname, "circom", "linearhashsmall_gpu.gl.test.circom"), {O:1, prime: "goldilocks", verbose:true});
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

        const w1 = await circuitBig.calculateWitness(input, true);

        const lh = new LinearHash(poseidon);

        const res = lh.hash(input.in);

        await circuitBig.assertOut(w1, {out: res});
    });

    it("Should calculate linear hash of 1 complex elements", async () => {
        const poseidon = await buildPoseidon();
        const F = poseidon.F;

        const input={
            in: [
                [1n,2n,3n]
            ]
        };

        const w1 = await circuitSmall.calculateWitness(input, true);

        const lh = new LinearHash(poseidon);

        const res = lh.hash(input.in);

        await circuitSmall.assertOut(w1, {out: res});
    });
});
