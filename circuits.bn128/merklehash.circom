pragma circom 2.1.0;

include "linearhash.circom";
include "merkle.circom";
include "utils.circom";

template parallel VerifyMerkleHash(eSize, elementsInLinear, nLinears) {
    var nBits = log2(nLinears);
    assert(1 << nBits == nLinears);
    var nLevels = (nBits - 1)\4 +1;
    signal input values[elementsInLinear][eSize];
    signal input siblings[nLevels][16];
    signal input key[nBits];
    signal input root;
    signal input enable;
    //signal output root;

    var linearHash = LinearHash(elementsInLinear, eSize)(values);
  
    var merkleRoot = Merkle(nBits)(linearHash, siblings, key);
    enable * (merkleRoot - root) === 0;

    // out <== Merkle(nBits)(linearHash, siblings, key);
}
