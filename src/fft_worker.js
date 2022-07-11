const GL3 = require("./f3g.js");
const workerpool = require('workerpool');

const F = new GL3();

function fft_block(buff, start_pos, nPols, nBits, s, blockBits, layers) {

    const n = 1 << nBits;
    const m = 1 << blockBits;
    const md2 = m >> 1;

    if (layers < blockBits) {
        fft_block(buff, start_pos      , nPols, nBits, s, blockBits-1, layers);
        fft_block(buff, start_pos + md2, nPols, nBits, s, blockBits-1, layers);
        return;
    }
    if (layers > 1) {
        fft_block(buff, start_pos      , nPols, nBits, s-1, blockBits-1, layers-1);
        fft_block(buff, start_pos + md2, nPols, nBits, s-1, blockBits-1, layers-1);
    }

    let w;
    if (s>blockBits) {
        const width = 1 << (s-layers);
        const heigth = n / width;
        const y = Math.floor(start_pos / heigth);
        const x = start_pos % heigth;
        const p = x*width + y;
        w = F.exp(F.w[s], p);
    } else {
        w = 1n;
    }

    for (let i=0; i<md2; i++) {
        for (let j=0; j<nPols; j++) {
//            console.log(`${j} ${s} ${start_pos+i} ${start_pos+md2+i} ${buff[(start_pos+i)*nPols+j]}  ${buff[(start_pos+md2+ i)*nPols+j]} ${w}`)
            const t = F.mul(w, buff[(start_pos + md2 + i)*nPols+j]);
            const u = buff[(start_pos+i)*nPols+j];
            buff[(start_pos+i)*nPols+j] = F.add(u, t);
            buff[(start_pos+md2+ i)*nPols+j] = F.sub(u, t);
        }
        w = F.mul(w, F.w[layers])
    }
}

if (!workerpool.isMainThread) {
    workerpool.worker({
        fft_block: fft_block
    });
}
module.exports.fft_block = fft_block;
