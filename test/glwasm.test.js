const chai = require("chai");
const assert = chai.assert;
const buildGLWasm = require("../src/glwasm.js");
const { P } = require("../src/poseidon_constants_opt.js");

describe("Goldilocks Wasm test", function () {
    let glwasm;

    this.timeout(10000000);

    before( async() => {
        glwasm = await buildGLWasm();
    });

    it("Should do a normal adition", async () => {
        const a = glwasm.add(1n,3n);
        assert.equal(a, 4n);

        let b = glwasm.add(0xFFFFFFFFFFFFFFFFn,0xFFFFFFFFFFFFFFFFn);
        b = b<0 ? b + 0x10000000000000000n : b;
        assert.equal(b, 0x1fffffffcn);

    });
    it("benchmark bigInt", async () => {
        const p = 0xFFFFFFFF00000001n
        let acc = 0n;
        for (let i=0n; i<100000000n; i++) {
            acc = (acc + i) % p;
        }
        console.log(acc);
    });
    it("benchmark wasm", async () => {
        let acc = 0n;
        for (let i=0n; i<100000000n; i++) {
            acc = glwasm .add(acc, i);
        }
        acc = acc<0 ? acc + 0x10000000000000000n : acc;
        console.log(acc);
    });
});