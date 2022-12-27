pragma circom 2.1.0;
pragma custom_templates;

include "poseidon.circom";

template BasicLinearHash(nInputs) {

    signal input in[nInputs];
    signal output out[4];


    var nHashes;

    if (nInputs <= 4) {
        nHashes = 0;
    } else {
        nHashes = (nInputs - 1)\8 +1;
    }

    component hash[nHashes];

    if (nInputs <= 4) {
        for (var i=0; i<4; i++) {
            if (i<nInputs) {
                out[i] <== in[i];
            } else {
                out[i] <== 0;
            }
        }
    } else {

        var curInput=0;
        var curC=0;

        for (var i=0; i<nHashes; i++) {
            hash[i] = Poseidon(4);
            for (var k=0; k<8; k++) {
                if (i*8+k<nInputs) {
                    hash[i].in[k] <== in[i*8+k];
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


template LinearHash(nInputs, eSize) {
    signal input in[nInputs][eSize];
    signal output out[4];

    var totalIn = nInputs*eSize;

    var batchSize = (totalIn + 3) \ 4;
    if (batchSize <8) batchSize=8;

    var nHashes = (totalIn + batchSize -1) \ batchSize;

    component hash[nHashes-1];
    component lastHash;

    var curInput=0;
    var curC=0;
    for (var i=0; i<nHashes; i++) {
        if (i<nHashes-1) {
            hash[i] = BasicLinearHash(batchSize);
            for (var k=0; k<batchSize; k++) {
                hash[i].in[k] <== in[curInput][curC];
                curC++;
                if (curC == eSize) {
                    curC =0;
                    curInput += 1;
                }
            }
        } else {
            var n = totalIn - i*batchSize;
            lastHash = BasicLinearHash(n);
            for (var k=0; k<n; k++) {
                lastHash.in[k] <== in[curInput][curC];
                curC++;
                if (curC == eSize) {
                    curC =0;
                    curInput += 1;
                }
            }
        }
    }

    component hashFinal;

    if (nHashes == 0) {
        for (var k=0; k<4; k++) {
            out[k] <== 0;
        }
    } else if (nHashes ==1) {
        for (var k=0; k<4; k++) {
            out[k] <== lastHash.out[k];
        }
    } else {
        hashFinal = BasicLinearHash(nHashes*4);
        for (var i=0; i<nHashes; i++) {
            for (var k=0; k<4; k++) {
                if (i<nHashes-1) {
                    hashFinal.in[i*4+k] <== hash[i].out[k];
                } else {
                    hashFinal.in[i*4+k] <== lastHash.out[k];
                }
            }
        }
        for (var k=0; k<4; k++) {
            out[k] <== hashFinal.out[k];
        }
    }
}



