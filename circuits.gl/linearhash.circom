pragma circom 2.1.0;
pragma custom_templates;

include "poseidon.circom";

template LinearHash(nInputs, eSize) {

    signal input in[nInputs][eSize];
    signal output out[4];


    var nHashes;

    if (nInputs*eSize <= 4) {
        nHashes = 0;
    } else {
        nHashes = (nInputs*eSize - 1)\8 +1;
    }

    component hash[nHashes];

    if (nInputs*eSize <= 4) {
        var curI=0;
        var curE=0;
        for (var i=0; i<4; i++) {
            if (i<nInputs*eSize) {
                out[i] <== in[curI][curE];
                curE = curE +1;
                if (curE == eSize) {
                    curE =0;
                    curI ++;
                }
            }
        }
    } else {

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
}



