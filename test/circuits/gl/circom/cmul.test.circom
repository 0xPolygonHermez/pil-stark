pragma circom 2.1.0;
pragma custom_templates;

include "../../../../circuits.gl/cmul.circom";

template CMulAdd() {
    signal input ina[3];
    signal input inb[3];
    signal input inc[3];

    signal output out[3];

    signal mul[3] <== CMul()(ina, inb);

    out <== [mul[0] + inc[0], mul[1] + inc[1], mul[2] + inc[2]];
}

component main = CMulAdd();