pragma circom 2.0.4;
pragma custom_templates;

include "../../circuits.gl/merklehash.circom";

component main = MerkleHash(3, 9, 32);