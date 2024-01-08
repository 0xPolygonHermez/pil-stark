pragma circom 2.1.0;

include "../../../../circuits.bn128/gl.circom";

template GLMulAdd() {
    signal input ina;
    signal input inb;
    signal input inc;
    signal output out;

    var p = 0xFFFFFFFF00000001;

    signal {maxNum} a;
    a.maxNum = p - 1;
    a <== ina;

    signal {maxNum} b;
    b.maxNum = p - 1;
    b <== inb;

    signal {maxNum} c;
    c.maxNum = p - 1;
    c <== inc;

    signal {maxNum} mul <== GLMul()(a, b);
    signal {maxNum} sum <== GLAdd()(mul, c);
    signal {maxNum} res <== GLNorm()(sum);

    out <== res;
}

component main = GLMulAdd();
