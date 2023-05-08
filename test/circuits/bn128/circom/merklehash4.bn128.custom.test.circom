pragma circom 2.1.0;
pragma custom_templates;

include "../../../../circuits.bn128.custom/merklehash.circom";

component main = VerifyMerkleHash(3, 9, 14, 4);