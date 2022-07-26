
pragma circom 2.0.6;

include "../node_modules/circomlib/circuits/bitify.circom";

template BN1toGL3() {
    signal input in;
    signal output out[3];

    component n2b = Num2Bits_strict();

    n2b.in <== in;

    component b2n[3];

    for (var i=0; i<3; i++) {
        b2n[i] = Bits2Num(64);
        for (var j=0; j<64; j++) {
            b2n[i].in[j] <== n2b.out[64*i+j];
        }
        out[i] <== b2n[i].out;
    }

}