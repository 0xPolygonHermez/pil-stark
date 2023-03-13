const chai = require("chai");
const assert = chai.assert;
const F3g = require("../src/helpers/f3g");



describe("test sqrt", async function () {
    this.timeout(10000000);
    let F;

    before(async () => { 
        F = new F3g();
    })

    it("It do an sqrt", async () => {
        const a = 4n;
        const res = F.sqrt(a);
        assert(F.eq(res, 2n));
    });

    it("It do 100 randoms", async () => {
        for (let i=0; i<100; i++) {
            const a = F.random();
            const a2 = F.square(a);
            const res = F.sqrt(a2);
            assert(F.eq(res, a) || F.eq(res, F.neg(a)));
        }
    });

    it("It do an invalid sqrt", async () => {
        const a = F.nqr;
        const res = F.sqrt(a);
        assert(res === null);
    });

});