const path = require("path");
const F3g = require("../../../src/helpers/f3g");

const wasm_tester = require("circom_tester").wasm;

describe("GL in BN128 circuit", function () {
    let circuitMul;
    let circuitCMul;
    let circuitMulAdd;
    let circuitCMulAdd;
    let circuitCMulAdd2;
    let circuitInv;
    let circuitCInv;

    this.timeout(10000000);

    before( async() => {
        circuitMul = await wasm_tester(path.join(__dirname, "circom", "glmul.bn128.test.circom"), {O:1, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
        circuitCMul = await wasm_tester(path.join(__dirname, "circom", "glcmul.bn128.test.circom"), {O:1, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
        circuitMulAdd = await wasm_tester(path.join(__dirname, "circom", "glmuladd.bn128.test.circom"), {O:1, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
        circuitCMulAdd = await wasm_tester(path.join(__dirname, "circom", "glcmuladd.bn128.test.circom"), {O:1, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
        circuitCMulAdd2 = await wasm_tester(path.join(__dirname, "circom", "glcmuladd2.bn128.test.circom"), {O:1, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
        circuitInv = await wasm_tester(path.join(__dirname, "circom", "glinv.bn128.test.circom"), {O:1, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
        circuitCInv = await wasm_tester(path.join(__dirname, "circom", "glcinv.bn128.test.circom"), {O:1, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
    });

    it("Should check a basefield multiplication", async () => {
        const F = new F3g();

        const input={
            ina: F.e(-2),
            inb: F.e(-1)
        };

        const w = await circuitMul.calculateWitness(input, true);

        await circuitMul.assertOut(w, {out: 2n});

    });
    it("Should check a complex multiplication", async () => {
        const F = new F3g();

        const input={
            ina: F.e([-2, 3, -35]),
            inb: F.e([-1,-33, 4])
        };

        const w = await circuitCMul.calculateWitness(input, true);

        await circuitCMul.assertOut(w, {out: F.mul(input.ina, input.inb)});
    });

    it("Should check a basefield multiplication addition", async () => {
        const F = new F3g();

        const input={
            ina: F.e(-2),
            inb: F.e(-1),
            inc: F.e(444)
        };

        const w = await circuitMulAdd.calculateWitness(input, true);

        await circuitMulAdd.assertOut(w, {out: 446n});

    });
    it("Should check a complex multiplication addition", async () => {
        const F = new F3g();

        const input={
            ina: F.e([-2, 3, -35]),
            inb: F.e([-1,-33, 4]),
            inc: F.e([5,-8, -99])
        };

        const w = await circuitCMulAdd.calculateWitness(input, true);

        await circuitCMulAdd.assertOut(w, {out: F.add(F.mul(input.ina, input.inb), input.inc)});
    });

    it("Should check a complex multiplication addition v2", async () => {
        const F = new F3g();

        const input={
            ina: F.e([-2, 3, -35]),
            inb: F.e([-1,-33, 4]),
            inc: F.e([5,-8, -99])
        };

        const w = await circuitCMulAdd2.calculateWitness(input, true);

        await circuitCMulAdd2.assertOut(w, {out: F.add(F.mul(input.ina, input.inb), input.inc)});
    });

    it("Should check a basefield inv", async () => {
        const F = new F3g();

        const input={
            in: F.e(2),
        };

        const w = await circuitInv.calculateWitness(input, true);

        await circuitInv.assertOut(w, {out: F.inv(input.in)});

    });
    it("Should check a complex inv", async () => {
        const F = new F3g();

        const input={
            in: F.e([-2, 3, -35]),
        };

        const w = await circuitCInv.calculateWitness(input, true);

        await circuitCInv.assertOut(w, {out:  F.inv(input.in)});

    });

});
