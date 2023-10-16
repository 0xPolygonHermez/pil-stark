pragma circom 2.1.0;
pragma custom_templates;

include "../../../../circuits.gl/merklehash.circom";

template VerifyMH(eSize, elementsInLinear, nLinears) {
    var nBits = log2(nLinears);
    assert(1 << nBits == nLinears);
    signal input values[elementsInLinear][eSize];
    signal input siblings[nBits][4];
    signal input key[nBits];
    signal input root[4];
    signal input enable;

    signal {binary} enabled <== enable;
    signal {binary} keyTags[nBits] <== key;

    VerifyMerkleHash(eSize, elementsInLinear, nLinears)(values, siblings, keyTags, root, enabled);

}
component main = VerifyMH(3, 9, 32);
