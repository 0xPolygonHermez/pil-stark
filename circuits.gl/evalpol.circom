pragma circom 2.0.4;
pragma custom_templates;

include "cmul.circom";

template EvalPol(n) {
    signal input pol[n][3];
    signal input x[3];
    signal output out[3];

    signal acc[n][3];

    component cmul[n-1];

    for (var e=0; e<3; e++) {
        acc[0][e] <== pol[n-1][e];
    }

    for (var i=1; i<n; i++) {
        cmul[i-1] = CMul();
        cmul[i-1].ina[0] <== acc[i-1][0];
        cmul[i-1].ina[1] <== acc[i-1][1];
        cmul[i-1].ina[2] <== acc[i-1][2];
        cmul[i-1].inb[0] <== x[0];
        cmul[i-1].inb[1] <== x[1];
        cmul[i-1].inb[2] <== x[2];
        acc[i][0] <== cmul[i-1].out[0] + pol[n-1-i][0];
        acc[i][1] <== cmul[i-1].out[1] + pol[n-1-i][1];
        acc[i][2] <== cmul[i-1].out[2] + pol[n-1-i][2];
    }

    out[0] <== acc[n-1][0];
    out[1] <== acc[n-1][1];
    out[2] <== acc[n-1][2];
}