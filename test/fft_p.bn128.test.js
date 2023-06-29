const chai = require("chai");
const assert = chai.assert;

const { BigBuffer, buildBn128 } = require("ffjavascript");
const { fft, ifft, interpolate } = require("../src/helpers/fft/fft_p.bn128");
const { extendPolBuffer } = require("../src/helpers/polutils");

describe("test fft", async function () {
    this.timeout(10000000);
    let Fr;

    before(async () => {
        curve = await buildBn128();
        Fr = curve.Fr;
    })

    after(async () => {
        curve.terminate();
    });

    function getBufferInitialized(pols, degree) {
        const coefficients = new BigBuffer(pols * degree * Fr.n8);

        for (let i = 0; i < pols; i++) {
            for (let j = 0; j < degree; j++) {
                const value = i * degree + j;

                coefficients.set(Fr.e(value), (j * pols + i) * Fr.n8);
            }
        }
        return coefficients;
    }

    function getArrayInitialized(pols, degree) {
        const coefficients = [];
        for (let i = 0; i < pols; i++) {
            coefficients[i] = new BigBuffer(degree * Fr.n8);

            for (let j = 0; j < degree; j++) {
                const value = i * degree + j;

                coefficients[i].set(Fr.e(value), j * Fr.n8);
            }
        }
        return coefficients;
    }

    function checkEquivalence(buffer, array) {
        const nPols = array.length;
        assert(nPols > 0);

        const byteLength = array[0].byteLength;
        const degree = byteLength / Fr.n8;
        assert(degree > 0);

        // Check all degrees array are equal
        for (let i = 1; i < nPols; i++) {
            assert.equal(array[i].byteLength, byteLength);
        }

        // Check buffer length is correct according to degree and nPols
        assert.equal(buffer.byteLength, nPols * degree * Fr.n8);

        // Check all coefficients are equal
        console.log("Check equality of evaluations");
        for (let i = 0; i < nPols; i++) {
            for (let j = 0; j < degree; j++) {
                let valA = array[i].slice(j * Fr.n8, (j + 1) * Fr.n8);
                let valB = buffer.slice((j * nPols + i) * Fr.n8, (j * nPols + i + 1) * Fr.n8);

                assert(Fr.eq(valA, valB));
            }
        }
    }

    it("It checks equivalence is working", async () => {
        let nPols = 5;
        let degree = 3;

        let elementsA = getArrayInitialized(nPols, degree);
        let elementsB = getBufferInitialized(nPols, degree);

        checkEquivalence(elementsB, elementsA);
    });

    it("It checks fft", async () => {
        await _testFft(5, 2);
        await _testFft(15, 5);

        async function _testFft(nBits, nPols) {
            const degree = 1 << nBits;

            // Coefficients and evaluations using legacy fft from Fr. As an array of coefficients
            const coefsA = getArrayInitialized(nPols, degree)
            const evalsA = [];

            // Coefficients and evaluations using fft_p. As a buffer with all the polynomial coefficients in row major order
            const coefsB = getBufferInitialized(nPols, degree);
            const evalsB = new BigBuffer(degree * nPols * Fr.n8);

            console.log("Legacy fft");
            for (let i = 0; i < nPols; i++) {
                evalsA[i] = await Fr.fft(coefsA[i]);
            }

            console.log("fft using a row major big array of degree " + degree + " and " + nPols + " polynomials");

            console.log("FFT using a row major big array");
            await fft(coefsB, nPols, nBits, evalsB, Fr);

            console.log("Check equality of evaluations");
            checkEquivalence(evalsB, evalsA);
        }
    });

    it("It checks ifft", async () => {
        await _testIfft(5, 2);
        await _testIfft(15, 5);

        async function _testIfft(nBits, nPols) {
            const degree = 1 << nBits;

            // Coefficients and evaluations using legacy fft from Fr. As an array of coefficients
            const evalsA = getArrayInitialized(nPols, degree)
            const coefsA = [];

            // Coefficients and evaluations using fft_p. As a buffer with all the polynomial coefficients in row major order
            const evalsB = getBufferInitialized(nPols, degree);
            const coefsB = new BigBuffer(degree * nPols * Fr.n8);

            console.log("Legacy ifft");
            for (let i = 0; i < nPols; i++) {
                coefsA[i] = await Fr.ifft(evalsA[i]);
            }

            console.log("IFFT using a row major big array");
            await ifft(evalsB, nPols, nBits, coefsB, Fr);

            console.log("Check equality of evaluations");
            checkEquivalence(coefsB, coefsA);
        }
    });

    it("It checks interpolate ", async () => {
        await _testInterpolate(3, 1, 1);
        await _testInterpolate(15, 3, 2);

        async function _testInterpolate(nBits, nPols, extBits) {
            const degree = 1 << nBits;
            const degreeExt = 1 << (nBits + extBits);

            // Coefficients and evaluations using legacy fft from Fr. As an array of coefficients
            const coefsA = getArrayInitialized(nPols, degree)
            const evalsA = [];

            // Coefficients and evaluations using fft_p. As a buffer with all the polynomial coefficients in row major order
            const coefsB = getBufferInitialized(nPols, degree);
            const coefs = new BigBuffer(degree * nPols * Fr.n8);
            const evalsB = new BigBuffer(degreeExt * nPols * Fr.n8);

            console.log("Legacy interpolate");
            for (let i = 0; i < nPols; i++) {
                const evalsABuffer = new BigBuffer(coefsA[i].byteLength << extBits);
                evalsA[i] = await extendPolBuffer(Fr, coefsA[i], evalsABuffer);
            }

            console.log("Interpolate using a row major big array");
            await interpolate(coefsB, nPols, nBits, coefs, evalsB, nBits + extBits, Fr);

            console.log("Check equality of interpolations");
            checkEquivalence(evalsB, evalsA);
        }
    });
});
