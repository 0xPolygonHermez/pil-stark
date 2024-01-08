pragma circom 2.1.0;

include "../../../../circuits.bn128/gl.circom";

template TestGLMul() {
    signal input ina;
    signal input inb;
    signal output out;

    var p = 0xFFFFFFFF00000001;

    signal {maxNum} a;
    a.maxNum = p - 1;
    a <== ina;

    signal {maxNum} b;
    b.maxNum = p - 1;
    b <== inb;

    signal {maxNum} res <== GLMul()(a,b);
    out <== res;
} 

component main = TestGLMul();