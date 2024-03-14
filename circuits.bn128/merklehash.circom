pragma circom 2.1.0;

include "linearhash.circom";
include "merkle.circom";
include "utils.circom";

/*
    Given a set of leaf values, their sibling path and their key, calculate the merkle tree root 
    - eSize: Size of the extended field (usually it will be either 3 if we are in Fp³ or 1)
    - elementsInLinear: Each leave of the merkle tree is made by this number of values. 
    - nLinears: Number of leaves of the merkle tree
*/
template MerkleHash(eSize, elementsInLinear, nLinears, arity) {
    var nBits = log2(nLinears);
    var logArity = log2(arity);
    var nLevels = (nBits - 1)\logArity +1;
    signal input values[elementsInLinear][eSize];
    signal input siblings[nLevels][arity]; // Sibling path to calculate the merkle root given a set of values.
    signal input key[nBits]; // Defines either each element of the sibling path is the left or right one
    signal output root; // Root of the merkle tree

    // Each leaf in the merkle tree might be composed by multiple values. Therefore, the first step is to 
    // reduce all those values into a single one by hashing all of them
    signal linearHash <== LinearHash(elementsInLinear, eSize, arity)(values);

    // Calculate the merkle root 
    root <== Merkle(nBits, arity)(linearHash, siblings ,key);
}


/*
    Given a set of leaf values, their sibling path, their key, their merkle root and a boolean, check that the merkle tree root matches with the one sent as input
    - eSize: Size of the extended field (usually it will be either 3 if we are in Fp³ or 1)
    - elementsInLinear: Each leave of the merkle tree is made by this number of values. 
    - nLinears: Number of leaves of the merkle tree
*/
template parallel VerifyMerkleHash(eSize, elementsInLinear, nLinears, arity) {
    var nLeaves = log2(arity);
    var nBits = log2(nLinears);
    assert(1 << nBits == nLinears);
    var nLevels = (nBits - 1)\nLeaves +1;
    signal input values[elementsInLinear][eSize];
    signal input siblings[nLevels][arity]; // Sibling path to calculate the merkle root given a set of values.
    signal input key[nBits]; // Defines either each element of the sibling path is the left or right one
    signal input root; // Root of the merkle tree
    signal input enable; // Boolean that determines either we want to check that roots matches or not

    // Calculate the merkle root 
    signal merkleRoot <== MerkleHash(eSize, elementsInLinear, nLinears, arity)(values, siblings, key);

    // If enable is set to 1, check that the merkleRoot being calculated matches with the one sent as input
    enable * (merkleRoot - root) === 0;
}

