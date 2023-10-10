pragma circom 2.1.0;

include "gl.circom";

// Given a polynomial p(X) of degree lower than n over the GL³ field, and an evaluation point x from GL³,
// it computes p(x) using Horner's method: 
//                          p(x) = p₀ + x(p₁ + x(p₂ + ... + x(pₙ₋₁))).
template EvalPol(n) {
    signal input {maxNum} pol[n][3];
    signal input {maxNum} x[3];
    signal output {maxNum} out[3];

    component cmul[n-1];

    for (var i=1; i<n; i++) {
        cmul[i-1] = GLCMulAdd(67);
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
