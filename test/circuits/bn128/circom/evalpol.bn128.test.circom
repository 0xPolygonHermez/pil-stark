pragma circom 2.1.0;
pragma custom_templates;

include "../../../../circuits.bn128/evalpol.circom";

template EvPol(n) {
    signal input pol[n][3];
    signal input x[3];
    signal output out[3];

    var p = 0xFFFFFFFF00000001;

    signal {maxNum} xx[3];
    xx.maxNum = p - 1;
    xx <== x;

    signal {maxNum} polynomial[n][3];
    polynomial.maxNum = p - 1;
    polynomial <== pol;

    signal {maxNum} ev[3] <== EvalPol(n)(polynomial, xx);
    out <== ev;
}

component main = EvPol(32);

