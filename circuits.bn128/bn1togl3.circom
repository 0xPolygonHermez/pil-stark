
pragma circom 2.1.0;

include "bitify.circom";

// Given an element over the BN128 scalar's field, 
// returns an element over the cubic extension of the Goldilocks field:
//      If a = (a₁, a₂, a₃) ∊ BN with a₁,a₂ ∊ [0, 2⁶⁴) and a₃ ∊ [0, 2¹²⁶),
//      then BN1toGL3(a) = (a₁, a₂, a₃') ∊ GL³ with a₁,a₂,a₃' ∊ [0, 2⁶⁴) and a₃' being the 64 least significant bits of a₃.
template BN1toGL3() {
    signal input in;
    signal output out[3];

    signal n2b[254] <== Num2Bits_strict()(in);
    
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
