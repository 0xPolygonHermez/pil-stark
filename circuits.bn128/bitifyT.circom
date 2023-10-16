pragma circom 2.1.5;

include "compconstant.circom";

template AliasCheckT() {

    signal input {binary} in[254];

    signal compConstant <== CompConstant(-1)(in);
    compConstant === 0;
}


template Num2BitsT(n) {
    signal input in;
    signal output {binary} out[n];
        
    var lc1=0;
    var e2=1;
    for (var i = 0; i<n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] -1 ) === 0; // to ensure binary
        lc1 += out[i] * e2;
        e2 = e2+e2;
    }

    lc1 === in; // to ensure that out is the binary representation of in
}

template Num2Bits_strictT() {
    signal input in;
    signal output {binary} out[254];

    out <== Num2BitsT(254)(in);
    AliasCheckT()(out);
}


template Bits2NumT(n) {
    signal input {binary} in[n];
    signal output out;
    var lc1=0;

    var e2 = 1;
    for (var i = 0; i<n; i++) {
        lc1 += in[i] * e2;
        e2 = e2 + e2;
    }

    lc1 ==> out;
}


template Bits2Num_strictT() {
    signal input {binary} in[254];
    signal output out;

    out <== Bits2NumT(254)(in);
}