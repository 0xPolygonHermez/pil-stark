pragma circom 2.0.4;

include "poseidon.circom";

template LinearHash(nInputs, eSize) {

    signal input in[nInputs][eSize];
    signal output out[4];

    var nHashes = (nInputs*eSize - 1)\8 +1;
    component hash[nHashes];

    var curInput=0;
    var curC=0;

    for (var i=0; i<nHashes; i++) {
        hash[i] = Poseidon(4);
        for (var k=0; k<8; k++) {
            if (curInput<nInputs) {
                hash[i].in[k] <== in[curInput][curC];
                curC++;
                if (curC == eSize) {
                    curC =0;
                    curInput += 1;
                }
            } else {
                hash[i].in[k] <== 0;
            }
        }
        for (var k=0; k<4; k++) {
            if (i>0) {
                hash[i].capacity[k] <== hash[i-1].out[k];
            } else {
                hash[i].capacity[k] <== 0;
            }
        }
    }

    for (var k=0; k<4; k++) {
        out[k] <== hash[nHashes-1].out[k];
    }

}

