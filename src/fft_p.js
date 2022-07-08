const GL3 = require("./f3g.js");
const {log2} = require("./utils.js");

function BR(x, domainPow)
{
    x = (x >>> 16) | (x << 16);
    x = ((x & 0xFF00FF00) >>> 8) | ((x & 0x00FF00FF) << 8);
    x = ((x & 0xF0F0F0F0) >>> 4) | ((x & 0x0F0F0F0F) << 4);
    x = ((x & 0xCCCCCCCC) >>> 2) | ((x & 0x33333333) << 2);
    return (((x & 0xAAAAAAAA) >>> 1) | ((x & 0x55555555) << 1)) >>> (32 - domainPow);
}

function bitReverse(buff, bits) {
    for (let i=0; i<buff.length; i++) {
        const ir = BR(i, bits);
        if (i<ir) {
            [buff[i], buff[ir]] = [buff[ir], buff[i]];
        }
    }
}

function traspose(buff, bits) {
    const buffOut = new BigUint64Array(buff.length);
    const w = 1 << bits;
    const h = buff.length/w;
    for (let i=0; i<w; i++) {
        for (let j=0; j<h; j++) {
            buffOut[i*w + j] = buff[j*w + i];
        }
    }
    buff.set(buffOut);
}


function bitReverseCopy(buff, bits) {
    const buffOut = new BigUint64Array(buff.length);
    for (let i=0; i<buff.length; i++) {
        buffOut[i] = buff[BR(i, bits)];
    }
}

function fft_block(F, buff, start_pos, s, bits, layers) {


    const md2 = (1 << (bits-1));

    if (layers > 1) {
        fft_block(F, buff, start_pos, s-1, bits-1);
        fft_block(F, buff, start_pos + md2, s-1, bits-1);
    }

    let w;
    if (s>bits) {
        w = F.exp(F.w[s], start_pos);
    } else {
        w = 1n;
    }

    for (let i=0; i<md2; i++) {
        const t = F.mul(w, buff[start_pos + md2 + i]);
        const u = buff[start_pos+i];
        buff[start_pos+i] = F.add(u, t);
        buff[start_pos+md2+ i] = F.sub(u, t);
        w = F.mul(w, F.w[s])
    }
}

function fft(F, a) {
    const buff = new BigUint64Array(a.length);
    for (let i=0; i<a.length; i++) buff[i] = a[i];
    const nBits = log2(a.length);
    bitReverse(buff, nBits);
    fft_block(F, buff, 0, nBits, nBits, nBits);
    const res = [];
    for (let i=0; i<a.length; i++) res[i] = buff[i];
    return res;
}

function ifft(F, a) {
    const buff = new BigUint64Array(a.length);
    for (let i=0; i<a.length; i++) buff[i] = a[i];
    const nBits = log2(a.length);
    bitReverse(buff, nBits);
    fft_block(F, buff, 0, nBits, nBits, nBits);
    const res = [];
    const cf = F.inv(1n << BigInt(nBits));
    for (let i=0; i<a.length; i++) res[(a.length - i)%a.length ] = F.mul(buff[i], cf);
    return res;
}

function fft2(F, a) {
    const buff = new BigUint64Array(a.length);
    for (let i=0; i<a.length; i++) buff[i] = a[i];
    const nBits = log2(a.length);
    bitReverse(buff, nBits);

    const blockBits = Math.floor((nBits+1) / 2);
    const blockSize = 1 << blockBits
    const nBlocks = buff.length / blockSize;

    for (let i=0; i<nBits; i+= blockBits) {
        const sInc = Math.min(blockBits, nBits-i);
        for (j=0; j<nBlocks; j++) {
            fft_block(F, buff, j*blockSize, i+sInc, blockBits, sInc)
        }
        traspose(buff, sInc);
    }

    fft_block(F, buff, 0, nBits, nBits);
    const res = [];
    for (let i=0; i<a.length; i++) res[i] = buff[i];
    return res;
}

function print(F, a) {
    console.log("[");
    for (let i=0; i<a.length; i++) {
        console.log(`${F.toString(a[i], 16)} :${F.toString(a[i])}`);
    }
    console.log("]");
}

const F = new GL3();
const a = [1n, 2n, 3n, 4n];
print(F, a);
const A = fft(F, a);
print(F, A);
const A2 = fft2(F, a);
print(F, A2);
const aa = ifft(F, A);
print(F, aa);
