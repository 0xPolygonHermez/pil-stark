const path = require("path");
const F3g = require("../../../src/helpers/f3g.js");

const wasm_tester = require("circom_tester").wasm;

describe("CMulAdd GL custom template", function () {
    let circuitMulAdd;

    this.timeout(10000000);

    before( async() => {
        circuitMulAdd = await wasm_tester(path.join(__dirname, "circom", "cmuladd.test.circom"), {O:1, prime: "goldilocks"});
    });
    it("Should check a basefield multiplication addition", async () => {
        const F = new F3g();

        const input={
            ina: [F.e(-2),F.e(3), F.e(5)],
            inb: [F.e(8), F.e(-1), F.e(-23)],
            inc: [F.e(444), F.e(555), F.e(-666)],
        };

        const w = await circuitMulAdd.calculateWitness(input, true);

        await circuitMulAdd.assertOut(w, {out: F.add(F.mul(input.ina, input.inb), input.inc)});
    });
});
