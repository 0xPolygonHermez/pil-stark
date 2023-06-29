const workerpool = require("workerpool");
const { BigBuffer } = require("ffjavascript");
const { fft_block, interpolatePrepareBlock } = require("./fft_worker.bn128.js");

const useThreads = false;

function log2(V) {
    return (((V & 0xFFFF0000) !== 0 ? (V &= 0xFFFF0000, 16) : 0) | ((V & 0xFF00FF00) !== 0 ? (V &= 0xFF00FF00, 8) : 0) | ((V & 0xF0F0F0F0) !== 0 ? (V &= 0xF0F0F0F0, 4) : 0) | ((V & 0xCCCCCCCC) !== 0 ? (V &= 0xCCCCCCCC, 2) : 0) | ((V & 0xAAAAAAAA) !== 0));
}

function BR(x, domainPow) {
    x = (x >>> 16) | (x << 16);
    x = ((x & 0xFF00FF00) >>> 8) | ((x & 0x00FF00FF) << 8);
    x = ((x & 0xF0F0F0F0) >>> 4) | ((x & 0x0F0F0F0F) << 4);
    x = ((x & 0xCCCCCCCC) >>> 2) | ((x & 0x33333333) << 2);
    return (((x & 0xAAAAAAAA) >>> 1) | ((x & 0x55555555) << 1)) >>> (32 - domainPow);
}

function traspose(buffDst, buffSrc, nPols, nBits, trasposeBits, Fr) {
    const n = 1 << nBits;
    const w = 1 << trasposeBits;
    const h = n / w;

    for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
            const fi = j * w + i;
            const di = i * h + j;
            const src = buffSrc.slice(fi * nPols * Fr.n8, (fi * nPols + nPols) * Fr.n8);

            buffDst.set(src, di * nPols * Fr.n8);
        }
    }
}

async function bitReverse(buffDst, buffSrc, nPols, nBits, Fr) {
    const n = 1 << nBits;

    for (let i = 0; i < n; i++) {
        const ri = BR(i, nBits);
        const src = buffSrc.slice(ri * nPols * Fr.n8, (ri * nPols + nPols) * Fr.n8);

        buffDst.set(src, i * nPols * Fr.n8);
    }
}

async function interpolateBitReverse(buffDst, buffSrc, nPols, nBits, Fr) {
    const n = 1 << nBits;

    for (let i = 0; i < n; i++) {
        const ri = BR(i, nBits);
        const rii = (n - ri) % n;
        const src = buffSrc.slice(rii * nPols * Fr.n8, (rii * nPols + nPols) * Fr.n8);

        buffDst.set(src, i * nPols * Fr.n8);
    }
}

async function invBitReverse(buffDst, buffSrc, nPols, nBits, Fr) {
    const n = 1 << nBits;
    const nInv = Fr.inv(Fr.e(n));

    for (let i = 0; i < n; i++) {
        const ri = BR(i, nBits);
        const rii = (n - ri) % n;

        for (let p = 0; p < nPols; p++) {
            const val = buffSrc.slice((rii * nPols + p) * Fr.n8, (rii * nPols + p + 1) * Fr.n8)
            buffDst.set(Fr.mul(val, nInv), (i * nPols + p) * Fr.n8);
        }
    }
}

const maxNperThread = 1 << 18;
async function interpolatePrepare(pool, buff, nPols, nBits, Fr) {
    const n = 1 << nBits;
    const invN = Fr.inv(Fr.e(n));
    const promisesLH = [];
    let res = [];

    const maxNPerThread = 1 << 18;
    const minNPerThread = 1 << 12;

    let nPerThreadF = Math.floor((n - 1) / pool.maxWorkers) + 1;

    const maxCorrected = Math.floor(maxNPerThread / nPols);
    const minCorrected = Math.floor(minNPerThread / nPols);

    if (nPerThreadF > maxCorrected) nPerThreadF = maxCorrected;
    if (nPerThreadF < minCorrected) nPerThreadF = minCorrected;

    for (let i = 0; i < n; i += nPerThreadF) {
        const curN = Math.min(nPerThreadF, n - i);
        const bb = buff.slice(i * nPols * Fr.n8, (i + curN) * nPols * Fr.n8);
        let start = invN;
        if (useThreads) {
            promisesLH.push(pool.exec("interpolatePrepareBlock", [bb, nPols, start, i / nPerThreadF, Math.floor(n / nPerThreadF)]));
        } else {
            res.push(await interpolatePrepareBlock(bb, nPols, start, i / nPerThreadF, Math.floor(n / nPerThreadF)));
        }
    }
    if (useThreads) {
        res = await Promise.all(promisesLH)
    }
    for (let i = 0; i < res.length; i++) {
        buff.set(res[i], i * nPerThreadF * nPols * Fr.n8);
    }
}

