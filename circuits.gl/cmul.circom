pragma circom 2.1.0;
pragma custom_templates;

// Perform a multiplication in Fp³ (a * b) using (X³ - 2) as a irreductible polynomial
// To multiply two elements in Fp³, we first multiply the two elements (a0 + a1*X + a2*X²) * (b0 + b1*X + b2*X²)
// and then perform a long division by the irreductible polynomial. The residue will be the result of the operation.
// The coefficients of the multiplication are calculated beforehand and the resulting expression is explicitly written
// a * b = (a0*b0 + 2*a2*b1 + 2*a1*b2) + (a1*b0 + a0*b1 + 2*a2*b2)X + (a2*b0 + a1*b1 + a0*b2)X²
template custom CMul() {
    signal input ina[3];
    signal input inb[3];
    signal output out[3];


    out[0] <-- ina[0]*inb[0] + 2*ina[2]*inb[1] + 2*ina[1]*inb[2];
    out[1] <-- ina[1]*inb[0] + ina[0]*inb[1] + 2*ina[2]*inb[2];
    out[2] <-- ina[2]*inb[0] + ina[1]*inb[1] + ina[0]*inb[2];
}
