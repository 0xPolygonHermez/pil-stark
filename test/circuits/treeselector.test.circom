pragma circom 2.1.0;
pragma custom_templates;

include "<%- dirName %>/../../circuits.gl/treeselector.circom";

component main = TreeSelector(<%- nBits %>, 3);
