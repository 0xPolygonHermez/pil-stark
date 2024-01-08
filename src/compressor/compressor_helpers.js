const { assert } = require("chai");

module.exports ={
    
    /*
        Calculate the number of times that each set of gates (qL, qR, qM, qO, qC) is used
    */ 
    calculatePlonkConstraintsHalfs: function(plonkConstraints) {

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
       
        
        return constraints;
    },

    /*
        Calculate the number of rows needed to verify all plonk constraints
    */ 
    calculatePlonkConstraintsRowsC12: function(plonkConstraints, evalPolCMulRows, treeSelectorRows) {

        let partialRows = {};
        let halfRows = false;
        let r = 0;
        for (let i=0; i<plonkConstraints.length; i++) {
            if ((i%10000) == 0) {
                console.log(`Point Check -> Plonk info constraint processing... ${i}/${plonkConstraints.length}`);
            }
            //Each plonkConstraint has the following form: [a,b,c, qM, qL, qR, qO, qC]
            const c = plonkConstraints[i]; 
            const k= c.slice(3, 8).map( a=> a.toString(16)).join(","); //Calculate
            if(partialRows[k]) {
                ++partialRows[k];
                if(partialRows[k] === 2 || partialRows[k] === 4) delete partialRows[k];
            } else if(halfRows) {
                partialRows[k] = 3;
                halfRows = false;
            } else if(treeSelectorRows > 0) {
                --treeSelectorRows;
                partialRows[k] = 1;
            } else if(evalPolCMulRows > 0) {
                --evalPolCMulRows;
            } else {
                partialRows[k] = 1;
                halfRows = true;
                r++;
            }
        };

        return r;
    },

    /*
        Given the R1CS, return how many custom gates of each kind are used
    */ 
    getCustomGatesInfo: function(r1cs) {
        
        // Store the different types of custom gates that are being used and how many times each
        const res = {
            Poseidon12Id: 0,
            CustPoseidon12Id: 0,
            CMulAddId: 0,
            CMulId:0,
            FFT4Parameters: {},
            EvPol4Id: 0,
            TreeSelector4Id: 0,
            nCMulAdd: 0,
            nCMul:0,
            nPoseidon12: 0,
            nCustPoseidon12: 0,
            nFFT4: 0,
            nEvPol4: 0,
            nTreeSelector4: 0
        }
    
        // Each custom gate in the r1cs has the following structure: {templateName: "Poseidon12", parameters: []}
        // Notice that none of the custom gates will have parameters except for the FFT
        // Each FFT4 needs 4 parameters: scale, firstW, firstW2 and incW that have to be defined in order to use the custom template
        // Therefore, each FFT that uses a different set of parameters will be stored as a different custom gate in the r1cs and so
        // we will have 1 custom gate for CMulAdd, Poseidon12 and EvPol4 and many for FFT4
        for (let i=0; i<r1cs.customGates.length; i++) {
            switch (r1cs.customGates[i].templateName) {
                case "CMul":
                    res.CMulId =i;
                    assert(r1cs.customGates[i].parameters.length == 0);
                    break;
                case "Poseidon12":
                    res.Poseidon12Id =i;
                    assert(r1cs.customGates[i].parameters.length == 0);
                    break;
                case "CustPoseidon12":
                    res.CustPoseidon12Id =i;
                    assert(r1cs.customGates[i].parameters.length == 0);
                    break;
                case "EvPol4":
                    res.EvPol4Id =i;
                    assert(r1cs.customGates[i].parameters.length == 0);
                    break;
                case "TreeSelector4":
                    res.TreeSelector4Id =i;
                    assert(r1cs.customGates[i].parameters.length == 0);
                    break;
                case "FFT4":
                    res.FFT4Parameters[i] = r1cs.customGates[i].parameters; 
                    break;
                default:
                    throw new Error("Invalid custom gate: " + r1cs.customGates[i].templateName);
            }
        }
    
        // Store how many times each custom gates is used
        for (let i=0; i< r1cs.customGatesUses.length; i++) {
            if (r1cs.customGatesUses[i].id == res.CMulId) {
                res.nCMul ++;
            } else if (r1cs.customGatesUses[i].id == res.Poseidon12Id) {
                res.nPoseidon12 ++;
            } else if (r1cs.customGatesUses[i].id == res.CustPoseidon12Id) {
                res.nCustPoseidon12 ++;
            } else if (typeof res.FFT4Parameters[r1cs.customGatesUses[i].id] !== "undefined") {
                res.nFFT4 ++;
            } else if (r1cs.customGatesUses[i].id == res.EvPol4Id) {
                res.nEvPol4 ++;
            } else if (r1cs.customGatesUses[i].id == res.TreeSelector4Id) {
                res.nTreeSelector4 ++;
            } else {
                throw new Error("Custom gate not defined" + r1cs.customGatesUses[i].id);
            }
        }

        return res;
    }
}



