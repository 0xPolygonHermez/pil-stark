pragma circom 2.0.4;
pragma custom_templates;

include "poseidon.circom";

template Merkle(nLevels) {

    signal input value[4];
    signal input siblings[nLevels][4];
    signal input key[nLevels];
    signal output root[4];

    component hash[nLevels];

    for (var i=0; i<nLevels; i++) {
        hash[i] = Poseidon(4);
        for (var k=0; k<4; k++) {
            if (i>0) {
                hash[i].in[k  ] <== key[i]*(siblings[i][k]   - hash[i-1].out[k]) + hash[i-1].out[k];
                hash[i].in[k+4] <== key[i]*(hash[i-1].out[k] - siblings[i][k]  ) + siblings[i][k];
            } else {
                hash[i].in[k] <== key[i]*(siblings[i][k]   - value[k]        ) + value[k];
                hash[i].in[k+4] <== key[i]*(value[k]         - siblings[i][k]  ) + siblings[i][k];
            }
            hash[i].capacity[k] <== 0;
        }
    }

    for (var k=0; k<4; k++) {
        root[k] <== hash[nLevels-1].out[k];
    }

}

