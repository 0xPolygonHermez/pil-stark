pragma circom 2.1.0;

include "../../../../circuits.bn128/gl.circom";

template GLMulAdd() {
    signal input ina;
    signal input inb;
    signal input inc;
    signal output out;

    signal mul <== GLMul()(ina, inb);
    signal sum <== GLAdd()(mul, inc);
    out <== GLNorm()(sum);
}

component main = GLMulAdd();
