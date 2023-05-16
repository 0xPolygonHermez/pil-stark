pragma circom 2.1.0;
pragma custom_templates;

include "../../../../circuits.bn128.custom/linearhash.circom";

component main = LinearHash(100, 3, 16);