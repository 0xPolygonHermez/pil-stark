const chai = require("chai");
const assert = chai.assert;
const F3g = require("../src/helpers/f3g");



describe("test fft", async function () {
    this.timeout(10000000);
    let F;

    before(async () => { 
        F = new F3g();
    })


    it("It do an fft and reverse it", async () => {
        const a = [1n,2n,3n,5n];
        const A = F.fft(a);
        const ac = F.ifft(A);
        for (let i=0; i<a.length; i++) {
            assert(F.eq(a[i], ac[i]));
        }
    });

    it("It do an fft size=64 and random and reverse it", async () => {
        const a = [];
        for (let i=0; i<64; i++) {
            a[i] = F.random();
        }
        const A = F.fft(a);
        const ac = F.ifft(A);
        for (let i=0; i<a.length; i++) {
            assert(F.eq(a[i], ac[i]));
        }
    });

});