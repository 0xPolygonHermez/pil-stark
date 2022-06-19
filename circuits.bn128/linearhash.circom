pragma circom 2.0.4;

include "../node_modules/circomlib/circuits/poseidon.circom";

template LinearHash(nInputs, eSize) {
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

        nHashes = (nElements256 - 1)\16 +1;
    }

    component hash[nHashes];


    for (var i=0; i<nHashes; i++) {
        hash[i] = PoseidonEx(16, 1);
    }

    var curHash =0;
    var curHashIdx = 0;

    if (nElements256 > 1) {

        for (var i=0; i<nInputs; i++) {
            for (var j=0; j<eSize; j++) {
                sAc = sAc + 2**(64*nAc) * in[i][j];
                nAc ++;
                if (nAc == 3) {
                    hash[curHash].inputs[curHashIdx] <== sAc;
                    sAc =0;
                    nAc =0;
                    curHashIdx ++;
                    if (curHashIdx == 16) {
                        curHash++;
                        curHashIdx = 0;
                    }
                }
            }
        }
        if (nAc > 0) {
            hash[curHash].inputs[curHashIdx] <== sAc;
            curHashIdx ++;
            if (curHashIdx == 16) {
                curHash = 0;
                curHashIdx = 0;
            }
        }
        if (curHash <nHashes) {
            for (var i= curHashIdx; i< 16; i++) {
                hash[curHash].inputs[i] <== 0;
            }
        }

        for (var i=0; i<nHashes;i++) {
            if (i==0) {
                hash[i].initialState <== 0;
            } else {
                hash[i].initialState <== hash[i-1].out[0];
            }
        }

        out <== hash[nHashes -1].out[0];
    }
}

