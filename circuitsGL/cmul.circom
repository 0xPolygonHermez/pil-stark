pragma circom 2.0.4;

template CMul() {
    signal input ina[3];
    signal input inb[3];
    signal output out[3];

    signal A;
    signal B;
    signal C;
    signal D;
    signal E;
    signal F;
    signal G;

    A <-- (ina[0] + ina[1])  * (inb[0] + inb[1]);
    B <-- (ina[0] + ina[2])  * (inb[0] + inb[2]);
    C <-- (ina[1] + ina[2])  * (inb[1] + inb[2]);
    D <-- ina[0]*inb[0];
    E <-- ina[1]*inb[1];
    F <-- ina[2]*inb[2];
    G <-- D-E;

    out[0] <-- C+G-F;
    out[1] <-- A+C-E-E-D;
    out[2] <-- B-G;
}