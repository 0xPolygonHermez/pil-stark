const path = require("path");
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;

const wasm_tester = require("circom_tester").wasm;

describe("Less Than Goldilocks Circuit Test", function () {
    let circuitLessThan;

    let p = 18446744069414584321n;

    this.timeout(10000000);

    before( async() => {
        circuitLessThan = await wasm_tester(path.join(__dirname, "circom", "lessthangl.bn128.test.circom"), {O:1, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
    });

    it("Should check that a number is less than goldilocks", async () => {
        const input={
            in:  p - 1n,
        };

        await circuitLessThan.calculateWitness(input, true);
    });

    it("Should  fail if the number is bigger than goldilocks", async () => {
        const input={
            in: p,
        };

        await expect(circuitLessThan.calculateWitness(input, true)).to.be.rejected;
    });
});
