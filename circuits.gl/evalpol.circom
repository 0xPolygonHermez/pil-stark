pragma circom 2.1.0;
pragma custom_templates;


function CMulAddF(ina, inb, inc) {

    var A = (ina[0] + ina[1])  * (inb[0] + inb[1]);
    var B = (ina[0] + ina[2])  * (inb[0] + inb[2]);
    var C = (ina[1] + ina[2])  * (inb[1] + inb[2]);
    var D = ina[0]*inb[0];
    var E = ina[1]*inb[1];
    var F = ina[2]*inb[2];
    var G = D-E;

    var out[3];

    out[0] = C+G-F+inc[0];
    out[1] = A+C-E-E-D+inc[1];
    out[2] = B-G+inc[2];
    return out;
}

// Evaluate a Polynomial of degree 4 (with 5 coefficients) and each coefficient made of 3 values at x using Horner's rule
// Given the polynomial p(x) = coefs[4]*x⁴ + coefs[3]*x³ + coefs[2]*x² + coefs[1]*x + coefs[0], we can calculate
// its value by doing p(x) = ((((coefs[4]*x + coefs[3])*x + coefs[2])*x + coefs[1])*x + coefs[0]) 
template custom EvPol4() {
    signal input coefs[5][3]; // Coeficients in the extended field
    signal input x[3]; // Point at which we are evaluating the polynomial
    signal output out[3]; 

    // Apply Horner's rule to calculate the evaluation of the polynomial at point x
    var acc[3] = coefs[4];
    acc = CMulAddF(acc, x, coefs[3]);
    acc = CMulAddF(acc, x, coefs[2]);
    acc = CMulAddF(acc, x, coefs[1]);
    acc = CMulAddF(acc, x, coefs[0]);
    out <-- acc;
}

/*
    Evaluate a polynomial of degree n at point x using Horner's rule.
    Notice that Horner's rule can be split in different polynomials, one simply need to use as first coefficient 
    of the subsequent polynomial the evaluation result of the previous one.
    The idea is to use the custom template EvPol4 to evaluate a potentially much bigger polynomial
*/
template EvalPol(n) {
    signal input pol[n][3];
    signal input x[3];
    signal output out[3];

    // Split n in batches of 4 coefficients
    // From 1 to 4 coefficients-> 1 
    // From 5 to 8 coefficients -> 2
    // ...
    // Note: if n = 0 -> 0
    var nEvs4 = (n + 3)\4;

    component evs4[nEvs4];

    // Calculate the evaluations of the polynomials using EvPol4
    for (var i=nEvs4-1; i>=0; i--) {
        evs4[i] = EvPol4();
        for (var j=0; j<4; j++) {
            // Add the coefficients for the EvPol. If there are not enough inputs to fulfill the 4 slots, add zeros
            if (i*4+j < n) {
                evs4[i].coefs[j] <== pol[i*4+j];
            } else {
                evs4[i].coefs[j] <== [0,0,0];
            }
        }
        // For the first iteration we will set the coefficient of the highest term to zero. Otherwise we will use the result 
        // of the previous evaluation.
        if (i == nEvs4-1) {
            evs4[i].coefs[4] <== [0,0,0];
        } else {
            evs4[i].coefs[4] <== evs4[i+1].out;
        }
        evs4[i].x <== x;
    }

    // If n = 0 return an empty array. Otherwise return the evaluation of the polynomial
    if (n==0) {
        out <== [0,0,0];
    } else {
        out <== evs4[0].out;
    }
}
