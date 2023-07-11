pragma circom 2.1.0;

include "poseidon.circom";

template Merkle(keyBits) {
    var arity = 16;
    var nLevels = 0;
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

    signal s[16];

    component mNext;
    component hash;

    component keyNum;
        
    if (nLevels == 0) {
        root <== value;
        s <== [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    } else {
        keyNum = Bits2Num(4);
        for(var i = 0; i < 4; i++) {
            if(keyBits >= i + 1) {
                keyNum.in[i] <== key[i];
            } else {
                keyNum.in[i] <== 0;
            }
        } 
       
        for(var i = 0; i < 16; i++) {
            s[i] <== IsEqual()([keyNum.out, i]);
        }

        hash = Poseidon(arity);

        for (var i=0; i<arity; i++) {
            hash.inputs[i] <== s[i] * (value - siblings[0][i] ) + siblings[0][i];
        }

        var nextNBits = keyBits -4;
        if (nextNBits<0) nextNBits = 0;
        var nNext = (n - 1)\arity + 1;

        mNext = Merkle(nextNBits);
        mNext.value <== hash.out;

        for (var i=0; i<nLevels-1; i++) {
            for (var k=0; k<arity; k++) {
                mNext.siblings[i][k] <== siblings[i+1][k];
            }
        }

        for (var i=0; i<nextNBits; i++) {
            mNext.key[i] <== key[i+4];
        }

        root <== mNext.root;
    }

}

