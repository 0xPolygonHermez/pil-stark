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
        281474976710656,
        18446744069397807105,
        17293822564807737345,
        70368744161280,
        549755813888,
        17870292113338400769,
        13797081185216407910,
        1803076106186727246,
        11353340290879379826,
        455906449640507599,
        17492915097719143606,
        1532612707718625687,
        16207902636198568418,
        17776499369601055404,
        6115771955107415310,
        12380578893860276750,
        9306717745644682924,
        18146160046829613826,
        3511170319078647661,
        17654865857378133588,
        5416168637041100469,
        16905767614792059275,
        9713644485405565297,
        5456943929260765144,
        17096174751763063430,
        1213594585890690845,
        6414415596519834757,
        16116352524544190054,
        9123114210336311365,
        4614640910117430873,
        1753635133440165772
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

