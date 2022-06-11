pragma circom 2.0.4;

function rev(a, nBits) {
    var revTable[16] = [ 0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15];

    var acc = 0;
    for (var i=0; i<8; i++) {
        acc = acc << 4;
        acc += revTable[(a >> (i*4)) & 0xF];
    }

    acc = acc >> (32 - nBits);

    return acc;
}

function roots(i) {
    var roots[33] = [
        1,
        18446744069414584320,
        18446462594437873665,
        18446742969902956801,
        4503599626321920,
        4398046511104,
        18446744069412487169,
        1125917086449664,
        281721071064741919,
        13413385849078745835,
        6954937180696424269,
        7929139079472734785,
        10689527585344587550,
        17438041681765031418,
        4070006390860377902,
        3736721163568631555,
        8887890778356418594,
        12103559344407486379,
        17281012580846139006,
        7608806113260947493,
        777489184908773084,
        3169505098583693556,
        16860875057620324393,
        6696129212579333162,
        8426443755438715886,
        8882774314037344373,
        12799028095108218489,
        8269684310396760445,
        15756586588277699002,
        16774895541244214992,
        9082529015493136914,
        1724681388026931954,
        3607031617444012685
    ];
    return roots[i];
}


template BitReverse(nBits, eSize) {
    var n = 1 << nBits;

    signal input in[n][eSize];
    signal output out[n][eSize];

    var nDiv2 = n>>1;
    var ri;
    for (var i=0; i< n; i++) {
        ri = rev(i, nBits);
        for (var k=0; k<eSize; k++) {
            if (i>ri) {
                out[i][k] <== in[ri][k];
                out[ri][k] <== in[i][k];
            } else if (i==ri) {
                out[i][k] <== in[i][k];
            }
        }
    }
}


template FFT(nBits, eSize, inv , shift) {
    var n = 1<<nBits;

    signal input in[n][eSize];
    signal output out[n][eSize];

    assert( (1 << nBits) == n);
    assert(nBits <= 32);

    signal buffers[nBits-1][n][eSize];

    var shifts[n];
    var ss = inv ? 1/shift : shift;
    shifts[0] = 1;
    for (var i=1; i<n; i++) {
        shifts[i] = shifts[i-1] * ss;
    }

    var m, wm, w, mdiv2;
    var i1 =0;
    var i2=0;
    var s1=0;
    var s2=0;
    var twoinv = 1/n;
    for (var s=1; s<=nBits; s++) {
        m = 1 << s;
        mdiv2 = m >> 1;
        wm = roots(s);
        for (var k=0; k<n; k+= m) {
            w = 1;
            for (var j=0; j<mdiv2; j++) {
                for (var e=0; e<eSize; e++) {
                    if (s==1) {
                        i1 =rev(k+j, nBits);
                        i2 = rev(k+j+mdiv2, nBits);
                        if (inv == 1) {
                            s1 = 1;
                            s2 = 1;
                        } else {
                            s1 = shifts[i1];
                            s2 = shifts[i2];
                        }
                        buffers[s-1][k+j][e] <== s1*in[i1][e] + s2*w*in[i2][e];
                        buffers[s-1][k+j+mdiv2][e] <== s1*in[i1][e] - s2*w*in[i2][e];
                    } else if (s<nBits) {
                        buffers[s-1][k+j][e] <== buffers[s-2][k+j][e] + w*buffers[s-2][k+j+mdiv2][e];
                        buffers[s-1][k+j+mdiv2][e] <== buffers[s-2][k+j][e] - w*buffers[s-2][k+j+mdiv2][e];
                    } else {
                        if (inv) {
                            i1 = (n-k-j)%n;
                            i2 = (n-k-j-mdiv2)%n;
                            s1 = shifts[i1]*twoinv;
                            s2 = shifts[i2]*twoinv;
                        } else {
                            i1 = k+j;
                            i2 = k+j+mdiv2;
                            s1 = 1;
                            s2 = 1;
                        }
                        out[i1][e] <== s1*buffers[s-2][k+j][e] + s1*w*buffers[s-2][k+j+mdiv2][e];
                        out[i2][e] <== s2*buffers[s-2][k+j][e] - s2*w*buffers[s-2][k+j+mdiv2][e];
                    }
                }
                w=w*wm;
            }
        }
    }

}

