const { fftBench, ifftBench } = require("./bench_fft.js");
const { msmBench } = require("./bench_msm.js");
const path = require("path");
const binFileUtils = require("@iden3/binfileutils");
const { BigBuffer } = require("ffjavascript");
const { get } = require("http");

const MAX_PTAU_DEGREE = 28;

// Exhaustive Search Optimizer
// This is a simple optimizer that tries all possible combinations with the used powers of tau
// to potimize the number of scalar multiplications.

module.exports.exhaustiveSearchOptimizerFflonk = async function (curve, ptauFilename, currentPowerOfTwo, iterations) {
    // TODO previously we have to compute the ratio between msm and fft for each power of two
    const currentRatio = await getRatioMSMtoFFT(curve, ptauFilename, currentPowerOfTwo, iterations);

    // from 3n to 10n
    const nLowBound = 3;
    const nHighBound = 10;
    const numI = 10; //TODO CHANGE
    const numP = 10; //TODO CHANGE

    // TODO review the formula
    // deg(P(x)) deg(Z(X))  blowup   MSM              FT            Max degree
    //    3n        2n        2    #Im + 2         2F #Im + P        n <= 2^27
    //    4n        3n        3    #Im + 3         4F #Im + P        n <= 2^26
    //    5n        4n        3    #Im + 4         4F #Im + P        n <= 2^26
    //    6n        5n        4    #Im + 5         8F #Im + P        n <= 2^25
    //    7n        6n        4    #Im + 6         8F #Im + P        n <= 2^25
    //    8n        7n        4    #Im + 7         8F #Im + P        n <= 2^25
    //    9n        8n        4    #Im + 8         8F #Im + P        n <= 2^25
    //   10n        9n        5    #Im + 9         16F #Im + P        n <= 2^24

    let data = [];
    for (let i = nLowBound; i <= nHighBound; i++) {
        const blowup = Math.floor(Math.log2(i - 2)) + 2;

        const maxPowerOfTwo = MAX_PTAU_DEGREE - (blowup - 1);

        if (currentPowerOfTwo <= maxPowerOfTwo) {
            const _data = {
                degP: i,
                degZ: i - 1,
                blowup,
                msm: numI + i - 1,
                fft: (numP + numI) * Math.pow(2, blowup - 1),
                maxDeg: maxPowerOfTwo
            };

            _data.cost = _data.msm * currentRatio + _data.fft;
            console.log(_data);
            data.push(_data);
        }
    }

    // Search the best, the lowesrt cost
    let minValue = data[0].cost;
    let minIndex = 0;
    for (let i = 1; i < data.length; i++) {

        if (data[i].cost < minValue) {
            minValue = data[i].cost;
            minIndex = i;
        }
    }

    return data[minIndex];
}

async function getRatioMSMtoFFT(curve, ptauFilename, powerOfTwo, iterations) {
    const sG1 = curve.G1.F.n8 * 2;
    const domain = Math.pow(2, powerOfTwo);

    const { fd: fdPTau, sections: pTauSections } = await binFileUtils.readBinFile(ptauFilename, "ptau", 1, 1 << 22, 1 << 24);

    if (pTauSections[2][0].size < domain * curve.G1.F.n8 * 2) {
        throw new Error("Powers of Tau is not big enough for this circuit size. Section 2 too small.");
    }

    const PTau = new BigBuffer(domain * sG1);
    await fdPTau.readToBuffer(PTau, 0, domain * sG1, pTauSections[2][0].p);

    let ratioMSM = await msmBench(curve, PTau, powerOfTwo, 1);

    fdPTau.close();

    await msmBench(curve, PTau, powerOfTwo, iterations);

    let ratioFFT = await fftBench(curve, powerOfTwo, iterations);
    let ratioIFFT = await ifftBench(curve, powerOfTwo, iterations);

    return ratioMSM / ratioFFT;
}
