pragma circom 2.1.6;
pragma custom_templates;

include "cmul.circom";
include "mux1.circom";
include "iszero.circom";

template MinimalPolinomial() {
    signal input z[3];

    signal output m[3];

    signal z2[3] <== CMul()(z, z);
    signal z3[3] <== CMul()(z2, z);


    signal z1z2 <== z[1]*z2[2];
    signal z2z1 <== z2[1]*z[2];
    
    signal has3x2Solution <== IsZero()(z1z2 - z2z1);

    signal c3x2[2];

    c3x2[1] <-- - z2[1] / z[1];
    z[1]*c3x2[1] + z2[1] === 0;

    c3x2[0] <== - z2[0] - z[0]*c3x2[1];

    signal c3x3[3]; 

    signal im1 <== z[1] * z3[2];
    signal im2 <== z[2] * z3[1];
    signal im3 <== z[2] * z2[1];
    signal im4 <== z[1] * z2[2];

    c3x3[2] <-- (im1 - im2) / (im3 - im4);
    c3x3[2] * (im3 - im4) - (im1 - im2) === 0;

    signal im5 <== c3x3[2]*z2[2];
    c3x3[1] <-- (-z3[2] - im5) / z[2];
    c3x3[1]*z[2] + z3[2] + im5 === 0;

    signal im6 <== c3x3[1]*z[0];
    signal im7 <== c3x3[2]*z2[0];
    c3x3[0] <-- -z3[0] - im6 - im7;

    m[0] <== Mux1()([c3x3[0], c3x2[0]], has3x2Solution);
    m[1] <== Mux1()([c3x3[1], c3x2[1]], has3x2Solution);
    m[2] <== Mux1()([c3x3[2], 0], has3x2Solution);
}

template EvaluateMinimalPolinomial() {
    
}