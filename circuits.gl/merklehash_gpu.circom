pragma circom 2.1.0;
pragma custom_templates;

include "linearhash_gpu.circom";
include "merkle.circom";
include "utils.circom";

/*
    Given a leaf value and its sibling path, calculate the merkle tree root 
    - eSize: Size of the extended field (usually it will be either 3 if we are in Fp³ or 1)
    - elementsInLinear: Each leave of the merkle tree is made by this number of values. 
    - nLinears: Number of leaves of the merkle tree
*/
template MerkleHash(eSize, elementsInLinear, nLinears) {
    var nBits = log2(nLinears);
    assert(1 << nBits == nLinears);
    signal input values[elementsInLinear][eSize]; // Values that are contained in a leaf
    signal input siblings[nBits][4]; // Sibling path to calculate the merkle root given a set of values
    signal input key[nBits]; // Defines either each element of the sibling path is the left or right one
    signal output root[4]; // Root of the merkle tree

    // Each leaf in the merkle tree might be composed by multiple values. Therefore, the first step is to 
    // reduce all those values into a single one by hashing all of them
    signal linearHash[4] <== LinearHash(elementsInLinear, eSize)(values);

    // Calculate the merkle root 
    root <== Merkle(nBits)(linearHash, siblings ,key);
}


template parallel VerifyMerkleHash(eSize, elementsInLinear, nLinears) {
    var nBits = log2(nLinears);
    assert(1 << nBits == nLinears);
    signal input values[elementsInLinear][eSize]; // Values that are contained in a leaf
    signal input siblings[nBits][4]; // Sibling path to calculate the merkle root given a set of values
    signal input key[nBits]; // Defines either each element of the sibling path is the left or right one
    signal input root[4]; // Root of the merkle tree
    signal input enable; // Boolean that determines either we want to check that roots matches or not

    signal merkleRoot[4] <== MerkleHash(eSize, elementsInLinear, nLinears)(values, siblings, key);
   
    // If enable is set to 1, check that the merkleRoot being calculated matches with the one sent as input
    enable * (merkleRoot[0] - root[0]) === 0;
    enable * (merkleRoot[1] - root[1]) === 0;
    enable * (merkleRoot[2] - root[2]) === 0;
    enable * (merkleRoot[3] - root[3]) === 0;
}
