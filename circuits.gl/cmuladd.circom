pragma circom 2.1.0;
pragma custom_templates;

template custom CMulAdd() {
    signal input ina[3];
    signal input inb[3];
    signal input inc[3];
    signal output out[3];

    var A = (ina[0] + ina[1])  * (inb[0] + inb[1]);
    var B = (ina[0] + ina[2])  * (inb[0] + inb[2]);
    var C = (ina[1] + ina[2])  * (inb[1] + inb[2]);
    var D = ina[0]*inb[0];
    var E = ina[1]*inb[1];
    var F = ina[2]*inb[2];
    var G = D-E;

    out[0] <-- C+G-F+inc[0];
    out[1] <-- A+C-E-E-D+inc[1];
    out[2] <-- B-G+inc[2];
}

template CMul() {
    signal input ina[3];
    signal input inb[3];
    signal output out[3];

    component mulAdd = CMulAdd();

    mulAdd.ina <== ina;
    mulAdd.inb <== inb;
    mulAdd.inc <== [0,0,0];

    out <== mulAdd.out;
}