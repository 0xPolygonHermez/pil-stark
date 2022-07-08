/*
    Pool of threads and SharedBuffer Example in node.

    This program calculates all the sums in a naive way.
    It puts all the numbers in a Buffer (in parallel) and the adds them in
    parallel.
*/

const workerpool = require('workerpool');

const N = 1000000000;
function add(buff, pos, N) {
    const u64 = new BigUint64Array(buff);
    let acc = 0n;
    for (let i=pos; i<pos+N; i++) acc += u64[i];
    return acc;
}

function fill(buff, pos, N) {
    const u64 = new BigUint64Array(buff);
    for (let i=0; i<N; i++) u64[i+pos] =  BigInt(i+pos);
}


async function run() {
    const pool = workerpool.pool();

    const buff = new SharedArrayBuffer(N*8);

    const promisesFill = [];
    const nperThreadF = Math.floor((N-1)/pool.maxWorkers)+1;
    for (let i=0; i< N; i+=nperThreadF) {
        const curN = Math.min(nperThreadF, N-i);
        promisesFill.push(pool.exec(fill, [buff, i, curN]));
    }

    await Promise.all(promisesFill);

    const promisesAdd = [];
    const nperThreadA = Math.floor((N-1)/pool.maxWorkers)+1;
    for (let i=0; i< N; i+=nperThreadA) {
        const curN = Math.min(nperThreadA, N-i);
        promisesAdd.push(pool.exec(add, [buff, i, curN]));
    }

    res = await Promise.all(promisesAdd);


    let result = 0n;
    for (let i=0; i<res.length; i++) result+=res[i];

    console.log(result);
    console.log(BigInt(N)*(BigInt(N)-1n)/2n);

    await pool.terminate();
/*
    // One thread calculus to compare
    let acc = 0n;
    for (let i=0n; i<BigInt(N); i++) acc+=i;
    console.log(acc);
*/
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});
