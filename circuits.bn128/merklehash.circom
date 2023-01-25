pragma circom 2.1.0;

include "linearhash.circom";
include "merkle.circom";
include "utils.circom";

template parallel MerkleHash(eSize, elementsInLinear, nLinears) {
    var nBits = log2(nLinears);
    assert(1 << nBits == nLinears);
    var nLevels = (nBits - 1)\4 +1;
    signal input values[elementsInLinear][eSize];
    signal input siblings[nLevels][16];
    signal input key[nBits];
    signal output root;

    var linearHash = LinearHash(elementsInLinear, eSize)(values);
  
    root <== Merkle(nBits)(linearHash, siblings, key);
}
