pragma circom 2.1.0;
pragma custom_templates;

include "poseidon.circom";

template LinearHash(nInputs, eSize, arity) {
    signal input in[nInputs][eSize];
    signal output out;

    var nElements256 = (nInputs*eSize - 1)\3 +1;

    var sAc = 0;
    var nAc =0;

    var nHashes;
    if (nElements256 == 1) {
        for (var i=0; i<nInputs; i++) {
            for (var j=0; j<eSize; j++) {
                sAc = sAc + 2**(64*nAc) * in[i][j];
                nAc ++;
            }
        }
        out <== sAc;
        nHashes = 0;
    } else {

        nHashes = (nElements256 - 1)\arity +1;
    }

    component hash[nHashes>0 ? nHashes : 1];
    var nLastHash;

    for (var i=0; i<nHashes; i++) {
        hash[i] = CustomPoseidon(arity);
    }

    if (nHashes>0) {
        nLastHash = nElements256 - (nHashes - 1)*arity;
    }

    var curHash =0;
    var curHashIdx = 0;

    if (nElements256 > 1) {

        for (var i=0; i<nInputs; i++) {
            for (var j=0; j<eSize; j++) {
                sAc = sAc + 2**(64*nAc) * in[i][j];
                nAc ++;
                if (nAc == 3) {
                    hash[curHash].in[curHashIdx] <== sAc;
                    sAc =0;
                    nAc =0;
                    curHashIdx ++;
                    if (curHashIdx == arity) {
                        curHash++;
                        curHashIdx = 0;
                    }
                }
            }
        }
        if (nAc > 0) {
            hash[curHash].in[curHashIdx] <== sAc;
            curHashIdx ++;
            if (curHashIdx == arity) {
                curHash = 0;
                curHashIdx = 0;
            }
        }

        for (var i=0; i<nHashes-1;i++) {
            if (i==0) {
                hash[i].initialState <== 0;
            } else {
                hash[i].initialState <== hash[i-1].out[0];
            }
            _ <== hash[i].out;
        }

        for(var k = nLastHash; k < arity; k++) {
            hash[nHashes-1].in[k] <== 0;
        }

        if (nHashes == 1) {
            hash[nHashes-1].initialState <== 0;
        } else {
            hash[nHashes-1].initialState <== hash[nHashes-2].out[0];
        }

        _ <== hash[nHashes-1].out;
        out <== hash[nHashes-1].out[0];
    }
}

