pragma circom 2.1.0;

include "../../../../circuits.bn128/gl.circom";

template GLCMulAdd2() {
    signal input ina[3];
    signal input inb[3];
    signal input inc[3];
    signal output out[3];

    var p = 0xFFFFFFFF00000001;

    signal {maxNum} a[3];
    a.maxNum = p - 1;
    a <== ina;

    signal {maxNum} b[3];
    b.maxNum = p - 1;
    b <== inb;

    signal {maxNum} c[3];
    c.maxNum = p - 1;
    c <== inc;

    signal {maxNum} mul[3] <== GLCMul()(a, b);
    signal {maxNum} sum[3] <== GLCAdd()(mul, c);
    signal {maxNum} res[3] <== GLCNorm()(sum);

    out <== res;
}

component main = GLCMulAdd2();
