
pragma circom 2.0.6;

include "bitify.circom";

template BN1toGL3() {
    signal input in;
    signal output out[3];

    var n2b[254] = Num2Bits_strict()(in);
    
    component b2n[3];

    for (var i=0; i<3; i++) {
        b2n[i] = Bits2Num(64);
        for (var j=0; j<64; j++) {
            b2n[i].in[j] <== n2b[64*i+j];
        }
        out[i] <== b2n[i].out;
    }

    for (var i=192; i < 254; i++) {
        _ <== n2b[i];
    }
}