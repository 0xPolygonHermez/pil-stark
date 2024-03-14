pragma circom 2.1.0;

include "poseidon.circom";

// Given a list on inputs over GL³, compute the linear hash of the list, mapping from GL³ to BN
// via the map (x,y,z) |-> x + y·2⁶⁴ + z·2¹²⁸, which is injective but not surjective;
// and hashing the resulting BN elements in chunks of 16 using Poseidon.
template LinearHash(nInputs, eSize, arity) {
    signal input in[nInputs][eSize];
    signal output out;

    var nElements256 = (nInputs*eSize - 1)\3 + 1;

    var sAc = 0;
    var nAc = 0;

    var nHashes;
    if (nElements256 == 1) {
        for (var i=0; i<nInputs; i++) {
            for (var j=0; j<eSize; j++) {
                sAc = sAc + 2**(64*nAc) * in[i][j];
                nAc++;
            }
        }
        out <== sAc;
        nHashes = 0;
    } else {

        nHashes = (nElements256 - 1)\arity +1;
    }

    component hash[nHashes > 0 ? nHashes - 1 : 0];
    var nLastHash;
    component lastHash;

    for (var i=0; i<nHashes-1; i++) {
        hash[i] = PoseidonEx(arity, 1);
    }

    if (nHashes>0) {
        nLastHash = nElements256 - (nHashes - 1)*arity;
        lastHash = PoseidonEx(nLastHash, 1);
    }

    var curHash =0;
    var curHashIdx = 0;

    if (nElements256 > 1) {
        for (var i=0; i<nInputs; i++) {
            for (var j=0; j<eSize; j++) {
                sAc = sAc + 2**(64*nAc) * in[i][j];
                nAc++;
                if (nAc == 3) {
                    if (curHash == nHashes - 1) {
                        lastHash.inputs[curHashIdx] <== sAc;
                    } else {
                        hash[curHash].inputs[curHashIdx] <== sAc;
                    }
                    sAc = 0;
                    nAc = 0;
                    curHashIdx ++;
                    if (curHashIdx == arity) {
                        curHash++;
                        curHashIdx = 0;
                    }
                }
            }
        }
        if (nAc > 0) {
            if (curHash == nHashes - 1) {
                lastHash.inputs[curHashIdx] <== sAc;
            } else {
                hash[curHash].inputs[curHashIdx] <== sAc;
            }
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
        if (nHashes == 1) {
            lastHash.initialState <== 0;
        } else {
            lastHash.initialState <== hash[nHashes-2].out[0];
        }

        _ <== lastHash.out;
        out <== lastHash.out[0];
    }
}

