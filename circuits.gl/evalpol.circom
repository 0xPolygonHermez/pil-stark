pragma circom 2.1.0;
pragma custom_templates;


function CMulAddF(ina, inb, inc) {

    var A = (ina[0] + ina[1])  * (inb[0] + inb[1]);
    var B = (ina[0] + ina[2])  * (inb[0] + inb[2]);
    var C = (ina[1] + ina[2])  * (inb[1] + inb[2]);
    var D = ina[0]*inb[0];
    var E = ina[1]*inb[1];
    var F = ina[2]*inb[2];
    var G = D-E;

    var out[3];

    out[0] = C+G-F+inc[0];
    out[1] = A+C-E-E-D+inc[1];
    out[2] = B-G+inc[2];
    return out;
}


template custom EvPol4() {
    signal input coefs[4][3];
    signal input cIn[3];
    signal input x[3];
    signal output out[3];

    var acc[3] = cIn;
    acc = CMulAddF(acc, x, coefs[3]);
    acc = CMulAddF(acc, x, coefs[2]);
    acc = CMulAddF(acc, x, coefs[1]);
    acc = CMulAddF(acc, x, coefs[0]);
    out <-- acc;
}

template parallel EvalPol(n) {
    signal input pol[n][3];
    signal input x[3];
    signal output out[3];

    var nEvs4 = (n + 3)\4;

    component evs4[nEvs4];
    for (var i=nEvs4-1; i>=0; i--) {
        evs4[i] = EvPol4();
        for (var j=0; j<4; j++) {
            if (i*4+j < n) {
                evs4[i].coefs[j] <== pol[i*4+j];
            } else {
                evs4[i].coefs[j] <== [0,0,0];
            }
        }
        if (i == nEvs4-1) {
            evs4[i].cIn <== [0,0,0];
        } else {
            evs4[i].cIn <== evs4[i+1].out;
        }
        evs4[i].x <== x;
    }

    if (n==0) {
        out <== [0,0,0];
    } else {
        out <== evs4[0].out;
    }
}