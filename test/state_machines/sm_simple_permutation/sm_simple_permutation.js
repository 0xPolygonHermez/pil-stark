module.exports.buildConstants = async function (N, pols) {
    
    if(pols.selA) {
        for (let i=0; i<N; i++) {
            pols.selA[i] = 1n;
            pols.selB[i] = 1n;
        }
    } else {
        for (let i=0; i<N; i++) {
            if (i%2 == 0) {
                pols.selC[i] = 1n;
                pols.selD[i/2] = 1n;
            } else {
                pols.selC[i] = 0n;
                pols.selD[(N/2) + (i-1)/2] = 0n;
            }
        }
    }
}


module.exports.execute = async function (N, pols) {
    if(pols.a) {
        for (let i=0; i<N; i++) {
            pols.a[i] = BigInt(i*i+i+1);
            pols.b[N-i-1] = pols.a[i];
        }
    } else {
        for (let i=0; i<N; i++) {
            if (i%2 == 0) {
                pols.c[i] = BigInt(i*i+i+1);
                pols.d[i/2] = BigInt(i*i+i+1);
            } else {
                pols.c[i] = 44n;
                pols.d[(N/2) + (i-1)/2] = 55n;
            }
        }
    }
}