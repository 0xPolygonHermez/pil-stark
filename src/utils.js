

exports.log2 = function log2( V )
{
    return( ( ( V & 0xFFFF0000 ) !== 0 ? ( V &= 0xFFFF0000, 16 ) : 0 ) | ( ( V & 0xFF00FF00 ) !== 0 ? ( V &= 0xFF00FF00, 8 ) : 0 ) | ( ( V & 0xF0F0F0F0 ) !== 0 ? ( V &= 0xF0F0F0F0, 4 ) : 0 ) | ( ( V & 0xCCCCCCCC ) !== 0 ? ( V &= 0xCCCCCCCC, 2 ) : 0 ) | ( ( V & 0xAAAAAAAA ) !== 0 ) );
}

exports.getKs = function getKs(Fr, pow, n) {

    const ks = [];
    while (ks.length<n) {

        let k = ks.length>0 ? ks[ks.length-1]+1n : Fr.two;
        while (isIncluded(k, ks, pow)) Fr.add(k, Fr.one);
        ks.push(k);
    }

    return ks;

    function isIncluded(k, kArr, pow) {
        const domainSize= 2**pow;
        let w = Fr.one;
        for (let i=0; i<domainSize; i++) {
            if (Fr.eq(k, w)) return true;
            for (let j=0; j<kArr.length; j++) {
                if (Fr.eq(k, Fr.mul(kArr[j], w))) return true;
            }
            w = Fr.mul(w, Fr.FFT.w[pow]);
        }
        return false;
    }
}


