pragma circom 2.1.0;

include "../../../../circuits.bn128/gl.circom";

template TestGLCInv() {
    signal input in[3];
    signal output out[3];

    var p = 0xFFFFFFFF00000001;

    signal {maxNum} inp[3];
    inp.maxNum = p - 1;
    inp <== in;

    signal {maxNum} res[3] <== GLCInv()(inp);
    out <== res;
} 

component main = TestGLCInv();