// Adjustable parametees
const maxBlockBits = 16;
const minBlockBits = 12;
//const maxBlockBits = 2;
//const minBlockBits = 2;
const blocksPerThread = 8;
async function _fft(buffSrc, nPols, nBits, buffDst, inverse, Fr) {
    const n = 1 << nBits;
    const tmpBuff = new BigBuffer(n * nPols * Fr.n8);
    const outBuff = buffDst;

    let bIn, bOut;

    const pool = workerpool.pool(__dirname + '/fft_worker.bn128.js');

    const idealNBlocks = pool.maxWorkers * blocksPerThread;
    let blockBits = log2(n * nPols / idealNBlocks);
    if (blockBits < minBlockBits) blockBits = minBlockBits;
    if (blockBits > maxBlockBits) blockBits = maxBlockBits;
    blockBits = Math.min(nBits, blockBits);
    const blockSize = 1 << blockBits;
    const nBlocks = n / blockSize;

    let nTrasposes;
    if (nBits == blockBits) {
        nTrasposes = 0;
    } else {
        nTrasposes = Math.floor((nBits - 1) / blockBits) + 1;
    }

    if (nTrasposes & 1) {
        bOut = tmpBuff;
        bIn = outBuff;
    } else {
        bOut = outBuff;
        bIn = tmpBuff;
    }

    if (inverse) {
        await invBitReverse(bOut, buffSrc, nPols, nBits, Fr);
    } else {
        await bitReverse(bOut, buffSrc, nPols, nBits, Fr);
    }

    [bIn, bOut] = [bOut, bIn];

    for (let i = 0; i < nBits; i += blockBits) {
        const sInc = Math.min(blockBits, nBits - i);
        const promisesFFT = [];
        let results = [];
        for (j = 0; j < nBlocks; j++) {
            console.log("nBlocks", nBlocks);
            const bb = bIn.slice(j * blockSize * nPols * Fr.n8, (j + 1) * blockSize * nPols * Fr.n8);
            if (useThreads) {
                promisesFFT.push(pool.exec("fft_block", [bb, j * blockSize, nPols, nBits, i + sInc, blockBits, sInc]));
            } else {
                results[j] = await fft_block(bb, j * blockSize, nPols, nBits, i + sInc, blockBits, sInc);
            }
        }
        if (useThreads) results = await Promise.all(promisesFFT);
        for (let i = 0; i < results.length; i++) {
            bIn.set(results[i], i * blockSize * nPols * Fr.n8);
        }
        if (sInc < nBits) {                // Do not transpose if it's the same
            traspose(bOut, bIn, nPols, nBits, sInc, Fr);
            [bIn, bOut] = [bOut, bIn];
        }
    }

    await pool.terminate();
}

async function fft(buffSrc, nPols, nBits, buffDst, Fr) {
    await _fft(buffSrc, nPols, nBits, buffDst, false, Fr)
}

async function ifft(buffSrc, nPols, nBits, buffDst, Fr) {
    await _fft(buffSrc, nPols, nBits, buffDst, true, Fr)
}

