pragma circom 2.0.6;
pragma custom_templates;

include "../../circuits.gl/merklehash.circom";

component main = VerifyMerkleHash(3, 9, 32);