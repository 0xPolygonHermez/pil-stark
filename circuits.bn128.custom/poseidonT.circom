pragma circom 2.1.0;
pragma custom_templates;

include "./poseidon_constants_original.circom";

template custom PoseidonT(t) {
    var nRoundsF = 8;
    var N_ROUNDS_P[16] = [56, 57, 56, 60, 60, 63, 64, 63, 60, 66, 60, 65, 70, 60, 64, 68];
    var nRoundsP = N_ROUNDS_P[t-2];
    var totalRounds = nRoundsF + nRoundsP;
    
    signal input in[t];
    signal output im[totalRounds - 1][t];
    signal output out[t];

    var C[t*totalRounds] = POSEIDON_C_ORIGINAL(t);
    var M[t][t] = POSEIDON_M_ORIGINAL(t);


    var st[t] = in;
    for(var r = 0; r < totalRounds; r++) {
        for(var j = 0; j < t; j++) {
            st[j] = st[j] + C[t*r + j];

            st[j] = r < nRoundsF/2 || r >= nRoundsP + nRoundsF/2 || j == 0
                    ? st[j] ** 5
                    : st[j];  
            
        }

        var nst[t];
        for(var i = 0; i < t; i++) {
            for(var j = 0; j < t; j++) {
                nst[i] += M[i][j] * st[j];
            }
        }

        st = nst;
        if(r < totalRounds - 1) {
            im[r] <-- st;
        } else {
            out <-- st;
        }
    }
}

template CustomPoseidon(nInputs) {
    signal input in[nInputs];
    signal input initialState;
    signal output out[nInputs + 1];

    component p = PoseidonT(nInputs + 1);
    p.in[0] <== initialState;
    for (var i=0; i<nInputs; i++) {
        p.in[i + 1] <== in[i];
    }
    _ <== p.im;
    out <== p.out;
}

