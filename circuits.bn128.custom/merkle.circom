pragma circom 2.1.0;
pragma custom_templates;

include "bitify.circom";
include "comparators.circom";
include "poseidon.circom";


template Merkle(keyBits, arity) {
    var nBits = log2(arity);
    var nLevels = (keyBits + nBits - 1)\nBits;

    signal input value;
    signal input siblings[nLevels][arity];
    signal input key[keyBits];
    signal output root;


    component mNext;
    component hash;

    component keyNum;
        
    if (nLevels == 0) {
        root <== value;
    } else {
        keyNum = Bits2Num(nBits);
        for(var i = 0; i < nBits; i++) {
            if(keyBits >= i + 1) {
                keyNum.in[i] <== key[i];
            } else {
                keyNum.in[i] <== 0;
            }
        } 
       
        signal s[arity];
        for(var i = 0; i < arity; i++) {
            s[i] <== IsEqual()([keyNum.out, i]);
        }

        hash = CustomPoseidon(arity);
        hash.initialState <== 0;

        for (var i=0; i<arity; i++) {
            hash.in[i] <== s[i] * (value - siblings[0][i]) + siblings[0][i];
        }

        var nextNBits = keyBits - nBits;
        if (nextNBits<0) nextNBits = 0;

        mNext = Merkle(nextNBits, arity);
        mNext.value <== hash.out[0];
        _ <== hash.out;

        for (var i=0; i<nLevels-1; i++) {
            mNext.siblings[i] <== siblings[i+1];
        }

        for (var i=0; i<nextNBits; i++) {
            mNext.key[i] <== key[i+nBits];
        }

        root <== mNext.root;
    }

}

