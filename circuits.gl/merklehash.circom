pragma circom 2.0.4;
pragma custom_templates;

include "linearhash.circom";
include "merkle.circom";
include "utils.circom";

template MerkleHash(eSize, elementsInLinear, nLinears) {
    var nBits = log2(nLinears);
    assert(1 << nBits == nLinears);
    signal input values[elementsInLinear][eSize];
    signal input siblings[nBits][4];
    signal input key[nBits];
    signal output root[4];

    component linearHash = LinearHash(elementsInLinear, eSize);

    for (var i=0; i<elementsInLinear; i++) {
        for (var e=0; e<eSize; e++) {
            linearHash.in[i][e] <== values[i][e];
        }
    }

    component merkle = Merkle(nBits);

    for (var i=0; i<4; i++) {
        merkle.value[i] <== linearHash.out[i];
    }
    for (var i=0; i<nBits; i++) {
        merkle.key[i] <== key[i];
        for (var j=0; j<4; j++) {
            merkle.siblings[i][j] <== siblings[i][j];
        }
    }
    for (var i=0; i<4; i++) {
        root[i] <== merkle.root[i];
    }
}
