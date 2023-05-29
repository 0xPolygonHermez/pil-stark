const workerpool = require('workerpool');
const buildGLWasm = require('../../glwasm').build;
const {ModuleBuilder} = require('wasmbuilder');

const maxPages = 20000;

function alloc(wasmMem, length) {
    const wasmMem32 = new Uint32Array(wasmMem.buffer);
    length = (((length-1)>>3) +1)<<3;       // Align to 64 bits.

    const res = wasmMem32[0];
    wasmMem32[0] += length;
    return res;
}

async function buildWasm(nPages) {
    const moduleBuilder = new ModuleBuilder();
    buildGLWasm(moduleBuilder);

    const code = moduleBuilder.build();

    const wasmModule = await WebAssembly.compile(code);

    const wasmMem = new WebAssembly.Memory({initial:nPages});
    const instance = await WebAssembly.instantiate(wasmModule, {
        env: {
            "memory": wasmMem
        }
    });
    const glwasm = instance.exports;

    return [glwasm, wasmMem]

}

// a deliberately inefficient implementation of the fibonacci sequence
async function linearHash(buffIn, width, st_i, st_n, splitLinearHash) {
    console.log(`linear hash start.... ${st_i}/${st_n}`);
    const heigth = buffIn.length / width;
    const buffOut = new BigUint64Array(heigth*4);

    if (width <=4) {
        for (let i=0; i<heigth; i++) {
            for (let j=0; j<width; j++) {
                buffOut[i*4+j] = buffIn[width*i + j];
            }
        }
        return buffOut;
    }


    const bytesRequired = width*heigth*8 + heigth*4*8;
    const pagesRequired = Math.floor((bytesRequired - 1)/(1<<16)) +200;

    const [glwasm, wasmMem] = await buildWasm(Math.min(pagesRequired, maxPages));

    const wasmMem8 = new Uint8Array(wasmMem.buffer);

    const nSteps = Math.floor((pagesRequired -1) / maxPages) +1;
    const hashesPerStep = Math.floor((heigth - 1) / nSteps)+1;

    const pIn = alloc(wasmMem, width * hashesPerStep*8);
    const pOut = alloc(wasmMem, hashesPerStep*4*8);


    for (let i=0; i<heigth; i+= hashesPerStep) {
        const curN = Math.min(hashesPerStep, heigth-i);
        const src = new Uint8Array(buffIn.buffer, buffIn.byteOffset + i*width*8, width * curN*8);
        wasmMem8.set(src, pIn);
        if(splitLinearHash) {
            glwasm.multiLinearHashGPU(pIn, width, heigth, pOut);
        } else {
            glwasm.multiLinearHash(pIn, width, heigth, pOut);
        }
        const dst = new BigUint64Array(wasmMem.buffer, pOut, curN*4);
        buffOut.set(dst, i*4);
    }

    console.log(`linear hash end.... ${st_i}/${st_n}`);

    return buffOut;
}


// a deliberately inefficient implementation of the fibonacci sequence
async function merkelizeLevel(buffIn, st_i, st_n) {
    console.log(`merkelizing hash start.... ${st_i}/${st_n}`);

    const nOps = buffIn.length/8;

    const bytesRequired = nOps*12*8;
    const pagesRequired = Math.floor((bytesRequired - 1)/(1<<16)) +2;

    const [glwasm, wasmMem] = await buildWasm(Math.min(pagesRequired, maxPages));

    const wasmMem8 = new Uint8Array(wasmMem.buffer);

    const nSteps = Math.floor((pagesRequired -1) / maxPages) +1;
    const opsPerStep = Math.floor((nOps - 1) / nSteps)+1;

    const pIn = alloc(wasmMem, opsPerStep*8*8);
    const pOut = alloc(wasmMem, opsPerStep*4*8);

    const buffOut = new BigUint64Array(nOps*4);

    for (let i=0; i<nOps; i+= opsPerStep) {
        const curNOps = Math.min(opsPerStep, nOps-i);
        const src = new Uint8Array(buffIn.buffer, buffIn.byteOffset + i*8*8,  curNOps*8*8);
        wasmMem8.set(src, pIn);
        glwasm.merkelizeLevel(pIn, curNOps, pOut);
        const dst = new BigUint64Array(wasmMem.buffer, pOut, curNOps*4);
        buffOut.set(dst, i*4);
    }

    console.log(`merkelizing hash end.... ${st_i}/${st_n}`);
    return buffOut;
}

if (!workerpool.isMainThread) {
    workerpool.worker({
        linearHash: linearHash,
        merkelizeLevel: merkelizeLevel
    });
}

module.exports.linearHash = linearHash;
module.exports.merkelizeLevel = merkelizeLevel;