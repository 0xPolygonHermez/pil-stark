const path = require("path");
const F3g = require("../../../src/helpers/f3g.js");
const { minimalPol } = require("../../../src/helpers/polutils.js");

const wasm_tester = require("circom_tester").wasm;

describe("Minimal Polinomial template", function () {
    let circuitMinimalPolinomial;

    this.timeout(10000000);

    before( async() => {
        circuitMinimalPolinomial = await wasm_tester(path.join(__dirname, "circom", "minimalpolinomial.test.circom"), {O:1, verbose: true, inspect: true, prime: "goldilocks"});
    });
    it("Should check that minimal polinomial is calculated right", async () => {
        const F = new F3g();

        const input={
            z: [ 804847985895389654n, 9582897258176626792n, 10313348785702401201n ]
        };

        const w = await circuitMinimalPolinomial.calculateWitness(input, true);

        const minPol = minimalPol(F, input.z);
        await circuitMinimalPolinomial.assertOut(w, {m: minPol});
    });
});
