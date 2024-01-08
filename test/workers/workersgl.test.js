/*
    Pool of threads and SharedBuffer Example in node.

    This program calculates all the sums in a naive way.
    It puts all the numbers in a Buffer (in parallel) and the adds them in
    parallel.
*/

const workerpool = require('workerpool');
const buildGLWasm = require('../../src/helpers/glwasm').build;
const {ModuleBuilder} = require('wasmbuilder');

const N = 1000000000;


async function run() {
    console.log("startCompiling...");
    const moduleBuilder = new ModuleBuilder();
    buildGLWasm(moduleBuilder);

    const code = moduleBuilder.build();

    const wasmModule = await WebAssembly.compile(code);
    console.log("creating worker....");

    const pool = workerpool.pool(__dirname + '/workersgl_worker.js');

    console.log("creating buff...");
    const buff = new SharedArrayBuffer(N*8);

    console.log("filling buff...");
    const promisesFill = [];
    const nperThreadF = Math.floor((N-1)/pool.maxWorkers)+1;
    for (let i=0; i< N; i+=nperThreadF) {
        const curN = Math.min(nperThreadF, N-i);
        promisesFill.push(pool.exec("fill", [buff, i, curN]));
    }

    await Promise.all(promisesFill);

    console.log("computing...");
    const promisesAdd = [];
    const nperThreadA = Math.floor((N-1)/pool.maxWorkers)+1;
    for (let i=0; i< N; i+=nperThreadA) {
        const curN = Math.min(nperThreadA, N-i);
        promisesAdd.push(pool.exec("mul", [wasmModule, buff, i, curN]));
    }

    res = await Promise.all(promisesAdd);

    let p = 0xFFFFFFFF00000001n;

    let result = 1n;
    for (let i=0; i<res.length; i++) {
        result =(result * res[i])%p;
    }

    console.log(res)
    console.log(result);

    await pool.terminate();

    console.log("calculating naive...");
    // One thread calculus to compare
    let acc = 1n;
    for (let i=0n; i<BigInt(N); i++) acc = (acc * (i+1n)) % p;
    console.log(acc);

    console.log("Terminated!")
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});
