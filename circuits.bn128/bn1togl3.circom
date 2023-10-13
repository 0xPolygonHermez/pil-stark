
pragma circom 2.1.0;

include "bitify.circom";

/*
Given an element over the BN128 scalar's field,
returns an element over the cubic extension of the Goldilocks field*:
     If a = (a₁, a₂, a₃) ∊ BN with a₁,a₂ ∊ [0, 2⁶⁴) and a₃ ∊ [0, 2¹²⁶),
     then BN1toGL3(a) = (a₁, a₂, a₃') ∊ GL³ with a₁,a₂,a₃' ∊ [0, 2⁶⁴) and a₃' being the 64 least significant bits of a₃.

NOTE1: This function is well-defined, even tho for some inputs we map some aᵢ outside of the range [0, GL).

NOTE2: This function is surjective but is not (and cannot be) injective.

NOTE3: The ouput distribution of this function is uniform if one accepts alias:
                     Pr_a[BN1toGL3(a) = (a₁, a₂, a₃')] = 2⁶²·2⁻²⁵⁴ = 2⁻¹⁹²
but it turns out to be non-uniform (but very very close to it) if one does not accept alias. 
If x is sampled uniformly from [0, 2⁶⁴), then:
                    Pr_x[x ∉ [0, GL)] =  1 - GL·2⁻⁶⁴ = 0,0000000002
In fact, there are 2⁶⁴ - GL = 2³² - 1 = 4.294.967.295 elements that have twice the probability to be sampled.
            Pr_a[any of a₁,a₂,a₃' ∉ [0, GL)] = 3·Pr_x[x ∉ [0, GL)] = 0,0000000006

In the worst scenario, there are (2³² - 1)³ elements that have eight times the probability to be sampled.
For example, a = 0 can be maped from any of the following elements:
                    (0,0,0), (0,0,p), (0,p,0), (0,p,p), (p,0,0), (p,0,p), (p,p,0), (p,p,p)
In contrast, a = ((p-1)/2,(p-1)/2,0) can only be mapped from ((p-1)/2,(p-1)/2,0) and ((p-1)/2,(p-1)/2,p).

Therefore:
            Pr_a[BN1toGL3(a) = (a₁, a₂, a₃')] ≤ 8·2⁶²·2⁻²⁵⁴ = 2⁻¹⁸⁹
which is acceptable.

(*) To be precise, in the range [0, 2⁶⁴)³. But this is acceptable in the case that we work with alias and 
    we perform modular reduction after this mapping.
*/
template BN1toGL3() {
    signal input in;
    signal output {maxNum} out[3];

    signal n2b[254] <== Num2Bits_strict()(in);
    
    component b2n[3];

    out.maxNum = 0xFFFFFFFFFFFFFFFF;

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
