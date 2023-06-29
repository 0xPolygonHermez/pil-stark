const workerpool = require('workerpool');
const {buildBn128} = require('ffjavascript');

async function buildFr() {
    const curve = await buildBn128();
    return curve.Fr;
}

async function interpolatePrepareBlock(buff, width, start, st_i, st_n) {
    const Fr = await buildFr();
    console.log(`linear interpolatePrepare start.... ${st_i}/${st_n}`);

    const height = buff.byteLength / Fr.n8 / width;

    let w = start;
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            const offset = (i * width + j) * Fr.n8;
            const val = Fr.mul(buff.slice(offset, offset + Fr.n8), w);

            buff.set(val, offset);
        }
    }

    console.log(`linear interpolatePrepare end.... ${st_i}/${st_n}`);

    return buff;
}

function _fft_block(buff, rel_pos, start_pos, nPols, nBits, s, blockBits, layers, Fr) {
    const n = 1 << nBits;
    const m = 1 << blockBits;
    const md2 = m >> 1;

    if (layers < blockBits) {
        _fft_block(buff, rel_pos, start_pos      , nPols, nBits, s, blockBits-1, layers, Fr);
        _fft_block(buff, rel_pos, start_pos + md2, nPols, nBits, s, blockBits-1, layers, Fr);
        return;
    }
    if (layers > 1) {
        _fft_block(buff, rel_pos, start_pos      , nPols, nBits, s-1, blockBits-1, layers-1, Fr);
        _fft_block(buff, rel_pos, start_pos + md2, nPols, nBits, s-1, blockBits-1, layers-1, Fr);
    }

    let w;
    if (s > blockBits) {
        const width = 1 << (s - layers);
        const heigth = n / width;
        const y = Math.floor(start_pos / heigth);
        const x = start_pos % heigth;
        const p = x * width + y;
        w = Fr.exp(Fr.w[s], p);
    } else {
        w = Fr.one;
    }

    for (let i = 0; i < md2; i++) {
        for (let j = 0; j < nPols; j++) {
            // console.log(`${j} ${s} ${start_pos - rel_pos+i} ${start_pos - rel_pos +md2+i} ${buff[(start_pos - rel_pos +i)*nPols+j]}  ${buff[(start_pos- rel_pos+md2+ i)*nPols+j]} ${w}`)

            const offset1 = ((start_pos - rel_pos + md2 + i) * nPols + j) * Fr.n8;
            const t = Fr.mul(w, buff.slice(offset1, offset1 + Fr.n8));

            const offset2 = ((start_pos - rel_pos + i) * nPols + j) * Fr.n8;
            const u = buff.slice(offset2, offset2 + Fr.n8);

            buff.set(Fr.add(u, t), offset2);
            buff.set(Fr.sub(u, t), offset1);            
        }
        w = Fr.mul(w, Fr.w[layers])
    }
}

async function fft_block(buff, start_pos, nPols, nBits, s, blockBits, layers) {
    const Fr = await buildFr();
    console.log(`start block ${s} ${start_pos}`)
    _fft_block(buff, start_pos, start_pos, nPols, nBits, s, blockBits, layers, Fr);
    console.log(`end block ${s} ${start_pos}`)
    return buff;
}

if (!workerpool.isMainThread) {
    workerpool.worker({
        fft_block: fft_block,
        interpolatePrepareBlock: interpolatePrepareBlock
    });
}

module.exports.fft_block = fft_block;
module.exports.interpolatePrepareBlock = interpolatePrepareBlock;

