pragma circom 2.1.0;
pragma custom_templates;

template custom FFT4(scale, firstW, incW) {
    signal input in[4][3];
    signal output out[4][3];

    var f[4][3];

    var w = firstW;
    for (var i=0; i<2; i+=2) {
        for (var k=0; k<3; k++) {
            var r = w*in[i+1][k];
            f[i][k]   = in[i][k] + r;
            f[i+1][k] = in[i][k] - r;
        }
        w = w*incW;
    }

    w = firstW*firstW;
    var incW2 = firstW*firstW;

    for (var i=0; i<2; i+=1) {
        for (var k=0; k<3; k++) {
            var r = w*in[i+2][k];
            out[i][k]   <-- f[i][k] + r;
            out[i+2][k] <-- f[i][k] - r;
        }
        w = w*incW2;
    }
}

