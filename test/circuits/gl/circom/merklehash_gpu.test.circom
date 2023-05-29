pragma circom 2.1.0;
pragma custom_templates;

include "../../../../circuits.gl/merklehash_gpu.circom";

component main = VerifyMerkleHash(3, 9, 32);
