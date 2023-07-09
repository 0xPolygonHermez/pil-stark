const { assert } = require("chai");
const { log2 } = require("pilcom/src/utils");

module.exports ={

    calculatePlonkConstraints: function(plonkConstraints, n) {

        // Each constraint is defined by the following five polynomial gates [qM, qL, qR, qO, qC].
        // Store all the different combinations (and how many times each) appears in the plonkConstraints
        const constraints = {};
        for (let i=0; i<plonkConstraints.length; i++) {
            if ((i%10000) == 0) {
                console.log(`Point Check -> Plonk info constraint processing... ${i}/${plonkConstraints.length}`);
            }
            //Each plonkConstraint has the following form: [a,b,c, qM, qL, qR, qO, qC]
            const c = plonkConstraints[i]; 
            const k= c.slice(3, 8).map( a=> a.toString(16)).join(","); //Calculate
            constraints[k] ||=  0; //If k is not in uses, initialize it
            constraints[k]++; // Update the counter of the constraint
        };

        // For each different combination of constraints, calculate how many packs of two are needed to fit all of the constraints
        // So, if for example a set of polynomial gates values [qM, qL, qR, qO, qC] appears 21 times, those will fit in 11 groups of 2 elements 
        // Store the sumatory in this variable
        const N = Object.values(constraints).reduce((acc, curr) => acc + Math.floor((curr - 1) / n) + 1, 0);
    
        return N;
    },

    /*
        Given the R1CS, return how many custom gates of each kind are used
    */ 
    getCustomGatesInfo: function(r1cs) {
        
        // Store the different types of custom gates that are being used and how many times each
        const res = {
            PoseidonT: 0,
            RangeCheckNBits: {},
            nPoseidonT: 0,
            nRangeCheck:0,
            nPoseidonInputs: -1,
        }
    
        for (let i=0; i<r1cs.customGates.length; i++) {
            switch (r1cs.customGates[i].templateName) {
                case "PoseidonT":
                    assert(res.nPoseidonInputs === -1);
                    res.PoseidonT = i; 
                    res.nPoseidonInputs = r1cs.customGates[i].parameters;
                    break;
                case "Num2Bytes":
                    res.RangeCheckNBits[i] = r1cs.customGates[i].parameters; 
                    break;
                default:
                    throw new Error("Invalid custom gate: " + r1cs.customGates[i].templateName);
            }
        }
    
        // Store how many times each custom gates is used
        for (let i=0; i< r1cs.customGatesUses.length; i++) {
            if (r1cs.customGatesUses[i].id == res.PoseidonT) {
                ++res.nPoseidonT;
            } else if (typeof res.RangeCheckNBits[r1cs.customGatesUses[i].id] !== "undefined") {
                ++res.nRangeCheck; 
            } else {
                throw new Error("Custom gate not defined" + r1cs.customGatesUses[i].id);
            }
        }

        console.log(res);
        return res;
    }
}



