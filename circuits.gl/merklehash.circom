pragma circom 2.1.0;
pragma custom_templates;

include "linearhash.circom";
include "merkle.circom";
include "utils.circom";

template parallel VerifyMerkleHash(eSize, elementsInLinear, nLinears) {
    var nBits = log2(nLinears);
    assert(1 << nBits == nLinears);
    signal input values[elementsInLinear][eSize];
    signal input siblings[nBits][4];
    signal input key[nBits];
    signal input root[4];
    signal input enable;
    //signal output root[4];

    var linearHash[4] = LinearHash(elementsInLinear, eSize)(values);

    var merkleRoot[4] = Merkle(nBits)(linearHash, siblings ,key);

    enable * (merkleRoot[0] - root[0]) === 0;
    enable * (merkleRoot[1] - root[1]) === 0;
    enable * (merkleRoot[2] - root[2]) === 0;
    enable * (merkleRoot[3] - root[3]) === 0;

    //root <== Merkle(nBits)(linearHash, siblings ,key);
}
