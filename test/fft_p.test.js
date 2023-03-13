const chai = require("chai");
const { BigBuffer } = require("pilcom");
const assert = chai.assert;
const {fft, ifft, interpolate} = require("../src/helpers/fft/fft_p");
const {extendPol} = require("../src/helpers/polutils");
const F3g = require("../src/helpers/f3g");


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
        const buff1 = new BigBuffer(n*nPols);
        const buff2 = new BigBuffer(n*nPols*(1 << extBits));

        console.log("Initializing...");
        for (let i=0; i<nPols; i++) {
            for (let j=0; j<n; j++) {
                const v = BigInt(i) * 0n + BigInt(j);
                buff1.setElement(j*nPols + i, v);
            }
        }

        console.log("interpolate...");
        await interpolate(buff1, nPols, nBits, buff2, nBits+extBits);

    });

    it("Check fft", async () => {
        let nBits = 5;
        let nPols = 2;

        const n = 1 << nBits;
        const buff = new BigBuffer(n*nPols);
        const buffOut = new BigBuffer(n*nPols);

        console.log("Initializing...");
        const pols = [];
        for (let i=0; i<nPols; i++) {
            pols[i] = [];
            for (let j=0; j<n; j++) {
                const v = BigInt(i) * 0n + BigInt(j);
                pols[i][j] = v;
                buff.setElement(j*nPols + i, v);
            }
        }
        const polsV = [];
        for (let i=0; i<nPols; i++) {
            console.log("legacy fft ..." + i);
            polsV[i] = F.fft(pols[i]);
        }

        console.log("fft...");
        await fft(buff, nPols, nBits, buffOut);

        console.log("check...");
        for (let i=0; i<nPols; i++) {
            for (let j=0; j<n; j++) {
                assert(F.eq(polsV[i][j], buffOut.getElement(j*nPols + i)));
            }
        }
    });

    it("Check interpolate", async () => {
        let nBits = 3;
        let nPols = 1;
        let extBits =1;

        const n = 1 << nBits;
        const nExt = 1 << (nBits + extBits);
        const buff = new BigBuffer(n*nPols);
        const buffOut = new BigBuffer(nExt*nPols);


        console.log("Initializing...");
        const pols = [];
        for (let i=0; i<nPols; i++) {
            pols[i] = [];
            for (let j=0; j<n; j++) {
                const v = BigInt(i) * 0n + BigInt(j);
                pols[i][j] = v;
                buff.setElement(j*nPols + i, v);
            }
        }
        const polsV = [];
        for (let i=0; i<nPols; i++) {
            console.log("legacy interpolate ..." + i);
            polsV[i] = extendPol(F, pols[i], extBits);
        }

        console.log("interpolate...");
        await interpolate(buff, nPols, nBits, buffOut, nBits+extBits);

        console.log("check...");
        for (let i=0; i<nPols; i++) {
            for (let j=0; j<nExt; j++) {
                assert(F.eq(polsV[i][j], buffOut.getElement(j*nPols + i)));
            }
        }
    });

    it("Check fft", async () => {
        let nBits = 18;
        let nPols = 5;

        const n = 1 << nBits;
        const buff = new BigBuffer(n*nPols);
        const buffOut = new BigBuffer(n*nPols);


        console.log("Initializing...");
        const pols = [];
        for (let i=0; i<nPols; i++) {
            pols[i] = [];
            for (let j=0; j<n; j++) {
                const v = BigInt(i) * 0n + BigInt(j);
                pols[i][j] = v;
                buff.setElement(j*nPols + i, v);
            }
        }
        const polsV = [];
        for (let i=0; i<nPols; i++) {
            console.log("legacy fft ..." + i);
            polsV[i] = F.fft(pols[i]);
        }

        console.log("fft...");
        await fft(buff, nPols, nBits, buffOut);

        console.log("check...");
        for (let i=0; i<nPols; i++) {
            for (let j=0; j<n; j++) {
                assert(F.eq(polsV[i][j], buffOut.getElement(j*nPols + i)));
            }
        }
    });

    it("Check ifft", async () => {
        let nBits = 18;
        let nPols = 5;

        const n = 1 << nBits;
        const buff = new BigBuffer(n*nPols);
        const buffOut = new BigBuffer(n*nPols);


        console.log("Initializing...");
        const pols = [];
        for (let i=0; i<nPols; i++) {
            pols[i] = [];
            for (let j=0; j<n; j++) {
                const v = BigInt(i) * 0n + BigInt(j);
                pols[i][j] = v;
                buff.setElement(j*nPols + i, v);
            }
        }
        const polsV = [];
        for (let i=0; i<nPols; i++) {
            console.log("legacy ifft ..." + i);
            polsV[i] = F.ifft(pols[i]);
        }

        console.log("ifft...");
        await ifft(buff, nPols, nBits, buffOut);

        console.log("check...");
        for (let i=0; i<nPols; i++) {
            for (let j=0; j<n; j++) {
                assert(F.eq(polsV[i][j], buffOut.getElement(j*nPols + i)));
            }
        }
    });


    it("Check interpolate", async () => {
        let nBits = 18;
        let nPols = 5;
        let extBits =1;

        const n = 1 << nBits;
        const nExt = 1 << (nBits + extBits);
        const buff = new BigBuffer(n*nPols);
        const buffOut = new BigBuffer(nExt*nPols);


        console.log("Initializing...");
        const pols = [];
        for (let i=0; i<nPols; i++) {
            pols[i] = [];
            for (let j=0; j<n; j++) {
                const v = BigInt(i) * 0n + BigInt(j);
                pols[i][j] = v;
                buff.setElement(j*nPols + i, v);
            }
        }
        const polsV = [];
        for (let i=0; i<nPols; i++) {
            console.log("legacy interpolate ..." + i);
            polsV[i] = extendPol(F, pols[i], extBits);
        }

        console.log("fft...");
        await interpolate(buff, nPols, nBits, buffOut, nBits+extBits);

        console.log("check...");
        for (let i=0; i<nPols; i++) {
            for (let j=0; j<nExt; j++) {
                assert(F.eq(polsV[i][j], buffOut.getElement(j*nPols + i)));
            }
        }
    });

});