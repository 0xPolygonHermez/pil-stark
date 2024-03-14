pragma circom 2.1.0;

include "bitify.circom";
include "comparators.circom";
include "poseidon.circom";

/*
    Given a leaf value, its sibling path and a key indicating the hashing position for each element in the path, calculate the merkle tree root 
    - keyBits: number of bits in the key
*/
template Merkle(keyBits, arity) {
    var nLevels = 0;
    var nBits = log2(arity);
    var n = 1 << keyBits;
    var nn = n;
    while (nn > 1) {
        nLevels++;
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
            s[i] <== IsEqual()([keyNum.out, i]);
        }

        hash = Poseidon(arity);

        for (var i=0; i<arity; i++) {
            hash.inputs[i] <== s[i] * (value - siblings[0][i]) + siblings[0][i];
        }

        var nextNBits = keyBits - nBits;
        if (nextNBits<0) nextNBits = 0;
        var nNext = (n - 1)\arity + 1;

        mNext = Merkle(nextNBits, arity);
        mNext.value <== hash.out;

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

