pragma circom 2.1.0;
pragma custom_templates;

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
        16777216,
        4096,
        64,
        8,
        2198989700608,
        4404853092538523347,
        6434636298004421797,
        4255134452441852017,
        9113133275150391358,
        4355325209153869931,
        4308460244895131701,
        7126024226993609386,
        1873558160482552414,
        8167150655112846419,
        5718075921287398682,
        3411401055030829696,
        8982441859486529725,
        1971462654193939361,
        6553637399136210105,
        8124823329697072476,
        5936499541590631774,
        2709866199236980323,
        8877499657461974390,
        3757607247483852735,
        4969973714567017225,
        2147253751702802259,
        2530564950562219707,
        1905180297017055339,
        3524815499551269279,
        7277203076849721926
    ];
    return roots[i];
}

function invroots(i) {
    var invroots[33] = [
        1,
        18446744069414584320,
        18446462594437873665,
        18446742969902956801,
        18442240469788262401,
        18158513693329981441,
        16140901060737761281,
        274873712576,
        9171943329124577373,
        5464760906092500108,
        4088309022520035137,
        6141391951880571024,
        386651765402340522,
        11575992183625933494,
        2841727033376697931,
        8892493137794983311,
        9071788333329385449,
        15139302138664925958,
        14996013474702747840,
        5708508531096855759,
        6451340039662992847,
        5102364342718059185,
        10420286214021487819,
        13945510089405579673,
        17538441494603169704,
        16784649996768716373,
        8974194941257008806,
        16194875529212099076,
        5506647088734794298,
        7731871677141058814,
        16558868196663692994,
        9896756522253134970,
        1644488454024429189
    ];
    return invroots[i];
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

template custom FFT4(type, scale, firstW, incW) {
    signal input in[4][3];
    signal output out[4][3];

    var firstW2 = firstW*firstW;
    var C0,C1,C2,C3,C4,C5, C6,C7,C8;

    if (type == 4) {
        C0  = scale;
        C1  = scale*firstW2;
        C2  = scale*firstW;
        C3  = scale*firstW*firstW2;
        C4  = scale*firstW*incW;
        C5  = scale*firstW*firstW2*incW;
        C6  = 0;
        C7  = 0;
        C8  = 0;
    } else if (type == 2) {
        C0  = 0;
        C1  = 0;
        C2  = 0;
        C3  = 0;
        C4  = 0;
        C5  = 0;
        C6  = scale;
        C7  = scale*firstW;
        C8  = scale*firstW*incW;
    } else {
        assert(0);
    }

    for (var e=0; e<3; e++) {
        out[0][e] <-- C0*in[0][e] + C1*in[1][e] + C2*in[2][e] + C3*in[3][e] + C6*in[0][e] + C7*in[1][e];
        out[1][e] <-- C0*in[0][e] - C1*in[1][e] + C4*in[2][e] - C5*in[3][e] + C6*in[0][e] - C7*in[1][e];
        out[2][e] <-- C0*in[0][e] + C1*in[1][e] - C2*in[2][e] - C3*in[3][e] + C6*in[2][e] + C8*in[3][e];
        out[3][e] <-- C0*in[0][e] - C1*in[1][e] - C4*in[2][e] + C5*in[3][e] + C6*in[2][e] - C8*in[3][e];
    }
}


template Permute(nBits, nBitsWidth) {
    var n= 1 << nBits;

    signal input in[n][3];
    signal output out[n][3];

    var width = 1 << nBitsWidth;
    var heigth = 1 << (nBits - nBitsWidth);

    for (var x=0; x<width; x++) {
        for (var y=0; y<heigth; y++) {
            out[x*heigth+y] <== in[y*width+x];
        }
    }

}




template FFTBig(nBits, eSize, inv) {
    var n = 1<<nBits;

    assert((eSize <= 3)&&(eSize>=1));

    signal input in[n][eSize];
    signal output out[n][eSize];

    assert( (1 << nBits) == n);
    assert(nBits <= 32);

    var nSteps4 = nBits \ 2;
    var nSteps2 = nBits -nSteps4*2;
    var fft4PerRow = n\4;

    component bitReverse = BitReverse(nBits, 3);

    for (var i=0; i<n; i++) {
        for (var j=0; j<3; j++) {
            if (j<eSize) {
                bitReverse.in[i][j] <== in[i][j];
            } else {
                bitReverse.in[i][j] <== 0;
            }
        }
    }

    component fft4[nSteps4][fft4PerRow];
    component fft4_2[nSteps2][fft4PerRow];

    var scalar = inv ? 1/n : 1;
    var accPm =0;


    for (var i=0; i<nSteps4; i++) {
        if (i>0) accPm += 2;
        for (var j=0; j<fft4PerRow;j++) {
            var w;
            if (i==0) {
                w = 1;
            } else {
                var width = 1 << (i*2);
                var heigth = n / width;
                var y = (j*4) \ heigth;
                var x = (j*4) % heigth;
                var p = x*width + y;
                w = roots(i*2+2) ** p;
            }
            fft4[i][j] = FFT4(4, scalar, w, roots(2));
        }
        for (var j=0; j<fft4PerRow;j++) {
            for (var k=0; k<4; k++) {
                if (i>0) {
                    var tr_j = (k*fft4PerRow + j) \ 4;
                    var tr_k = (k*fft4PerRow + j) % 4;
                    for (var e=0; e<3; e++) {
                        fft4[i][tr_j].in[tr_k][e] <== fft4[i-1][j].out[k][e];
                    }
                } else {
                    for (var e=0; e<3; e++) {
                        fft4[i][j].in[k][e] <== bitReverse.out[j*4+k][e];
                    }
                }
            }
        }

        scalar = 1;
    }


    if (nSteps2) {
        var w = 1;
        accPm += 2;
        for (var j=0; j<fft4PerRow;j++) {
            fft4_2[0][j] = FFT4(2, scalar, w, roots(nBits));
            w=w*roots(nBits-1);
        }
        for (var j=0; j<fft4PerRow;j++) {
            for (var k=0; k<4; k++) {
                if (nSteps4) {
                    var tr_j = (k*fft4PerRow + j) \ 4;
                    var tr_k = (k*fft4PerRow + j) % 4;
                    for (var e=0; e<3; e++) {
                        fft4_2[0][tr_j].in[tr_k][e] <== fft4[nSteps4-1][j].out[k][e];
                    }
                } else {
                    for (var e=0; e<3; e++) {
                        fft4_2[0][j].in[k][e] <== bitReverse.out[j*4+k][e];
                    }
                }
            }
        }
    }

    component permute = Permute(nBits, (nBits+nBits-accPm)%nBits);

    for (var j=0; j<fft4PerRow;j++) {
        for (var k=0; k<4; k++) {
            for (var e=0; e<3; e++) {
                var dst = j*4+k;
                if (nSteps2) {
                    permute.in[dst][e] <== fft4_2[0][j].out[k][e];
                } else {
                    permute.in[dst][e] <== fft4[nSteps4-1][j].out[k][e];
                }
            }
        }
    }

    for (var i=0; i<n;i++) {
        var dst = inv ? ((n-i)%n) : i;
        for (var e=0; e<eSize; e++) {
            out[dst][e] <== permute.out[i][e];
        }
    }

}




template FFT(nBits, eSize, inv) {
    var n = 1<<nBits;

    assert((eSize <= 3)&&(eSize>=1));

    signal input in[n][eSize];
    signal output out[n][eSize];

    assert( (1 << nBits) == n);
    assert(nBits <= 32);

    component fft2;
    component fftBig;

    if (nBits == 0) {
        out <== in;
    } else if (nBits == 1) {
        fft2 = FFT4(2, inv ? (1/2) : 1, 1, 1);
        fft2.in[0] <== in[0];
        fft2.in[1] <== in[1];
        fft2.in[2] <== [0,0,0];
        fft2.in[3] <== [0,0,0];
        for (var e=0; e<eSize; e++) {
            out[0][e] <== fft2.out[0][e];
            out[1][e] <== fft2.out[1][e];
        }
    } else {
        fftBig = FFTBig(nBits, eSize, inv);
        fftBig.in <== in;
        fftBig.out ==> out;
    }
}

