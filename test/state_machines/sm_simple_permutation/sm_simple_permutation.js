module.exports.buildConstants = async function (pols) {
    
    if(pols.selA) {
        const N = pols.selA.length;

        for (let i=0; i<N; i++) {
            pols.selA[i] = 1n;
            pols.selB[i] = 1n;
        }
    } else {
        const N = pols.selC.length;

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
        
    console.log(pols);
}


module.exports.execute = async function (pols) {
    if(pols.a) {
        const N = pols.a.length;

        for (let i=0; i<N; i++) {
            pols.a[i] = BigInt(i*i+i+1);
            pols.b[N-i-1] = pols.a[i];
        }
    } else {
        const N = pols.c.length;

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
   

    console.log(pols);
}