pragma circom 2.1.0;

include "../../../../circuits.bn128/gl.circom";

template TestGLInv() {
    signal input in;
    signal output out;

    var p = 0xFFFFFFFF00000001;

    signal {maxNum} inp;
    inp.maxNum = p - 1;
    inp <== in;

    signal {maxNum} res <== GLInv()(inp);
    out <== res;
} 

component main = TestGLInv();