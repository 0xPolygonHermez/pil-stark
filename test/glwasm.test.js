const chai = require("chai");
const assert = chai.assert;
const buildGLWasm = require("../src/glwasm.js");


const wasm_tester = require("circom_tester").wasm;

describe("Linear Hash Circuit Test", function () {
    let glwasm;

    this.timeout(10000000);

    before( async() => {
        glwasm = await buildGLWasm();
    });

    it("Should do a normal adition", async () => {
        const b = glwasm.add(1,2,3,5);
        assert(b==4);
    });
});