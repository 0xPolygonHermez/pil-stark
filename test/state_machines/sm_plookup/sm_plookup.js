module.exports.buildConstants = async function (pols) {
    const N = pols.A.length;

    let p=0;
    for ( let i=0; i<16;- i++) {
        for (let j=0; j<16; j++) {
            pols.A[p] = BigInt(i);
            pols.B[p] = BigInt(j);
            pols.SEL[p] = BigInt(1);
            p += 1;
        }
    }

    while (p<N) {
        pols.A[p] = 0n;
        pols.B[p] = 0n;
        pols.SEL[p] = 0n;
        p += 1;
    }

}


module.exports.execute = async function (pols) {

    const N = pols.cc.length;

    let p=0;
    for ( let i=0; i<16; i++) {
        for (let j=0; j<16; j++) {
            pols.cc[p] = BigInt(i*j);
            p+= 1;
        }
    }
    while (p<N) {
        pols.cc[p] = BigInt(p);
        p+= 1;
    }


    p=0;
    for (i=0; i<10; i++) {
        pols.sel[p] = 1n;
        pols.a[p] = BigInt(i);
        pols.b[p] = i== 0 ? 55n : BigInt(i+3);
        p += 1;
    }

    pols.sel[p] = 0n;
    pols.a[p] = 55n;
    pols.b[p] = 10n;
    p += 1;

    while (p<N) {
        pols.sel[p] = 0n;
        pols.a[p] = 55n;
        pols.b[p] = 55n;
        p+= 1;
    }

}