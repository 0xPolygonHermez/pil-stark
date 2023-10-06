pragma circom 2.1.0;

include "../../../../circuits.bn128/gl.circom";

template GLCMulAdd() {
    signal input ina[3];
    signal input inb[3];
    signal input inc[3];
    signal output out[3];

    signal mul[3] <== GLCMul()(ina, inb);
    out <== GLCAdd()(mul, inc);
}

component main = GLCMulAdd();