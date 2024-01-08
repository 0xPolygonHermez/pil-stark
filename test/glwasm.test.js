const chai = require("chai");
const assert = chai.assert;
const buildGLWasm = require("../src/helpers/glwasm.js").buildProtoboard;
const F3g = require("../src/helpers/f3g.js");
const LinearHash = require("../src/helpers/hash/linearhash/linearhash");
const LinearHashGPU = require("../src/helpers/hash/linearhash/linearhash_gpu");

const buildPoseidon = require("../src/helpers/hash/poseidon/poseidon");

describe("Goldilocks Wasm test", function () {
    let glwasm;
    let pIn, pOut;
    let poseidon;
    let lh;
    let lh_gpu;

    function testLinearHash(width, heigth, splitLinearHash) {
        const F = new F3g();

        const pIn = glwasm.alloc(width*heigth*8);
        const pOut = glwasm.alloc(heigth*4*8);
        for (let i=0; i<heigth; i++) {
            for (let j=0; j<width; j++) {
                glwasm.set(pIn+(i*width+j)*8, i*width+j);
            }
        }

        if(splitLinearHash) {
            glwasm.multiLinearHashGPU(pIn, width, heigth, pOut);
        } else {
            glwasm.multiLinearHash(pIn, width, heigth, pOut);
        }
      

        for (let i=0; i<heigth; i++) {
            let input = glwasm.get(pIn + (i*width)*8, width, 8);
            if (!Array.isArray(input)) input = [input];
            const output = glwasm.get(pOut+ i*4*8, 4, 8);
            const expectedOutput = splitLinearHash ? lh_gpu.hash(input) : lh.hash(input);

            for (let j = 0; j < 4; j++) {
                assert(F.eq(F.e(output[j].toString()), F.e(expectedOutput[j])));
            }
        }
    }


    this.timeout(10000000);

    before( async() => {
        glwasm = await buildGLWasm();
        pIn = glwasm.alloc(12*8);
        pOut = glwasm.alloc(4*8);
        poseidon = await buildPoseidon();
        lh_gpu = new LinearHashGPU(poseidon);
        lh = new LinearHash(poseidon);
    });

    it("Should do a normal adition", async () => {
        const a = glwasm.add(1n,3n);
        assert.equal(a, 4n);

        let b = glwasm.add(0xFFFFFFFFFFFFFFFFn,0xFFFFFFFFFFFFFFFFn);
        b = b<0 ? b + 0x10000000000000000n : b;
        assert.equal(b, 0x1fffffffcn);

    });
/*
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
*/
    it("Should do a normal multiplication", async () => {
        const p = 0xFFFFFFFF00000001n;

        let a = glwasm.mul(2n,3n);
        a = (a<0n) ? (a + 0x10000000000000000n) : a;
        assert.equal(a%p, 6n);

        const e1 = 0x0000000100000002n;
        const e2 = 0x0000000300000005n;
        let e = glwasm.mul(e1,e2);
        e = (e<0n) ? (e + 0x10000000000000000n) : e;
        assert.equal(e%p, (e1*e2)%p);

        const f1 = 0x0001000100010001n;
        let f = glwasm.mul(f1,f1);
        f = (f<0n) ? (f + 0x10000000000000000n) : f;
        assert.equal(f%p, (f1*f1)%p);

        const m = 0xFFFFFFFFFFFFFFFFn;

        let b = glwasm.mul(m,m);
        b = (b<0n) ? (b + 0x10000000000000000n) : b;
        assert.equal(b%p, (m*m)%p );


        const g1 = 121103344954917n;
        const g2 = 654219439964755n;
        let g = glwasm.mul(g1,g2);
        g = (g<0n) ? (g + 0x10000000000000000n) : g;
        assert.equal(g%p, (g1*g2)%p);

        const h1 = 18446744069414584320n;
        const h2 = 18446744073709551615n;
        let h = glwasm.mul(h1,h2);
        h = (h<0n) ? (h + 0x10000000000000000n) : h;
        assert.equal(h%p, (h1*h2)%p);

    });
/*
    it("benchmark mul bigInt", async () => {
        const p = 0xFFFFFFFF00000001n
        let acc = 1n;
        for (let i=1n; i<50000000n; i++) {
            acc = (acc * i) % p;
        }
        console.log(acc);
    });
    it("benchmark mul wasm", async () => {
        let acc = 1n;
        for (let i=1n; i<50000000n; i++) {
            acc = glwasm.mul(acc, i);
        }
        acc = acc<0 ? acc + 0x10000000000000000n : acc;
        console.log(acc);
    });
*/

    it("poseidon 1,2,3", async() => {
        const F = new F3g();
        let res;

        glwasm.set(pIn, [0,1,2,3,4,5,6,7,8,9,10,11]);
        glwasm.poseidon(pIn, 8, pIn+8*8, 4, pOut, 4);

        res = glwasm.get(pOut, 4, 8);

        const expectedRes = [F.e('0xd64e1e3efc5b8e9e'), F.e('0x53666633020aaa47'), F.e('0xd40285597c6a8825'), F.e('0x613a4f81e81231d2')];

        for (let i = 0; i < 4; i++) {
            assert(F.eq(F.e(res[i].toString()), expectedRes[i]));
        }
    });
    it("poseidon All neg1", async() => {
        const F = new F3g();
        let res;

        const n1 = 0xffffffff00000000n

        glwasm.set(pIn, [n1,n1,n1,n1, n1,n1,n1,n1,  n1,n1,n1,n1]);
        glwasm.poseidon(pIn, 8, pIn+8*8, 4, pOut, 4);

        res = glwasm.get(pOut, 4, 8);

        const expectedRes = [F.e('0xbe0085cfc57a8357'), F.e('0xd95af71847d05c09'), F.e('0xcf55a13d33c1c953'), F.e('0x95803a74f4530e82')];
        for (let i = 0; i < 4; i++) {
            assert(F.eq(F.e(res[i].toString()), expectedRes[i]));
        }
    });
    it("poseidon AllZeros", async() => {
        const F = new F3g();
        let res;

        glwasm.poseidon(pIn, 0, pIn+8*8, 0, pOut, 4);

        res = glwasm.get(pOut, 4, 8);

        const expectedRes = [F.e('0x3c18a9786cb0b359'), F.e('0xc4055e3364a246c3'), F.e('0x7953db0ab48808f4'), F.e('0xc71603f33a1144ca')];

        for (let i = 0; i < 4; i++) {
            assert(F.eq(F.e(res[i].toString()), expectedRes[i]));
        }
    });
    /*
    it("poseidon Performance", async() => {
        let res;

        for (let i=0; i<1000000; i++) {
            glwasm.set(pIn, i);
            glwasm.poseidon(pIn, 0, pIn+8*8, 0, pOut, 4);
        }
    });
    */
    it("it should do linearHash using gpu approach", async() => {
        testLinearHash(0,0, true);
        testLinearHash(0,1, true);
        testLinearHash(1,0, true);
        testLinearHash(1,1, true);
        testLinearHash(2,1, true);
        testLinearHash(3,1, true);
        testLinearHash(4,1, true);
        testLinearHash(5,1, true);
        testLinearHash(8,1, true);
        testLinearHash(9,1, true);
        testLinearHash(15,1, true);
        testLinearHash(16,1, true);
        testLinearHash(24,1, true);
        testLinearHash(25,1, true);
        testLinearHash(32,1, true);
        testLinearHash(33,1, true);
        testLinearHash(50,1, true);
        testLinearHash(1,10, true);
        testLinearHash(2,10, true);
        testLinearHash(3,10, true);
        testLinearHash(4,10, true);
        testLinearHash(5,10, true);
        testLinearHash(8,10, true);
        testLinearHash(9,10, true);
        testLinearHash(15,10, true);
        testLinearHash(16,10, true);
        testLinearHash(24,10, true);
        testLinearHash(25,10, true);
        testLinearHash(32,10, true);
        testLinearHash(33,10, true);
        testLinearHash(50,10, true);
    });

    it.skip("it should do linearHash using cpu approach", async() => {
        testLinearHash(0,0, false);
        testLinearHash(0,1, false);
        testLinearHash(1,0, false);
        testLinearHash(1,1, false);
        testLinearHash(2,1, false);
        testLinearHash(3,1, false);
        testLinearHash(4,1, false);
        testLinearHash(5,1, false);
        testLinearHash(8,1, false);
        testLinearHash(9,1, false);
        testLinearHash(15,1, false);
        testLinearHash(16,1, false);
        testLinearHash(24,1, false);
        testLinearHash(25,1, false);
        testLinearHash(32,1, false);
        testLinearHash(33,1, false);
        testLinearHash(50,1, false);
        testLinearHash(1,10, false);
        testLinearHash(2,10, false);
        testLinearHash(3,10, false);
        testLinearHash(4,10, false);
        testLinearHash(5,10, false);
        testLinearHash(8,10, false);
        testLinearHash(9,10, false);
        testLinearHash(15,10, false);
        testLinearHash(16,10, false);
        testLinearHash(24,10, false);
        testLinearHash(25,10, false);
        testLinearHash(32,10, false);
        testLinearHash(33,10, false);
        testLinearHash(50,10, false);
    });

});