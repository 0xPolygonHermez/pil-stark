pragma circom 2.1.0;

include "../../../../circuits.bn128/merklehash.circom";

component main = VerifyMerkleHash(3, 9, 16384, 4);