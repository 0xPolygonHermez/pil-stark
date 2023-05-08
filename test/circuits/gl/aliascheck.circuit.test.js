const chai = require("chai");
const path = require("path");
const F3g = require("../../../src/helpers/f3g");

const assert = chai.assert;


const wasm_tester = require("circom_tester").wasm;

function print(circuit, w, s) {
    console.log(s + ": " + w[circuit.getSignalIdx(s)]);
}

function getBits(v, n) {
    const res = [];
    for (let i=0; i<n; i++) {
        if ((v >> BigInt(i)) & 1n ) {
            res.push(1n);
        } else {
            res.push(0n);
        }
    }
    return res;
}


describe("Aliascheck test", function () {
    this.timeout(100000);
    const q = 0xFFFFFFFF00000001n;
    const F = new F3g();


    let cir;
    before( async() => {

        cir = await wasm_tester(path.join(__dirname, "circom", "aliascheck.test.circom"),{O:1, prime: "goldilocks"});
    });

    it("Satisfy the aliastest 0", async () => {
        const inp = getBits(0n, 64);
        await cir.calculateWitness({in: inp}, true);
    });

    it("Satisfy the aliastest 3", async () => {
        const inp = getBits(3n, 64);
        await cir.calculateWitness({in: inp}, true);
    });

    it("Satisfy the aliastest q-1", async () => {
        const inp = getBits(q-1n, 64);
        // console.log(JSON.stringify(utils.stringifyBigInts(inp)));
        await cir.calculateWitness({in: inp}, true);
    });

    it("Should not satisfy an input of q", async () => {
        const inp = getBits(q, 64);
        try {
            await cir.calculateWitness({in: inp}, true);
            assert(false);
        } catch(err) {
            assert(err.message.includes("Assert Failed"));
        }
    });

    it("Should not satisfy all ones", async () => {

        const inp = getBits( (1n << 64n) - 1n , 64);
        try {
            await cir.calculateWitness({in: inp}, true);
            assert(false);
        } catch(err) {
            assert(err.message.includes("Assert Failed"));
        }
    });

});