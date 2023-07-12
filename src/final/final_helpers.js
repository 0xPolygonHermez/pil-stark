const { assert } = require("chai");
const { log2 } = require("pilcom/src/utils");

module.exports ={

    calculatePlonkConstraints: function(plonkConstraints, nPlonk, extraRows = 0) {
        
        let partialRows = {};
        let r = 0;
        for (let i=0; i<plonkConstraints.length; i++) {
            if ((i%10000) == 0) {
                console.log(`Point Check -> Plonk info constraint processing... ${i}/${plonkConstraints.length}`);
            }
            //Each plonkConstraint has the following form: [a,b,c, qM, qL, qR, qO, qC]
            const c = plonkConstraints[i]; 
            const k= c.slice(3, 8).map( a=> a.toString(16)).join(","); //Calculate
            if(extraRows > 0) {
                --extraRows;
                continue;
            } else if(partialRows[k]) {
                ++partialRows[k];
                if(partialRows[k] === nPlonk) delete partialRows[k];
            } else {
                partialRows[k] = 1;
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
            PoseidonT: 0,
            RangeCheckNBits: {},
            GLCMulAdd: 0,
            nPoseidonT: 0,
            nGLCMulAdd: 0,
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
                case "CustomGLCMulAdd":
                    res.GLCMulAdd = i;
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
            } else if (r1cs.customGatesUses[i].id == res.GLCMulAdd) {
                ++res.nGLCMulAdd; 
            } else {
                throw new Error("Custom gate not defined" + r1cs.customGatesUses[i].id);
            }
        }

        console.log(res);
        return res;
    }
}



