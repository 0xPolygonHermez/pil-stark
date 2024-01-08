pragma circom 2.1.0;

include "gl.circom";

// Given a polynomial p(X) of degree lower than n over the GL³ field, and an evaluation point x from GL³,
// it computes p(x) using Horner's method: 
//                          p(x) = p₀ + x(p₁ + x(p₂ + ... + x(pₙ₋₁))).
template EvalPol(n) {
    signal input {maxNum} pol[n][3];
    signal input {maxNum} x[3];
    signal output {maxNum} out[3];

    signal {maxNum} cmul[n-1][3];
    cmul.maxNum = 0xFFFFFFFFFFFFFFFF;
    
    for (var i=1; i<n; i++) {
        if (i==1) {
            cmul[i-1] <== GLCMulAdd()(pol[n - 1], x, pol[n - 2]);
        } else {
            cmul[i-1] <== GLCMulAdd()(cmul[i - 2], x, pol[n - i - 1]);
        }
    }

    if (n>1) {
        out <== cmul[n-2];
    } else {
        out <== pol[n-1];

    }
}
