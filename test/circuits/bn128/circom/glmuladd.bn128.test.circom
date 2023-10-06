pragma circom 2.1.0;

include "../../../../circuits.bn128/gl.circom";

template GLMulAdd() {
    signal input ina;
    signal input inb;
    signal input inc;
    signal output out;

    signal mul <== GLMul()(ina, inb);
    out <== GLAdd(1)(mul, inc);
}

component main = GLMulAdd();