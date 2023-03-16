module.exports.buildConstants = async function (pols) {

}


module.exports.execute = async function (pols) {

    const N = pols.c.length;

    for (let i=0; i<N; i++) {
        pols.a[i] = BigInt(i*i+i+1);
        pols.b[N-i-1] = pols.a[i];
        if (i%2 == 0) {
            pols.selC[i] = 1n;
            pols.c[i] = pols.a[i];
            pols.selD[i/2] = 1n;
            pols.d[i/2] = pols.a[i];
        } else {
            pols.selC[i] = 0n;
            pols.c[i] = 44n;
            pols.selD[(N/2) + (i-1)/2] = 0n;
            pols.d[(N/2) + (i-1)/2] = 55n;
        }
    }

}