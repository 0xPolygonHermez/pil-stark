pragma circom 2.1.0;
pragma custom_templates;

// Perform a multiplication and addition in Fp³ (a * b + c) using (X³ - X - 1) as a irreductible polynomial
// To multiply two elements in Fp³, we first multiply the two elements (a0 + a1*X + a2*X²) * (b0 + b1*X + b2*X²)
// and then perform a long division by the irreductible polynomial. The residue will be the result of the operation.
// The coefficients of the multiplication are calculated beforehand and the resulting expression is explicitly written
// a * b = (a0*b0 + a2*b1 + a1*b2) + (a1*b0 + a0*b1 + a2*b1 + a1*b2 + a2*b2)X + (a2*b0 + a1*b1 + a0*b2 + a2*b2)X²
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

    out <== CMulAdd()(ina, inb, [0,0,0]);
}
