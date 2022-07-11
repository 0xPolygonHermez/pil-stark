const { assert } = require("chai");
const GL3 = require("./f3g.js");
const {log2} = require("./utils.js");
const {fft_block} = require("./fft_worker");
const workerpool = require("workerpool");

const F = new GL3();

function BR(x, domainPow)
{
    x = (x >>> 16) | (x << 16);
    x = ((x & 0xFF00FF00) >>> 8) | ((x & 0x00FF00FF) << 8);
    x = ((x & 0xF0F0F0F0) >>> 4) | ((x & 0x0F0F0F0F) << 4);
    x = ((x & 0xCCCCCCCC) >>> 2) | ((x & 0x33333333) << 2);
    return (((x & 0xAAAAAAAA) >>> 1) | ((x & 0x55555555) << 1)) >>> (32 - domainPow);
}
/*
function bitReverse(buff, bits) {
    for (let i=0; i<buff.length; i++) {
        const ir = BR(i, bits);
        if (i<ir) {
            [buff[i], buff[ir]] = [buff[ir], buff[i]];
        }
    }
}
*/

function traspose(buffDst, buffSrc, nPols, nBits, trasposeBits) {
    const buffDst8 = new Uint8Array(buffDst.buffer, buffDst.byteOffset, buffDst.byteLength);
    const n = 1 << nBits;
    const w = 1 << trasposeBits;
    const h = n/w;
    for (let i=0; i<w; i++) {
        for (let j=0; j<h; j++) {
            const fi = j*w + i;
            const di = i*h +j;
            const src = new Uint8Array(buffSrc.buffer, buffSrc.byteOffset + fi*nPols*8, nPols*8);
            buffDst8.set(src, di*nPols*8);
        }
    }
}


async function bitReverse(buffDst, buffSrc, pSrc, nPols, nBits) {
    const n = 1 << nBits;
    const buffDst8 = new Uint8Array(buffDst.buffer, buffDst.byteOffset, n*nPols*8);
    for (let i=0; i<n; i++) {
        const ri = BR(i, nBits);
        const src = new Uint8Array(buffSrc.buffer, buffSrc.byteOffset + pSrc + ri*nPols*8, nPols*8);
        buffDst8.set(src, i*nPols*8);
    }
}

async function interpolateBitReverse(buffDst, buffSrc, pSrc, nPols, nBits) {
    const n = 1 << nBits;
    const buffDst8 = new Uint8Array(buffDst.buffer, buffDst.byteOffset, n*nPols*8);
    for (let i=0; i<n; i++) {
        const ri = BR(i, nBits);
        const rii = (n-ri)%n;
        const src = new Uint8Array(buffSrc.buffer, buffSrc.byteOffset + pSrc+ rii*nPols*8, nPols*8);
        buffDst8.set(src, i*nPols*8);
    }
}

async function invBitReverse(buffDst, buffSrc, pSrc, nPols, nBits) {
    const n = 1 << nBits;
    const src = new BigUint64Array(buffSrc.buffer, buffSrc.byteOffset + pSrc, n*nPols);
    const nInv = F.inv(BigInt(n));
    for (let i=0; i<n; i++) {
        const ri = BR(i, nBits);
        const rii = (n-ri)%n;
        for (let p=0; p<nPols; p++) {
            buffDst[i*nPols+p] = F.mul(src[rii*nPols+p], nInv);
        }
    }
}

async function interpolatePrepare(buff, nPols, nBits, nBitsExt ) {
    const n = 1 << nBits;
    const nExt = 1 << nBitsExt;
    let w = F.inv(BigInt(n));
    for (let i=0; i<n; i++) {
        for (let p=0; p<nPols; p++) {
            buff[i*nPols+p] = F.mul(buff[i*nPols+p], w);
        }
        w = F.mul(w, F.shift);
    }
    const buffz = new BigUint64Array(buff.buffer, buff.byteOffset + n*nPols*8, (nExt-n)*nPols);
    buffz.fill(0n);
}

// Adjustable parametees
const maxBlockBits = 24;
const minBlockBits = 12;
const blocksPerThread = 8;
async function _fft(buffSrc, pSrc, nPols, nBits, buffDst, pDst, inverse) {
    const n = 1 << nBits;
    const tmpBuffBuffer = new SharedArrayBuffer(n*nPols*8);
    const tmpBuff = new BigUint64Array(tmpBuffBuffer);
    const outBuff = new BigUint64Array(buffDst.buffer, buffDst.byteOffset + pDst, n*nPols);

    let bIn, bOut;

    const pool = workerpool.pool(__dirname + '/fft_worker.js');

    const idealNBlocks = pool.maxWorkers*blocksPerThread;
    let blockBits = log2(n*nPols/idealNBlocks);
    if (blockBits < minBlockBits) blockBits = minBlockBits;
    if (blockBits > maxBlockBits) blockBits = maxBlockBits;
    blockBits = Math.min(nBits, blockBits);
    const blockSize = 1 << blockBits;
    const nBlocks = n / blockSize;

    let nTrasposes;
    if (nBits == blockBits) {
        nTrasposes = 0;
    } else {
        nTrasposes = Math.floor((nBits-1) / blockBits)+1;
    }

    if (nTrasposes & 1) {
        bOut = tmpBuff;
        bIn = outBuff;
    } else {
        bOut = outBuff;
        bIn = tmpBuff;
    }

    if (inverse) {
        await invBitReverse(bOut, buffSrc, pSrc, nPols, nBits);
    } else {
        await bitReverse(bOut, buffSrc, pSrc, nPols, nBits);
    }
    [bIn, bOut] = [bOut, bIn];

    for (let i=0; i<nBits; i+= blockBits) {
        const sInc = Math.min(blockBits, nBits-i);
        const promisesFFT = [];
        for (j=0; j<nBlocks; j++) {
            promisesFFT.push(pool.exec("fft_block", [bIn, j*blockSize, nPols, nBits, i+sInc, blockBits, sInc]));

//            await fft_block(bIn, j*blockSize, nPols, nBits, i+sInc, blockBits, sInc);
        }
        await Promise.all(promisesFFT);
        if (sInc < nBits) {                // Do not transpose if it's the same
            await traspose(bOut, bIn, nPols, nBits, sInc);
            [bIn, bOut] = [bOut, bIn];
        }
    }

    await pool.terminate();
}

