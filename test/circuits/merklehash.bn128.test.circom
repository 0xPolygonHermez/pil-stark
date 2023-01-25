pragma circom 2.0.6;

include "../../circuits.bn128/merklehash.circom";

component main = VerifyMerkleHash(3, 9, 32);