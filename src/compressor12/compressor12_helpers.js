const { assert } = require("chai");

module.exports ={
    
    /*
        Given the PLONK Constraints, which have the following form: qL*a + qR*b + qM*a*b + qO*c + qC = 0,
        calculate the number of constraints required in the C12 Plonk. 
        Our Plonkish arithmetic gate will have composed by 12 polynomials gates Q0, Q1, ... , Q12 (hence the name)
        Therefore, we can compress our plonk equations by merging two Plonk equations together
        (qL1*a + qR1*b + qM1*a*b + qO1*c + qC1) + (qL2*d + qR2*e + qM2*d*e + qO2*f + qC2) = 0;
        In addition of 12 polynomial gates, the PIL will have 12 committed polinomials. Since each regular plonk
        constrain only uses 3 wires (a, b and c), and two different sets of wires can share the same set of polynomial
        gates, we can further extend the compression by storing 4 different sets of (a_i, b_i, c_i) in every row of 
        the committed polynomial. In order for that to work, notice that (a1, b1, c1) and (a2,b2,c2) needs to fulfill 
        the first equation (qL1*a + qR1*b + qM1*a*b + qO1*c + qC1) while (a3, b3, c3) and (a4, b4, c4) need to fulfill the 
        second part 
    */
    calculateC12PlonkConstraints: function(plonkConstraints) {

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
        const result = Object.values(constraints).reduce((acc, curr) => acc + Math.floor((curr + 1) / 2), 0);
        
        // Finally, calculate how many packs of two are needed to fit the total number of sets calculated above
        const N = Math.floor((result + 1) / 2);

        return N;
    },

    /*
        Given the R1CS, return how many custom gates of each kind are used
    */ 
    getCustomGatesInfo: function(r1cs) {
        
        // Store the different types of custom gates that are being used and how many times each
        const res = {
            Poseidon12Id: 0,
            CMulAddId: 0,
            FFT4Parameters: {},
            EvPol4Id: 0,
            nCMulAdd: 0,
            nPoseidon12: 0,
            nFFT4: 0,
            nEvPol4: 0
        }
    
        // Each custom gate in the r1cs has the following structure: {templateName: "Poseidon12", parameters: []}
        // Notice that none of the custom gates will have parameters except for the FFT
        // Each FFT4 needs 4 parameters: scale, firstW, firstW2 and incW that have to be defined in order to use the custom template
        // Therefore, each FFT that uses a different set of parameters will be stored as a different custom gate in the r1cs and so
        // we will have 1 custom gate for CMulAdd, Poseidon12 and EvPol4 and many for FFT4
        for (let i=0; i<r1cs.customGates.length; i++) {
            switch (r1cs.customGates[i].templateName) {
                case "CMulAdd":
                    res.CMulAddId =i;
                    assert(r1cs.customGates[i].parameters.length == 0);
                    break;
                case "Poseidon12":
                    res.Poseidon12Id =i;
                    assert(r1cs.customGates[i].parameters.length == 0);
                    break;
                case "EvPol4":
                    res.EvPol4Id =i;
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
            if (r1cs.customGatesUses[i].id == res.CMulAddId) {
                res.nCMulAdd ++;
            } else if (r1cs.customGatesUses[i].id == res.Poseidon12Id) {
                res.nPoseidon12 ++;
            } else if (typeof res.FFT4Parameters[r1cs.customGatesUses[i].id] !== "undefined") {
                res.nFFT4 ++;
            } else if (r1cs.customGatesUses[i].id == res.EvPol4Id) {
                res.nEvPol4 ++;
            } else {
                throw new Error("Custom gate not defined" + r1cs.customGatesUses[i].id);
            }
        }

        return res;
    }
}



