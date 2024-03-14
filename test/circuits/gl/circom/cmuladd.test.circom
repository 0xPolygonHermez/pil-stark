pragma circom 2.1.0;
pragma custom_templates;

include "../../../../circuits.gl/cmul.circom";

template CMulAdd() {
    signal input ina[3];
    signal input inb[3];
    signal input inc[3];

    signal output out[3];

    signal cmul[3] <== CMul()(ina, inb);
    out <== [inc[0] + cmul[0], inc[1] + cmul[1], inc[2] + cmul[2]];
}

component main = CMulAdd();
