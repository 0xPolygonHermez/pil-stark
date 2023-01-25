pragma circom 2.1.0;

// Given an array of values with length 2^n and an array of keys, it builds a tree and returns the top element.
// The tree is created as follows: at every round (from 0 to nLevels), if key[i] is 0 we push the even positions,
// while if key[i] is 1 we push the odd ones. The process is repeated until a single element remains.
// Let's take values = [1,2,3,4,5,6,7,8] and key = [1, 0, 1]. The algorithm would proceed as follows: [2, 4, 6, 8] -> [2, 6] -> [6]
template parallel TreeSelector(nLevels, eSize) {

    var n = 1 << nLevels;
    signal input values[n][eSize]; // Initial values
    signal input key[nLevels]; // Array that determines at each level if we keep even or odd positions
    signal output out[eSize];

    signal im[n-1][eSize];

    var levelN = n\2;
    var o = 0;
    var lo = 0;
    for (var i=0; i<nLevels; i++) {
        for (var j=0; j<levelN; j++) {
            for (var k=0; k<eSize; k++) {
                if (i==0) {
                    im[o+j][k] <== key[i]*(values[2*j+1][k]  - values[2*j][k])  + values[2*j][k];
                } else {
                    im[o+j][k] <== key[i]*(im[lo + 2*j+1][k] - im[lo + 2*j][k]) + im[lo + 2*j][k];
                }
            }
        }
        lo = o;
        o = o + levelN;
        levelN = levelN\2;
    }

    out <== im[n-2];
}

