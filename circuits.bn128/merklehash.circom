pragma circom 2.1.0;

include "linearhash.circom";
include "merkle.circom";
include "utils.circom";

/*
    Given a leaf value and its sibling path, calculate the merkle tree root and check that it matches with the one provided
    - eSize: Size of the extended field (usually it will be either 3 if we are in Fp³ or 1)
    - elementsInLinear: Each leave of the merkle tree is made by this number of values. 
    - nLinears: Number of leaves of the merkle tree
*/
template parallel VerifyMerkleHash(eSize, elementsInLinear, nLinears) {
    var nBits = log2(nLinears); 
    assert(1 << nBits == nLinears);
    var nLevels = (nBits - 1)\4 +1;
    signal input values[elementsInLinear][eSize];
    signal input siblings[nLevels][16]; // Sibling path to calculate the merkle root given a set of values. Why 16 ???
    signal input key[nBits]; // Defines either each element of the sibling path is the left or right one
    signal input root; // Root of the merkle tree
    signal input enable; // Boolean that determines either we want to check that roots matches or not

    // Each leaf in the merkle tree might be composed by multiple values. Therefore, the first step is to 
    // reduce all those values into a single one by hashing all of them
    signal linearHash <== LinearHash(elementsInLinear, eSize)(values);
  
    // Calculate the merkle root 
    signal merkleRoot <== Merkle(nBits)(linearHash, siblings, key);

    // If enable is set to 1, check that the merkleRoot being calculated matches with the one sent as input
    enable * (merkleRoot - root) === 0;
}
