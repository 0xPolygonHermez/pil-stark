const { assert } = require("chai");

const F3g = require("../src/helpers/f3g");

describe("f3g", function () {
    let F;
    this.timeout(100000);

    before( async() => {
        F = new F3g();
    });

    it("shoud do an addition", async () => {
        const a = [1n, 2n, 3n];
        const b = [4n, 5n, 0xFFFFFFFF00000000n];
        const c = F.add(a, b);
        assert(F.eq(c, [5n, 7n, 2n]));
    });

    it("shoud do a substraction", async () => {
        const a = [1n, 2n, 3n];
        const b = [4n, 5n, 0xFFFFFFFF00000000n];
        const c = F.sub(a, b);
        assert(F.eq(c, F.e([-3, -3, 4])));
    });

    it("shoud do a negation", async () => {
        const a = [4n, 5n, 0xFFFFFFFF00000000n];
        const c = F.neg(a);
        assert(F.eq(c, F.e([-4, -5, 1])));
    });

    it("shoud do a multiplication", async () => {
        const a = [1n, 2n, 3n];
        const b = [4n, 5n, 0xFFFFFFFF00000000n];
        const c = F.mul(a, b);
        assert(F.eq(c, F.e([17, 23, 18])));
    });

    it("shoud do an inverse", async () => {
        const a = [1n, 2n, 3n];
        const b = F.inv(a);
        const c = F.mul(a,b);
        assert(F.eq(c, F.one));
    });

    it("shoud do a batch inverse", async () => {
        const a = [5n, 6n, [7n, 8n, 9n]];
        const aInv = F.batchInverse(a);
        for (let i=0; i<3; i++) {
            assert(F.eq(F.inv(a[i]), aInv[i]))
        }
    });

    it("shoud check that buffer to Little Endian and viceversa works fine", async () => {
        const buff = new Uint8Array(F.n8);
        const a = 18446744069414584316n;
        F.toRprLE(buff, 0, a, F.n8);
        assert(F.fromRprLE(buff, 0, F.n8) === a); 
        
        const buff2 = new Uint8Array(F.n8);
        const b = 440699314584458n;
        F.toRprLE(buff2, 0, b, F.n8);
        assert(F.fromRprLE(buff2, 0, F.n8) === b); 

        const buff3 = new Uint8Array(F.n8);
        const c = 9n;
        F.toRprLE(buff3, 0, c, F.n8);
        assert(F.fromRprLE(buff3, 0, F.n8) === c); 
    });

});
