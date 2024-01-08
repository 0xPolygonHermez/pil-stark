pragma circom 2.1.0;
pragma custom_templates;

include "utils.circom";

template custom TreeSelector4() {
    signal input values[4][3];
    signal input keys[2];

    signal output out[3];

    var root[3];

    assert(keys[0]*(keys[0] - 1) == 0);
    assert(keys[1]*(keys[1] - 1) == 0);
    
    if(keys[0] == 0 && keys[1] == 0) {
        root = values[0];
    } else if(keys[0] == 1 && keys[1] == 0) {
        root = values[1];
    } else if(keys[0] == 0 && keys[1] == 1) {
        root = values[2];
    } else {
        root = values[3];
    }

    out <-- root;
}

// Given an array of values with length 2^n and an array of keys, it builds a tree and returns the top element.
// The tree is created as follows: at every round (from 0 to nLevels), if key[i] is 0 we push the even positions,
// while if key[i] is 1 we push the odd ones. The process is repeated until a single element remains.
// Let's take values = [1,2,3,4,5,6,7,8] and key = [1, 0, 1]. The algorithm would proceed as follows: [2, 4, 6, 8] -> [2, 6] -> [6]
template TreeSelector(nLevels, eSize) {

    var n = 1 << nLevels;
    signal input values[n][eSize]; // Initial values
    signal input key[nLevels]; // Array that determines at each level if we keep even or odd positions
    signal output out[eSize];

    //Stores all the tree values (except for the leaves)
    //Note that if a tree has n leaves, the tree will have 2*n - 1 elements and so we only need to store n - 1
    var total = 0;
    var lev = n;
    for(var i = 0; i < nLevels\2; i++) {
        lev = lev\4;
        total += lev;
    }
    
    component im[total];
    
    var levelN = n; //Length of the current level of the tree
    var o = 0; // Points to the beginning of the current tree level values
    var lo = 0; // Points to the beginning of the previous tree level values

    for (var i=0; i<nLevels\2; i++) {
        var nTrees = levelN\4;
        for(var j = 0; j < nTrees; j++) {
            im[o + j] = TreeSelector4();
            for(var l = 0; l < 4; l++) {
                if(i==0) {
                    im[o + j].values[l] <== values[4*j + l];
                } else {
                    im[o + j].values[l] <== im[lo + 4*j + l].out;
                }
            } 
            im[o + j].keys <== [key[2*i], key[2*i + 1]];
        }
        // Update the pointers
        lo = o;
        o = o + nTrees;
        levelN = levelN\4;
    }

    if(levelN == 1) {
        if(total == 0) {
            out <== values[0];
        } else {
            out <== im[lo].out;
        }
    } else {
        for(var k = 0; k < eSize; k++) {
            if(total == 0) {
                out[k] <== key[nLevels - 1]*(values[1][k] - values[0][k]) + values[0][k];
            } else {
                out[k] <== key[nLevels - 1]*(im[lo + 1].out[k] - im[lo].out[k]) + im[lo].out[k];
            }
        }
    }
}

