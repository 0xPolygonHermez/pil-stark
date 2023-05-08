const workerpool = require('workerpool');

// a deliberately inefficient implementation of the fibonacci sequence
async function mul(wasmModule, buff, pos, N) {
    const wasmMem = new WebAssembly.Memory({initial:1});
    const instance = await WebAssembly.instantiate(wasmModule, {
        env: {
            "memory": wasmMem
        }
    });
    const glwasm = instance.exports;
    const u64 = new BigUint64Array(buff);
    let acc = 1n;
    for (let i=pos; i<pos+N; i++) {
        acc = glwasm.mul(acc, u64[i]);
    }
    if (acc<0n) acc += (1n << 64n);
    return acc;
}

function fill(buff, pos, N) {
    const u64 = new BigUint64Array(buff);
    for (let i=0; i<N; i++) u64[i+pos] =  BigInt(i+pos+1);
}

// create a worker and register public functions
workerpool.worker({
  mul: mul,
  fill: fill
});