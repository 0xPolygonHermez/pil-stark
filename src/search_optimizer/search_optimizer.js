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

module.exports.exhaustiveSearchOptimizerFflonk = async function (curve, ptauFilename, currentPowerOfTwo, nIntermediatePols, numP) {
    // TODO previously we have to compute the ratio between msm and fft for each power of two
    const iterations = 5;
    const currentRatio = await getRatioMSMtoFFT(curve, ptauFilename, currentPowerOfTwo, iterations);

    // Build a table with all the possible combinations from nLowBound to nHighBound
    const nLowBound = 3;
    const nHighBound = 10;

    let costsByDegree = constructFflonkCostTable(nLowBound, nHighBound, currentPowerOfTwo, nIntermediatePols, numP, currentRatio);

    // Search the minimum cost
    let minValue = costsByDegree[0].cost;
    let minIndex = 0;
    for (let i = 1; i < costsByDegree.length; i++) {

        if (costsByDegree[i].cost < minValue) {
            minValue = costsByDegree[i].cost;
            minIndex = i;
        }
    }

    return costsByDegree[minIndex];
}
 
function constructFflonkCostTable(nLowBound, nHighBound, currentPowerOfTwo, numI, numP, currentRatio) {
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
    return data;
}

function computeCostByDegree(blowup, ratioMSMtoFFT, numI, numP) {
    return ratioMSMtoFFT * (numI + blowup - 1) + (numP + numI) * Math.pow(2, blowup - 1);
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
