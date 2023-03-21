pragma circom 2.1.0;
pragma custom_templates;

include "poseidonT.circom";
include "bitify.circom";
include "comparators.circom";
include "mux1.circom";
// include "poseidon.circom";


template Merkle(keyBits, arity) {
    var nLevels = 0;
    var nBits = log2(arity);
    var n = 1 << keyBits;
    var nn = n;
    while (nn>1) {
        nLevels ++;
        nn = (nn - 1)\arity + 1;
    }

    signal input value;
    signal input siblings[nLevels][arity];
    signal input key[keyBits];
    signal output root;

    signal s[arity];


    component mNext;
    component hash;

    component keyNum;
        
    if (nLevels == 0) {
        root <== value;
        for(var i = 0; i < arity; i++) {
            s[i] <== 0;
        }
    } else {
        keyNum = Bits2Num(nBits);
        for(var i = 0; i < nBits; i++) {
            if(keyBits >= i + 1) {
                keyNum.in[i] <== key[i];
            } else {
                keyNum.in[i] <== 0;
            }
        } 
       
        for(var i = 0; i < arity; i++) {
            s[i] <== Mux1()([0,1], IsEqual()([keyNum.out, i]));
        }

        hash = CustomPoseidon(arity);
        hash.initialState <== 0;

        for (var i=0; i<arity; i++) {
            hash.in[i] <== s[i] * (value - siblings[0][i]) + siblings[0][i];
        }

        var nextNBits = keyBits - nBits;
        if (nextNBits<0) nextNBits = 0;
        var nNext = (n - 1)\arity + 1;

        mNext = Merkle(nextNBits, arity);
        mNext.value <== hash.out[0];

        for (var i=0; i<nLevels-1; i++) {
            for (var k=0; k<arity; k++) {
                mNext.siblings[i][k] <== siblings[i+1][k];
            }
        }

        for (var i=0; i<nextNBits; i++) {
            mNext.key[i] <== key[i+nBits];
        }

        root <== mNext.root;
    }

}
