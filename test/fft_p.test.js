const chai = require("chai");
const assert = chai.assert;
const F3g = require("../src/f3g");
const {fft, ifft, interpolate} = require("../src/fft_p");
const {extendPol} = require("../src/polutils");


function print(F, a) {
    console.log("[");
    for (let i=0; i<a.length; i++) {
        console.log(`${F.toString(a[i], 16)} :${F.toString(a[i])}`);
    }
    console.log("]");
}

describe("test fft", async function () {
    this.timeout(10000000);
    let F;

    before(async () => {
        F = new F3g();
    })


    it("Check big interpolate", async () => {
        let nBits = 18;
        let nPols = 3;
        let extBits = 1;

        const n = 1 << nBits;
        const buff1 = new BigUint64Array(n*nPols);
        const buff2 = new BigUint64Array(n*nPols*(1 << extBits));

        console.log("Initializing...");
        for (let i=0; i<nPols; i++) {
            for (let j=0; j<n; j++) {
                const v = BigInt(i) * 0n + BigInt(j);
                buff1[j*nPols + i] = v;
            }
        }

        console.log("interpolate...");
        await interpolate(buff1, 0, nPols, nBits, buff2, 0, nBits+extBits);

    });


    it("Check fft", async () => {
        let nBits = 5;
        let nPols = 2;

        const n = 1 << nBits;
        const buff = new BigUint64Array(n*nPols*8*2);

        console.log("Initializing...");
        const pols = [];
        for (let i=0; i<nPols; i++) {
            pols[i] = [];
            for (let j=0; j<n; j++) {
                const v = BigInt(i) * 0n + BigInt(j);
                pols[i][j] = v;
                buff[j*nPols + i] = v;
            }
        }
        const polsV = [];
        for (let i=0; i<nPols; i++) {
            console.log("legacy fft ..." + i);
            polsV[i] = F.fft(pols[i]);
        }

        console.log("fft...");
        await fft(buff, 0, nPols, nBits, buff, nPols*n*8);

        console.log("check...");
        for (let i=0; i<nPols; i++) {
            for (let j=0; j<n; j++) {
                assert(F.eq(polsV[i][j], buff[n*nPols + j*nPols + i]));
            }
        }
    });


    it("Check interpolate", async () => {
        let nBits = 3;
        let nPols = 1;
        let extBits =1;

        const n = 1 << nBits;
        const nExt = 1 << (nBits + extBits);
        const buff = new BigUint64Array(n*nPols*8*2);

        console.log("Initializing...");
        const pols = [];
        for (let i=0; i<nPols; i++) {
            pols[i] = [];
            for (let j=0; j<n; j++) {
                const v = BigInt(i) * 0n + BigInt(j);
                pols[i][j] = v;
                buff[j*nPols + i] = v;
            }
        }
        const polsV = [];
        for (let i=0; i<nPols; i++) {
            console.log("legacy interpolate ..." + i);
            polsV[i] = extendPol(F, pols[i], extBits);
        }

        console.log("interpolate...");
        await interpolate(buff, 0, nPols, nBits, buff, nPols*n*8, nBits+extBits);

        console.log("check...");
        for (let i=0; i<nPols; i++) {
            for (let j=0; j<nExt; j++) {
                assert(F.eq(polsV[i][j], buff[n*nPols + j*nPols + i]));
            }
        }
    });

    it("Check fft", async () => {
        let nBits = 18;
        let nPols = 5;

        const n = 1 << nBits;
        const buff = new BigUint64Array(n*nPols*8*2);

        console.log("Initializing...");
        const pols = [];
        for (let i=0; i<nPols; i++) {
            pols[i] = [];
            for (let j=0; j<n; j++) {
                const v = BigInt(i) * 0n + BigInt(j);
                pols[i][j] = v;
                buff[j*nPols + i] = v;
            }
        }
        const polsV = [];
        for (let i=0; i<nPols; i++) {
            console.log("legacy fft ..." + i);
            polsV[i] = F.fft(pols[i]);
        }

        console.log("fft...");
        await fft(buff, 0, nPols, nBits, buff, nPols*n*8);

        console.log("check...");
        for (let i=0; i<nPols; i++) {
            for (let j=0; j<n; j++) {
                assert(F.eq(polsV[i][j], buff[n*nPols + j*nPols + i]));
            }
        }
    });


    it("Check ifft", async () => {
        let nBits = 18;
        let nPols = 5;

        const n = 1 << nBits;
        const buff = new BigUint64Array(n*nPols*8*2);

        console.log("Initializing...");
        const pols = [];
        for (let i=0; i<nPols; i++) {
            pols[i] = [];
            for (let j=0; j<n; j++) {
                const v = BigInt(i) * 0n + BigInt(j);
                pols[i][j] = v;
                buff[j*nPols + i] = v;
            }
        }
        const polsV = [];
        for (let i=0; i<nPols; i++) {
            console.log("legacy ifft ..." + i);
            polsV[i] = F.ifft(pols[i]);
        }

        console.log("ifft...");
        await ifft(buff, 0, nPols, nBits, buff, nPols*n*8);

        console.log("check...");
        for (let i=0; i<nPols; i++) {
            for (let j=0; j<n; j++) {
                assert(F.eq(polsV[i][j], buff[n*nPols + j*nPols + i]));
            }
        }
    });


    it("Check interpolate", async () => {
        let nBits = 18;
        let nPols = 5;
        let extBits =1;

        const n = 1 << nBits;
        const nExt = 1 << (nBits + extBits);
        const buff = new BigUint64Array(n*nPols*8*2);

        console.log("Initializing...");
        const pols = [];
        for (let i=0; i<nPols; i++) {
            pols[i] = [];
            for (let j=0; j<n; j++) {
                const v = BigInt(i) * 0n + BigInt(j);
                pols[i][j] = v;
                buff[j*nPols + i] = v;
            }
        }
        const polsV = [];
        for (let i=0; i<nPols; i++) {
            console.log("legacy interpolate ..." + i);
            polsV[i] = extendPol(F, pols[i], extBits);
        }

        console.log("fft...");
        await interpolate(buff, 0, nPols, nBits, buff, nPols*n*8, nBits+extBits);

        console.log("check...");
        for (let i=0; i<nPols; i++) {
            for (let j=0; j<nExt; j++) {
                assert(F.eq(polsV[i][j], buff[n*nPols + j*nPols + i]));
            }
        }
    });
});