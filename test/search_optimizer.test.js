const { fftBench, ifftBench } = require("../src/fflonk/search_optimizer/bench_fft.js");

const { msmBench } = require("../src/fflonk/search_optimizer/bench_msm.js");
const chai = require("chai");
const path = require("path");
const assert = chai.assert;
const binFileUtils = require("@iden3/binfileutils");
const { BigBuffer } = require("ffjavascript");


const { buildBn128 } = require("ffjavascript");
const { exhaustiveSearchOptimizerFflonk } = require("../src/fflonk/search_optimizer/search_optimizer.js");

describe("test search optimizer", async function () {
    this.timeout(10000000);

    let curve;
    const powerOfTwo = 10;
    const iterations = 5;
    const ptauFilename = path.join(__dirname, "../", "tmp", "powersOfTau28_hez_final_19.ptau");

    let PTau;
    let domain;

    before(async () => {
        curve = await buildBn128();

        // Prepare PTau
        const sG1 = curve.G1.F.n8 * 2;
        domain = Math.pow(2, powerOfTwo);

        const { fd: fdPTau, sections: pTauSections } = await binFileUtils.readBinFile(ptauFilename, "ptau", 1, 1 << 22, 1 << 24);

        if (pTauSections[2][0].size < domain * curve.G1.F.n8 * 2) {
            throw new Error("Powers of Tau is not big enough for this circuit size. Section 2 too small.");
        }

        PTau = new BigBuffer(domain * sG1);
        await fdPTau.readToBuffer(PTau, 0, domain * sG1, pTauSections[2][0].p);

        fdPTau.close();
    })
    after(async () => {
        curve.terminate();
    });

    // TESTS
    it("computes fft benches", async () => {
        let res = await fftBench(curve, powerOfTwo, iterations);
        console.log(`> FFT Bench for domain = ${domain} (2^${powerOfTwo}). Results in avg: ${res.toFixed(4)}  ms`);
    });

    it("computes ifft benches", async () => {
        let res = await ifftBench(curve, powerOfTwo, iterations);
        console.log(`> IFFT Bench for domain = ${domain} (2^${powerOfTwo}). Results in avg: ${res.toFixed(4)}  ms`);
    });

    it("computes MSM benches", async () => {
        let res = await msmBench(curve, PTau, powerOfTwo, iterations);
        console.log(`> MSM Bench for domain = ${domain} (2^${powerOfTwo}). Results in avg: ${res.toFixed(4)}  ms`);
    });

    it("it gets the MSMtoFFT ratio", async () => {
        let res = await exhaustiveSearchOptimizerFflonk(curve, ptauFilename, powerOfTwo);
        console.log(`> Best result for fflonk exhaustive search optimizer: ${res.degP}n`);
    });
});