pragma circom 2.1.0;
pragma custom_templates;

include "linearhash.circom";
include "merkle.circom";
include "utils.circom";

template parallel MerkleHash(eSize, elementsInLinear, nLinears) {
    var nBits = log2(nLinears);
    assert(1 << nBits == nLinears);
    signal input values[elementsInLinear][eSize];
    signal input siblings[nBits][4];
    signal input key[nBits];
    signal output root[4];

    var linearHash[4] = LinearHash(elementsInLinear, eSize)(values);

    root <== Merkle(nBits)(linearHash, siblings ,key);
}
