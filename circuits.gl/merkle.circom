pragma circom 2.1.0;
pragma custom_templates;

include "poseidon.circom";

/*
    Given a value and its sibling path (with its corresponding vector determining if the element is the left or right one), 
    calculate its merkle root.
*/
template Merkle(nLevels) {

    signal input value[4]; // Leaf value
    signal input siblings[nLevels][4]; // Sibling values
    signal input key[nLevels];
    signal output root[4];

    component hash[nLevels];

    for (var i=0; i<nLevels; i++) {
        // Hash the corresponding value with the corresponding sibling path value, which 
        // are 4 GL elements each, using Goldilocks Poseidon. Returns a 4 GL element output.
        // Therefore, a 2 inputs Poseidon (the third input, capacity is set to zero) is being performed
        hash[i] = Poseidon(4);
        for (var k=0; k<4; k++) {
            // If i == 0 we hash the sibling with the initial leave value. Otherwise with the last hash calculated
            // If key[i] == 1, the sibling value corresponds to the first input. Otherwise it corresponds to the second one. 
            if (i>0) {
                hash[i].in[k] <== key[i]*(siblings[i][k] - hash[i-1].out[k]) + hash[i-1].out[k];
                hash[i].in[k+4] <== key[i]*(hash[i-1].out[k] - siblings[i][k]) + siblings[i][k];
            } else {
                hash[i].in[k] <== key[i]*(siblings[i][k] - value[k]) + value[k];
                hash[i].in[k+4] <== key[i]*(value[k] - siblings[i][k]) + siblings[i][k];
            }
            hash[i].capacity[k] <== 0;
        }
    }

    root <== hash[nLevels-1].out;
}