async function fft(buffSrc, pSrc, nPols, nBits, buffDst, pDst) {
    await _fft(buffSrc, pSrc, nPols, nBits, buffDst, pDst, false)
}

async function ifft(buffSrc, pSrc, nPols, nBits, buffDst, pDst) {
    await _fft(buffSrc, pSrc, nPols, nBits, buffDst, pDst, true)
}


async function interpolate(buffSrc, pSrc, nPols, nBits, buffDst, pDst, nBitsExt) {
    const n = 1 << nBits;
    const nExt = 1 << nBitsExt;
    const tmpBuffBuffer = new SharedArrayBuffer(nExt*nPols*8);
    const tmpBuff = new BigUint64Array(tmpBuffBuffer);
    const outBuff = new BigUint64Array(buffDst.buffer, buffDst.byteOffset + pDst, nExt*nPols);

    let bIn, bOut;

    const pool = workerpool.pool(__dirname + '/fft_worker.js');

    const idealNBlocks = pool.maxWorkers*blocksPerThread;
    let nTrasposes = 0;


    let blockBits = log2(n*nPols/idealNBlocks);
    if (blockBits < minBlockBits) blockBits = minBlockBits;
    if (blockBits > maxBlockBits) blockBits = maxBlockBits;
    blockBits = Math.min(nBits, blockBits);
    const blockSize = 1 << blockBits;
    const nBlocks = n / blockSize;

    if (blockBits < nBits) {
        nTrasposes += Math.floor((nBits-1) / blockBits)+1;
    }

    nTrasposes += 1 // The middle convertion

    let blockBitsExt = log2(nExt*nPols/idealNBlocks);
    if (blockBitsExt < minBlockBits) blockBitsExt = minBlockBits;
    if (blockBitsExt > maxBlockBits) blockBitsExt = maxBlockBits;
    blockBitsExt = Math.min(nBitsExt, blockBitsExt);
    const blockSizeExt = 1 << blockBitsExt;
    const nBlocksExt = n / blockSize;

    if (blockBitsExt < nBitsExt) {
        nTrasposes += Math.floor((nBitsExt-1) / blockBitsExt)+1;
    }


    if (nTrasposes & 1) {
        bOut = tmpBuff;
        bIn = outBuff;
    } else {
        bOut = outBuff;
        bIn = tmpBuff;
    }

    await interpolateBitReverse(bOut, buffSrc, pSrc, nPols, nBits);
    [bIn, bOut] = [bOut, bIn];

    for (let i=0; i<nBits; i+= blockBits) {
        const sInc = Math.min(blockBits, nBits-i);
        const promisesFFT = [];
        for (j=0; j<nBlocks; j++) {
            promisesFFT.push(pool.exec("fft_block", [bIn, j*blockSize, nPols, nBits, i+sInc, blockBits, sInc]));
        }
        await Promise.all(promisesFFT);
        if (sInc < nBits) {                // Do not transpose if it's the same
            await traspose(bOut, bIn, nPols, nBits, sInc);
            [bIn, bOut] = [bOut, bIn];
        }
    }

    await interpolatePrepare(bIn, nPols, nBits, nBitsExt);
    await bitReverse(bOut, bIn, 0, nPols, nBitsExt);
    [bIn, bOut] = [bOut, bIn];

    for (let i=0; i<nBitsExt; i+= blockBitsExt) {
        const sInc = Math.min(blockBitsExt, nBitsExt-i);
        const promisesFFT = [];
        for (j=0; j<nBlocksExt; j++) {
            promisesFFT.push(pool.exec("fft_block", [bIn, j*blockSizeExt, nPols, nBitsExt, i+sInc, blockBitsExt, sInc]));
        }
        await Promise.all(promisesFFT);
        if (sInc < nBitsExt) {                // Do not transpose if it's the same
            await traspose(bOut, bIn, nPols, nBitsExt, sInc);
            [bIn, bOut] = [bOut, bIn];
        }
    }

    await pool.terminate();
}

module.exports.fft = fft;
module.exports.ifft = ifft;
module.exports.interpolate = interpolate;
module.exports.traspose = traspose;


