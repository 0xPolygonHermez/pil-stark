pragma circom 2.1.0;

include "../../../../circuits.bn128/gl.circom";

template TestGLCMul() {
    signal input ina[3];
    signal input inb[3];
    signal output out[3];

    var p = 0xFFFFFFFF00000001;

    signal {maxNum} a[3];
    a.maxNum = p - 1;
    a <== ina;

    signal {maxNum} b[3];
    b.maxNum = p - 1;
    b <== inb;

    signal {maxNum} res[3] <== GLCMul()(a,b);
    out <== res;
} 

component main = TestGLCMul();