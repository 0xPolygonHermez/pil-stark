pragma circom 2.1.0;
pragma custom_templates;

include "poseidon.circom";

/*
    Given a number of inputs, merge them into a one single output (which is made by 4 GL elements)
*/
template BasicLinearHash(nInputs) {

    signal input in[nInputs];
    signal output out[4];


    var nHashes; //Stores the number of hashes needed to be performed to reduce the inputs

    // To reduce the inputs, we will be using Poseidon12. Therefore, at each round we can at most reduce three elements into 
    // a single one. However, since the final hash must be the linear hash of all the inputs, at each round we will hash two
    // new elements with the previous hash obtained.

    if (nInputs <= 4) {
        nHashes = 0; // No hash is needed
    } else {
        // Calculate how many hashes needs to be performed
        // From 5 to 8 inputs -> 1 hash
        // From 9 to 16 inputs -> 2 hash 
        // ...
        nHashes = (nInputs - 1)\8 +1; 
    }

    component hash[nHashes];

    // If there are less than 4 inputs, we add the inputs to the output and add 0 values to fulfill the 4 GL elements
    if (nInputs <= 4) {
        for (var i=0; i<4; i++) {
            if (i<nInputs) {
                out[i] <== in[i];
            } else {
                out[i] <== 0;
            }
        }
    } else {
        
        // Calculate the hashes
        for (var i=0; i<nHashes; i++) {
            hash[i] = Poseidon(4);
            for (var k=0; k<8; k++) {
                // Add the inputs for the Poseidon hash. If there are not enough inputs to fulfill the 8 slots, add zeros
                if (i*8+k<nInputs) {
                    hash[i].in[k] <== in[i*8+k];
                } else {
                    hash[i].in[k] <== 0;
                }
            }

            // Add the capacity for the Poseidon hash, which will be 0 if it is the first hash performed and the previous hash otherwise
            if(i>0) {
                hash[i].capacity <== hash[i-1].out;
            } else {
                hash[i].capacity <== [0,0,0,0];
            }
        }

        // Return the resulting hash
        out <== hash[nHashes-1].out; 
    }
}

/*
    Given an array of inputs, in which each input has size eSize (which usually will be 3 if working in the extended field, 1 otherwise),
    calculate the result of hashing all of them together
*/
template LinearHash(nInputs, eSize) {
    signal input in[nInputs][eSize];
    signal output out[4];

    // Calculate the total number of input values
    var totalIn = nInputs*eSize;

    // Calculate how many batches of 4 elements are needed to fit all the inputs
    // If one need less than 8 batches, force batchSize to be 8
    var batchSize = (totalIn + 3) \ 4;
    if (batchSize <8) batchSize=8;
    
    var nHashes = (totalIn + batchSize -1) \ batchSize;

    component hash[nHashes]; // Store the linear hash for all batches except for the last one

    var curInput=0; // Pointer to the i^th input
    var curC=0; // Pointer, for a given input, to the corresponding index of the eSize
    for (var i=0; i<nHashes; i++) {
        var size;
        if (i<nHashes-1) {
            size = batchSize;
        } else {
            size = totalIn - i*batchSize;
        }
        hash[i] = BasicLinearHash(size); 
        for (var k=0; k<size; k++) {
            hash[i].in[k] <== in[curInput][curC];
            curC++;
            if (curC == eSize) { //If, given an input, all eSize values have been read, update the pointer to the next input.
                curC =0;
                curInput += 1;
            }
        }
    }

    // Apply the BasicLinearHash to all the batch hashes to get a single hash value
    component hashFinal;

    if (nHashes == 0) { 
        // If nHashes = 0, it means that nInputs was equal to zero and so return an array of zeros
        for (var k=0; k<4; k++) {
            out[k] <== 0;
        }
    } else if (nHashes ==1) {
        // If only a single hash was performed there is no need to apply BasicLinearHash again and so return hash[0]
        for (var k=0; k<4; k++) {
            out[k] <== hash[0].out[k];
        }
    } else {
        // Otherwise, apply BasicLinear hash to all the nHashes
        hashFinal = BasicLinearHash(nHashes*4);
        for (var i=0; i<nHashes; i++) {
            for (var k=0; k<4; k++) {
                hashFinal.in[i*4+k] <== hash[i].out[k];
            }
        }
        for (var k=0; k<4; k++) {
            out[k] <== hashFinal.out[k];
        }
    }
}



