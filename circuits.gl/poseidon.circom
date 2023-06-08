pragma circom 2.1.0;
pragma custom_templates;

include "poseidon_constants.circom";

// Custom gate that calculates Poseidon hash of three inputs using Neptune optimization
template custom Poseidon12() {
    signal input in[12];
    signal output im[9][12];
    signal output out[12];

    var st[12];
    st = in;

    for(var i=0; i < 12; i++) {
        st[i] = st[i] + CNST(i);
    }

    var newSt[12];
    for(var r = 0; r < 4; r++) {
        for(var t=0; t < 12; t++) {
            st[t] = st[t] ** 7;
            st[t] = st[t] + CNST((r + 1)*12 + t);
        }

        for(var t=0; t < 12; t++) {
            var acc = 0;
            for(var j = 0; j < 12; j++) {
                if(r < 3) {
                    acc += M(j,t) * st[j];
                } else {
                    acc += P(j,t) * st[j];
                } 
            }
            newSt[t] = acc;
        }
        st = newSt;
        im[r] <-- st;
    }

    st[0] = st[0]**7;
    st[0] += CNST(60);

    for(var r = 0; r < 22; r++) {

        var s0 = 0;
        for(var j = 0; j < 12; j++) {
            s0 += S(23*r + j)*st[j];
        }

        for(var t = 1; t < 12; t++) {
            st[t] += st[0] * S(23 * r + 11 + t);
        }

        st[0] = s0;
        if(r == 10) im[4] <-- st;
        if(r < 21) {
            st[0] = st[0]**7;
            st[0] += CNST(60 + r + 1);
        }
    }

    im[5] <-- st;
    for(var r = 0; r < 4; r++) {
        for(var t=0; t < 12; t++) {
            st[t] = st[t] ** 7;
            if(r < 3) st[t] += CNST(82 + 12*r + t);
        }

        for(var t=0; t < 12; t++) {
            var acc = 0;
            for(var j = 0; j < 12; j++) {
                acc += M(j,t) * st[j];
            }
            newSt[t] = acc;
        }
        st = newSt;
        if(r < 3) {
            im[r + 6] <-- st;
        } else {
            out <-- st;
        }
    }
}

// Custom gate that calculates Poseidon hash of two inputs using Neptune optimization
// The two inputs are sent unordered and the key that determines its position is also sent as an input
template custom CustPoseidon12() {
    signal input in[8];
    signal input key;
    signal output im[9][12];
    signal output out[12];

    assert(key*(key - 1) == 0);

    var initialSt[12];
    
    // Order the inputs of the Poseidon hash according to the key bit.
    initialSt[0] = key*(in[0] - in[4]) + in[4];
    initialSt[1] = key*(in[1] - in[5]) + in[5];
    initialSt[2] = key*(in[2] - in[6]) + in[6];
    initialSt[3] = key*(in[3] - in[7]) + in[7];
    initialSt[4] = key*(in[4] - in[0]) + in[0];
    initialSt[5] = key*(in[5] - in[1]) + in[1];
    initialSt[6] = key*(in[6] - in[2]) + in[2];
    initialSt[7] = key*(in[7] - in[3]) + in[3];
    initialSt[8] = 0;
    initialSt[9] = 0;
    initialSt[10] = 0;
    initialSt[11] = 0;

    var st[12] = initialSt;

    for(var i=0; i < 12; i++) {
        st[i] = st[i] + CNST(i);
    }

    var newSt[12];
    for(var r = 0; r < 4; r++) {
        for(var t=0; t < 12; t++) {
            st[t] = st[t] ** 7;
            st[t] = st[t] + CNST((r + 1)*12 + t);
        }

        for(var t=0; t < 12; t++) {
            var acc = 0;
            for(var j = 0; j < 12; j++) {
                if(r < 3) {
                    acc += M(j,t) * st[j];
                } else {
                    acc += P(j,t) * st[j];
                } 
            }
            newSt[t] = acc;
        }
        st = newSt;
        im[r] <-- st;
    }

    st[0] = st[0]**7;
    st[0] += CNST(60);

    for(var r = 0; r < 22; r++) {
        var s0 = 0;
        for(var j = 0; j < 12; j++) {
            s0 += S(23*r + j)*st[j];
        }

        for(var t = 1; t < 12; t++) {
            st[t] += st[0] * S(23 * r + 11 + t);
        }

        st[0] = s0;
        if(r == 10) im[4] <-- st;
        if(r < 21) {
            st[0] = st[0]**7;
            st[0] += CNST(60 + r + 1);
        }
    }

    im[5] <-- st;
    for(var r = 0; r < 4; r++) {
        for(var t=0; t < 12; t++) {
            st[t] = st[t] ** 7;
            if(r < 3) st[t] += CNST(82 + 12*r + t);
        }

        for(var t=0; t < 12; t++) {
            var acc = 0;
            for(var j = 0; j < 12; j++) {
                acc += M(j,t) * st[j];
            }
            newSt[t] = acc;
        }
        st = newSt;
        if(r < 3) {
            im[r + 6] <-- st;
        } else {
            out <-- st;
        }
    }
}

// Calculate Poseidon Hash of 3 inputs (2 in + capacity) in GL field (each element has at most 63 bits)
// -nOuts: Number of GL field elements that are being returned as output
template Poseidon(nOuts) {
    signal input in[8];
    signal input capacity[4];
    signal output out[nOuts];

    component p = Poseidon12();

    // Pass the two inputs and the capacity as inputs for performing the poseidon Hash
    for (var j=0; j<8; j++) {
        p.in[j] <== in[j];
    }
    for (var j=0; j<4; j++) {
        p.in[8+j] <== capacity[j];
    }

    // Poseidon12 returns 12 outputs but we are only interested in returning nOuts
    for (var j=0; j<nOuts; j++) {
        out[j] <== p.out[j];
    }

    _ <== p.im;

    for (var j=nOuts; j<12; j++) {
        _ <== p.out[j];
    }
}

// Calculate Poseidon Hash of 2 inputs in GL field (each element has at most 63 bits)
// -nOuts: Number of GL field elements that are being returned as output
template CustPoseidon(nOuts) {
    signal input in[8];
    signal input key;
    signal output out[nOuts];

    component p = CustPoseidon12();

    // Pass the two inputs and the capacity as inputs for performing the poseidon Hash
    for (var j=0; j<8; j++) {
        p.in[j] <== in[j];
    }

    p.key <== key;
    
    // Poseidon12 returns 12 outputs but we are only interested in returning nOuts
    for (var j=0; j<nOuts; j++) {
        out[j] <== p.out[j];
    }

    _ <== p.im;
    
    for (var j=nOuts; j<12; j++) {
        _ <== p.out[j];
    }
}
