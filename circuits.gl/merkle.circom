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
        // Therefore, a 2 inputs Poseidon is being performed.
        // The key that determines which element is the left one and which one the right one is also
        // sent to the custom gate
        hash[i] = CustPoseidon(4);
        for (var k=0; k<4; k++) {
            hash[i].in[k] <== siblings[i][k];
            // If i == 0 we hash the sibling with the initial leave value. Otherwise with the last hash calculated
            // If key[i] == 1, the sibling value corresponds to the first input. Otherwise it corresponds to the second one. 
            if (i>0) {
                hash[i].in[k+4] <== hash[i-1].out[k];
            } else {
                hash[i].in[k+4] <== value[k];
            }
        }
        hash[i].key <== key[i];
    }

    root <== hash[nLevels-1].out;
}

