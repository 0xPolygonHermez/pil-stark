pragma circom 2.1.0;

include "gl.circom";

template EvalPol(n) {
    signal input pol[n][3];
    signal input x[3];
    signal output out[3];

    component cmul[n-1];

    for (var i=1; i<n; i++) {
        cmul[i-1] = GLCMulAdd();
        if (i==1) {
            cmul[i-1].ina <== pol[n-1];
        } else {
            cmul[i-1].ina <== cmul[i-2].out;
        }
        cmul[i-1].inb <== x;

        cmul[i-1].inc <== pol[n-i-1];
    }

    if (n>1) {
        out <== cmul[n-2].out;
    } else {
        out <== pol[n-1];

    }
}
