pragma circom 2.1.0;

// Given an array of values with length 2^n and an array of keys, it builds a tree and returns the top element.
// The tree is created as follows: at every round (from 0 to nLevels), if key[i] is 0 we push the even positions,
// while if key[i] is 1 we push the odd ones. The process is repeated until a single element remains.
// Let's take values = [1,2,3,4,5,6,7,8] and key = [1, 0, 1]. The algorithm would proceed as follows: [2, 4, 6, 8] -> [2, 6] -> [6]
template TreeSelector(nLevels, eSize) {

    var n = 1 << nLevels;
    signal input {maxNum} values[n][eSize]; // Initial values
    signal input key[nLevels]; // Array that determines at each level if we keep even or odd positions
    signal output {maxNum} out[eSize];

    //Stores all the tree values (except for the leaves)
    //Note that if a tree has n leaves, the tree will have 2*n - 1 elements and so we only need to store n - 1
    signal im[n-1][eSize];

    var levelN = n\2; //Length of the current level of the tree
    var o = 0; // Points to the beginning of the current tree level values
    var lo = 0; // Points to the beginning of the previous tree level values
    for (var i=0; i<nLevels; i++) {
        for (var j=0; j<levelN; j++) {
            for (var k=0; k<eSize; k++) {
                //If key[i] === 0, select the even positions, otherwise pick the even ones
                if (i==0) { //If i == 0, we get the values from the values array
                    im[o+j][k] <== key[i]*(values[2*j+1][k]  - values[2*j][k])  + values[2*j][k];
                } else {
                    im[o+j][k] <== key[i]*(im[lo + 2*j+1][k] - im[lo + 2*j][k]) + im[lo + 2*j][k];
                }
            }
        }
        // Update the pointers
        lo = o;
        o = o + levelN;
        levelN = levelN\2;
    }

    // Return the root
    out.maxNum = 0xFFFFFFFFFFFFFFFF;
    out <== im[n-2];
}