async function interpolate(buffSrc, nPols, nBits, buffDstCoefs, buffDst, nBitsExt, Fr) {
    const n = 1 << nBits;
    const nExt = 1 << nBitsExt;
    const tmpBuff = new BigBuffer(nExt * nPols * Fr.n8);
    const outBuff = buffDst;

    let bIn, bOut;

    const pool = workerpool.pool(__dirname + '/fft_worker.bn128.js');

    const idealNBlocks = pool.maxWorkers * blocksPerThread;
    let nTrasposes = 0;


    let blockBits = log2(n * nPols / idealNBlocks);
    if (blockBits < minBlockBits) blockBits = minBlockBits;
    if (blockBits > maxBlockBits) blockBits = maxBlockBits;
    blockBits = Math.min(nBits, blockBits);
    const blockSize = 1 << blockBits;
    const nBlocks = n / blockSize;

    if (blockBits < nBits) {
        nTrasposes += Math.floor((nBits - 1) / blockBits) + 1;
    }

    nTrasposes += 1 // The middle convertion

    let blockBitsExt = log2(nExt * nPols / idealNBlocks);
    if (blockBitsExt < minBlockBits) blockBitsExt = minBlockBits;
    if (blockBitsExt > maxBlockBits) blockBitsExt = maxBlockBits;
    blockBitsExt = Math.min(nBitsExt, blockBitsExt);
    const blockSizeExt = 1 << blockBitsExt;
    const nBlocksExt = nExt / blockSizeExt;

    if (blockBitsExt < nBitsExt) {
        nTrasposes += Math.floor((nBitsExt - 1) / blockBitsExt) + 1;
    }


    if (nTrasposes & 1) {
        bOut = tmpBuff;
        bIn = outBuff;
    } else {
        bOut = outBuff;
        bIn = tmpBuff;
    }

    console.log("Interpolating reverse....")
    await interpolateBitReverse(bOut, buffSrc, nPols, nBits, Fr);
    [bIn, bOut] = [bOut, bIn];

    for (let i = 0; i < nBits; i += blockBits) {
        console.log("Layer ifft" + i);
        const sInc = Math.min(blockBits, nBits - i);
        const promisesFFT = [];
        let results = [];
        for (j = 0; j < nBlocks; j++) {
            const bb = bIn.slice(j * blockSize * nPols * Fr.n8, (j + 1) * blockSize * nPols * Fr.n8);
            if (useThreads) {
                promisesFFT.push(pool.exec("fft_block", [bb, j * blockSize, nPols, nBits, i + sInc, blockBits, sInc]));
            } else {
                results[j] = await fft_block(bb, j * blockSize, nPols, nBits, i + sInc, blockBits, sInc);
            }
        }
        if (useThreads) results = await Promise.all(promisesFFT);
        for (let i = 0; i < results.length; i++) {
            bIn.set(results[i], i * blockSize * nPols * Fr.n8);
        }

        if (sInc < nBits) {                // Do not transpose if it's the same
            traspose(bOut, bIn, nPols, nBits, sInc, Fr);
            [bIn, bOut] = [bOut, bIn];
        }
    }

    console.log("Interpolating prepare....")
    await interpolatePrepare(pool, bIn, nPols, nBits, Fr);
    buffDstCoefs.set(bIn.slice(0, buffDstCoefs.byteLength));

    console.log("Bit reverse....")
    await bitReverse(bOut, bIn, nPols, nBitsExt, Fr);
    [bIn, bOut] = [bOut, bIn];

    for (let i = 0; i < nBitsExt; i += blockBitsExt) {
        console.log("Layer fft " + i);
        const sInc = Math.min(blockBitsExt, nBitsExt - i);
        const promisesFFT = [];
        let results = [];
        for (j = 0; j < nBlocksExt; j++) {
            const bb = bIn.slice(j * blockSizeExt * nPols * Fr.n8, (j + 1) * blockSizeExt * nPols * Fr.n8);
            if (useThreads) {
                promisesFFT.push(pool.exec("fft_block", [bb, j * blockSizeExt, nPols, nBitsExt, i + sInc, blockBitsExt, sInc]));
            } else {
                results[j] = await fft_block(bb, j * blockSizeExt, nPols, nBitsExt, i + sInc, blockBitsExt, sInc);
            }
        }
        if (useThreads) {
            results = await Promise.all(promisesFFT);
        }
        for (let i = 0; i < results.length; i++) {
            bIn.set(results[i], i * blockSizeExt * nPols * Fr.n8);
        }

        if (sInc < nBitsExt) {                // Do not transpose if it's the same
            traspose(bOut, bIn, nPols, nBitsExt, sInc, Fr);
            [bIn, bOut] = [bOut, bIn];
        }
    }
    console.log("interpolation terminated");

    await pool.terminate();
    console.log("pool terminated");
}

module.exports.fft = fft;
module.exports.ifft = ifft;
module.exports.interpolate = interpolate;
module.exports.traspose = traspose;


