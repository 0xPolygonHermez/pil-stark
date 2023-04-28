const { assert } = require("chai");
const fs = require("fs");
const path = require("path");
const F3G = require("../f3g.js");
const {log2} = require("../utils");
const {tmpName} = require("tmp-promise");
const { newConstantPolsArray, compile, getKs } = require("pilcom");
const ejs = require("ejs");
const r1cs2plonk = require("../r1cs2plonk");
const {M, P, S, C} = require("../poseidon_constants_opt.js");
const {CPOSEIDON} = require("./poseidon_constants.js");
const { getCustomGatesInfo, calculatePlonkConstraints } = require("./compressor_helpers.js");

module.exports = async function plonkSetup(r1cs, options) {
    const F = new F3G();
    // Calculate the number plonk Additions and plonk constraints from the R1CS
    const [plonkConstraints, plonkAdditions] = r1cs2plonk(F, r1cs);

    // Calculate how many C12 constraints are needed 
    const C12PlonkConstraintsHalfs = calculatePlonkConstraints(plonkConstraints);

    // Get information about the custom gates from the R1CS
    const customGatesInfo = getCustomGatesInfo(r1cs);

    // Calculate the total number of publics used in PIL and how many rows are needed to store all of them (remember that each row can store up to 12 values)
    let nPublics = r1cs.nOutputs + r1cs.nPubInputs;
    const nPublicRows = Math.floor((nPublics + 11)/12); 

    console.log(`Number of publics: ${nPublics} -> Constraints: ${nPublicRows}`);
    console.log(`Number of CMulAdd: ${customGatesInfo.nCMulAdd} -> Constraints: ${customGatesInfo.nCMulAdd}`);
    console.log(`Number of Poseidon12: ${customGatesInfo.nPoseidon12} -> Constraints: ${customGatesInfo.nPoseidon12*6}`);
    console.log(`Number of Poseidon12 custom: ${customGatesInfo.nCustPoseidon12} -> Constraints: ${customGatesInfo.nCustPoseidon12*6}`)
    console.log(`Total Number of Poseidon:  ${customGatesInfo.nPoseidon12 + customGatesInfo.nCustPoseidon12} -> Constraints ${(customGatesInfo.nPoseidon12 + customGatesInfo.nCustPoseidon12)*6}`);
    console.log(`Number of FFT4: ${customGatesInfo.nFFT4} -> Constraints: ${customGatesInfo.nFFT4*2}`);
    console.log(`Number of EvPol4: ${customGatesInfo.nEvPol4} -> Constraints: ${customGatesInfo.nEvPol4*2}`);
    console.log(`Number of TreeSelector4: ${customGatesInfo.nTreeSelector4} -> Constraints: ${customGatesInfo.nTreeSelector4*2}`);
    
    // Calculate the total number of rows that the C12 Plonkish will have. 
    // - Each public uses one single row
    // - NPlonk stores the number of rows needed to fulfill all the constraints 
    // - Each Poseidon12 custom gate uses 31 rows (30 rows one for each of the GL Poseidon hash round and the last one to check the Poseidon Hash)
    // - Each FFT4 custom gateuses 2 rows (1 for actually computing the FFT and the other one for checking the output)
    // - Each EvalPol4 custom gate uses 2 rows (1 for actually computing the evaluation and the other one for checking the output)
    const nRowsCustomGates = nPublicRows + customGatesInfo.nCMulAdd + customGatesInfo.nCustPoseidon12*6 + customGatesInfo.nPoseidon12*6 + customGatesInfo.nFFT4*2 + customGatesInfo.nEvPol4*2 + customGatesInfo.nTreeSelector4*2;
    
    const nRowsPlonk = nRowsCustomGates >= C12PlonkConstraintsHalfs ? 0 : Math.floor((C12PlonkConstraintsHalfs - nRowsCustomGates + 2) / 3);
    console.log(`Number of plonk constraints: ${plonkConstraints.length} -> Constraints rows: ${nRowsPlonk}`);

    
    const NUsed = nRowsCustomGates + nRowsPlonk;

    //Calculate the first power of 2 that's bigger than the number of constraints
    let nBits = log2(NUsed - 1) + 1;

    if (options.forceNBits) {
        if (options.forceNBits < nBits) {
            throw new Error("ForceNBits is less than required");
        }
        nBits = options.forceNBits;
    }
    const N = 1 << nBits; // First power of 2 whose value is higher than the number of constraints

    console.log(`NUsed: ${NUsed}`);
    console.log(`nBits: ${nBits}, 2^nBits: ${N}`);

    const template = await fs.promises.readFile(path.join(__dirname, "compressor18.pil.ejs"), "utf8");
    const obj = {
        N: N,
        NUsed: NUsed,
        nBits: nBits,
        nPublics: nPublics,
        M,
        SS: S,
        P,
        C,
    };

    const pilStr = ejs.render(template ,  obj);
    const pilFile = await tmpName();
    await fs.promises.writeFile(pilFile, pilStr, "utf8");
    const pil = await compile(F, pilFile);
    const constPols =  newConstantPolsArray(pil);

    fs.promises.unlink(pilFile);

    // Stores the positions of all the values that each of the committed polynomials takes in each row 
    // Remember that there are 18 committed polynomials and the number of rows is stored in NUsed
    const sMap = [];
    for (let i=0;i<18; i++) {
        sMap[i] = new Uint32Array(NUsed);
    }

    const extraRows = [];
    
    // Store the public inputs position in the mapping sMap
    // All constant polynomials are set to 0
    for (let i=0; i<nPublicRows; i++) {
        constPols.Compressor.EVPOL4[i] = 0n;
        constPols.Compressor.CMULADD[i] = 0n;
        constPols.Compressor.GATE[i] = 0n;
        constPols.Compressor.GATE2[i] = 0n;
        constPols.Compressor.POSEIDONM[i] = 0n;
        constPols.Compressor.POSEIDONP[i] = 0n;
        constPols.Compressor.POSEIDONFIRST[i] = 0n;
        constPols.Compressor.PARTIALROUND[i] = 0n;
        constPols.Compressor.POSEIDONAFTERPART[i] = 0n;
        constPols.Compressor.POSEIDONCUSTFIRST[i] = 0n;
        constPols.Compressor.FFT4[i] = 0n;
        constPols.Compressor.TREESELECTOR4[i] = 0n;
        for (let k=0; k<12; k++) {
            constPols.Compressor.C[k][i] = 0n;

            const nPub = 12*i + k;
            // Since each row contains 12 public inputs, it is possible that
            // the last row is partially empty. Therefore, fulfill that last row
            // with 0.
            if(nPub < nPublics) {
                sMap[nPub%12][Math.floor(nPub/12)] = 1+nPub;
            } else {
                sMap[nPub%12][Math.floor(nPub/12)] = 0;
            }
        }

        for (let k=12; k<18; k++) {
            constPols.Compressor.C[k][i] = 0n;
        }

        extraRows.push(i);
    }
    
    let r = nPublicRows;


    // Generate Custom Gates
    for (let i=0; i<r1cs.customGatesUses.length; i++) {
        if ((i%10000) == 0) console.log(`Point check -> Processing custom gates... ${i}/${r1cs.customGatesUses.length}`);
        const cgu = r1cs.customGatesUses[i];
        if (cgu.id == customGatesInfo.Poseidon12Id) {
            assert(cgu.signals.length == 10*12 + 29*12);
                
            let counterC = 12;
            let counterS = 0;

            for (let i = 0; i < 6; ++i) {
                if(i === 5) counterS += 29*12;
                for (let j = 0; j<12; j++) {
                    sMap[j][r+i] = cgu.signals[counterS++];
                    constPols.Compressor.C[j][r+i] = (i === 2 || i === 5) ? 0n : C[counterC++];
                }

                if(i === 0 || i === 1 || i === 3 || i === 4) {
                    counterS += 12;
                    counterC += 12;
                } else if (i === 2) {
                    counterC += 22;
                }

                constPols.Compressor.GATE[r+i] = 0n;
                constPols.Compressor.GATE2[r+i] = 0n;
                // If i === 2 || i === 3 we perform PARTIAL ROUND CHECKS
                constPols.Compressor.POSEIDONM[r+i] = i !== 1 && i !== 2 && i !== 5 ? 1n : 0n;
                // If i === 1 we perform POSEIDONP, if i === 2 we perform PARTIAL ROUND CHECKS and i === 5 is last round;
                constPols.Compressor.POSEIDONP[r+i] = i === 1 ? 1n : 0n;
                constPols.Compressor.POSEIDONCUSTFIRST[r+i] = 0n;
                constPols.Compressor.POSEIDONFIRST[r+i] = i === 0 ? 1n : 0n;
                constPols.Compressor.PARTIALROUND[r+i] = i === 2 ? 1n : 0n;
                constPols.Compressor.POSEIDONAFTERPART[r+i] = i === 3 ? 1n : 0n;
                constPols.Compressor.CMULADD[r+i] = 0n;
                constPols.Compressor.EVPOL4[r+i] = 0n;
                constPols.Compressor.TREESELECTOR4[r+i] = 0n;
                constPols.Compressor.FFT4[r+i] = 0n;

                for (let k=12; k<18; k++) {
                    constPols.Compressor.C[k][r+i] = 0n;
                }
                extraRows.push(r+i);
            }

            r+=6;
        } else if(cgu.id == customGatesInfo.CustPoseidon12Id) {
            assert(cgu.signals.length == 30*12 + 9 + 8*12);
            let counterC = 12;
            let counterS = 0;

            for (let i = 0; i < 6; ++i) {
                if(i === 5) counterS += 29*12;
                for (let j = 0; j<12; j++) {
                    sMap[j][r+i] = (i === 0 && (j === 9 || j === 10 || j === 11)) ? 0 : cgu.signals[counterS++];
                    constPols.Compressor.C[j][r+i] = (i === 2 || i === 5) ? 0n : C[counterC++];
                }

                if(i === 0 || i === 1 || i === 3 || i === 4) {
                    counterS += 12;
                    counterC += 12;
                } else if (i === 2) {
                    counterC += 22;
                }

                constPols.Compressor.GATE[r+i] = 0n;
                constPols.Compressor.GATE2[r+i] = 0n;
                // If i === 2 || i === 3 we perform PARTIAL ROUND CHECKS
                constPols.Compressor.POSEIDONM[r+i] = i !== 1 && i !== 2 && i !== 5 ? 1n : 0n;
                // If i === 1 we perform POSEIDONP, if i === 2 we perform PARTIAL ROUND CHECKS and i === 5 is last round;
                constPols.Compressor.POSEIDONP[r+i] = i === 1 ? 1n : 0n;
                constPols.Compressor.POSEIDONCUSTFIRST[r+i] = i === 0 ? 1n : 0n;
                constPols.Compressor.POSEIDONFIRST[r+i] = i === 0 ? 1n : 0n;
                constPols.Compressor.PARTIALROUND[r+i] = i === 2 ? 1n : 0n;
                constPols.Compressor.POSEIDONAFTERPART[r+i] = i === 3 ? 1n : 0n;
                constPols.Compressor.CMULADD[r+i] = 0n;
                constPols.Compressor.EVPOL4[r+i] = 0n;
                constPols.Compressor.TREESELECTOR4[r+i] = 0n;
                constPols.Compressor.FFT4[r+i] = 0n;

                for (let k=12; k<18; k++) {
                    constPols.Compressor.C[k][r+i] = 0n;
                }
                extraRows.push(r+i);
            }

            r+=6;
        } else if (cgu.id == customGatesInfo.CMulAddId) {
            for (let i=0; i<12; i++) {
                sMap[i][r] = cgu.signals[i];
            }
            constPols.Compressor.CMULADD[r] = 1n;
            constPols.Compressor.GATE[r] = 0n;
            constPols.Compressor.GATE2[r] = 0n;
            constPols.Compressor.POSEIDONM[r] = 0n;
            constPols.Compressor.POSEIDONP[r] = 0n;
            constPols.Compressor.POSEIDONFIRST[r] = 0n;
            constPols.Compressor.PARTIALROUND[r] = 0n;
            constPols.Compressor.POSEIDONAFTERPART[r] = 0n;
            constPols.Compressor.POSEIDONCUSTFIRST[r] = 0n;
            constPols.Compressor.EVPOL4[r] = 0n;
            constPols.Compressor.TREESELECTOR4[r] = 0n;
            constPols.Compressor.FFT4[r] = 0n;
            
            for (let k=0; k<12; k++) {
                constPols.Compressor.C[k][r] = 0n;
            }

            for (let k=12; k<18; k++) {
                constPols.Compressor.C[k][r] = 0n;
            }
            extraRows.push(r);
            r+= 1;
        } else if ( typeof customGatesInfo.FFT4Parameters[cgu.id] !== "undefined") {
            for (let i=0; i<12; i++) {
                sMap[i][r] = cgu.signals[i];
            }
            for (let i=0; i<12; i++) {
                sMap[i][r+1] = cgu.signals[12+i];
            }
            constPols.Compressor.CMULADD[r] = 0n;
            constPols.Compressor.GATE[r] = 0n;
            constPols.Compressor.GATE2[r] = 0n;
            constPols.Compressor.POSEIDONM[r] = 0n;
            constPols.Compressor.POSEIDONP[r] = 0n;
            constPols.Compressor.POSEIDONFIRST[r] = 0n;
            constPols.Compressor.PARTIALROUND[r] = 0n;
            constPols.Compressor.POSEIDONAFTERPART[r] = 0n;
            constPols.Compressor.POSEIDONCUSTFIRST[r] = 0n;
            constPols.Compressor.EVPOL4[r] = 0n;
            constPols.Compressor.TREESELECTOR4[r] = 0n;
            constPols.Compressor.FFT4[r] = 1n;

            constPols.Compressor.CMULADD[r+1] = 0n;
            constPols.Compressor.GATE[r+1] = 0n;
            constPols.Compressor.GATE2[r+1] = 0n;
            constPols.Compressor.POSEIDONM[r+1] = 0n;
            constPols.Compressor.POSEIDONP[r+1] = 0n;
            constPols.Compressor.POSEIDONFIRST[r+1] = 0n;
            constPols.Compressor.PARTIALROUND[r+1] = 0n;
            constPols.Compressor.POSEIDONAFTERPART[r+1] = 0n;
            constPols.Compressor.POSEIDONCUSTFIRST[r+1] = 0n;
            constPols.Compressor.EVPOL4[r+1] = 0n;
            constPols.Compressor.TREESELECTOR4[r+1] = 0n;
            constPols.Compressor.FFT4[r+1] = 0n;

            const type = customGatesInfo.FFT4Parameters[cgu.id][3];
            const scale = customGatesInfo.FFT4Parameters[cgu.id][2];
            const firstW = customGatesInfo.FFT4Parameters[cgu.id][0];
            const firstW2 = F.square(firstW);
            const incW = customGatesInfo.FFT4Parameters[cgu.id][1];
            if (type == 4n) {
                constPols.Compressor.C[0][r] = scale;
                constPols.Compressor.C[1][r] = F.mul(scale, firstW2);
                constPols.Compressor.C[2][r] = F.mul(scale, firstW);
                constPols.Compressor.C[3][r] = F.mul(scale, F.mul(firstW, firstW2));
                constPols.Compressor.C[4][r] = F.mul(scale, F.mul(firstW, incW));
                constPols.Compressor.C[5][r] = F.mul(F.mul(scale,firstW), F.mul(firstW2, incW));
                constPols.Compressor.C[6][r] = 0n;
                constPols.Compressor.C[7][r] = 0n;
                constPols.Compressor.C[8][r] = 0n;
            } else if (type == 2n) {
                constPols.Compressor.C[0][r] = 0n;
                constPols.Compressor.C[1][r] = 0n;
                constPols.Compressor.C[2][r] = 0n;
                constPols.Compressor.C[3][r] = 0n;
                constPols.Compressor.C[4][r] = 0n;
                constPols.Compressor.C[5][r] = 0n;
                constPols.Compressor.C[6][r] = scale;
                constPols.Compressor.C[7][r] = F.mul(scale, firstW);
                constPols.Compressor.C[8][r] = F.mul(scale, F.mul(firstW, incW));
            } else {
                throw new Error("Invalid FFT4 type: "+cgu.parameters[0]);
            }

            constPols.Compressor.C[9][r] = 0n;
            constPols.Compressor.C[10][r] = 0n;
            constPols.Compressor.C[11][r] = 0n;
            for (let k=0; k<12; k++) {
                constPols.Compressor.C[k][r+1] = 0n;
            }
            for (let k=12; k<18; k++) {
                constPols.Compressor.C[k][r] = 0n;
                constPols.Compressor.C[k][r+1] = 0n;
            }
            extraRows.push(r);
            extraRows.push(r+1);
            r+= 2;
        } else if (cgu.id == customGatesInfo.EvPol4Id) {
            for (let i=0; i<12; i++) {
                sMap[i][r] = cgu.signals[i];
                constPols.Compressor.C[i][r] = 0n;
            }
            for (let i=0; i<9; i++) {
                sMap[i][r+1] = cgu.signals[12+i];
                constPols.Compressor.C[i][r+1] = 0n;
            }
            for (let i=9; i<12; i++) {
                sMap[i][r+1] = 0;
                constPols.Compressor.C[i][r+1] = 0n;
            }
            constPols.Compressor.EVPOL4[r] = 1n;
            constPols.Compressor.TREESELECTOR4[r] = 0n;
            constPols.Compressor.CMULADD[r] = 0n;
            constPols.Compressor.GATE[r] = 0n;
            constPols.Compressor.GATE2[r] = 0n;
            constPols.Compressor.POSEIDONM[r] = 0n;
            constPols.Compressor.POSEIDONP[r] = 0n;
            constPols.Compressor.POSEIDONFIRST[r] = 0n;
            constPols.Compressor.PARTIALROUND[r] = 0n;
            constPols.Compressor.POSEIDONAFTERPART[r] = 0n;
            constPols.Compressor.POSEIDONCUSTFIRST[r] = 0n;
            constPols.Compressor.FFT4[r] = 0n;

            constPols.Compressor.EVPOL4[r+1] = 0n;
            constPols.Compressor.TREESELECTOR4[r+1] = 0n;
            constPols.Compressor.CMULADD[r+1] = 0n;
            constPols.Compressor.GATE[r+1] = 0n;
            constPols.Compressor.GATE2[r+1] = 0n;
            constPols.Compressor.POSEIDONM[r+1] = 0n;
            constPols.Compressor.POSEIDONP[r+1] = 0n;
            constPols.Compressor.POSEIDONFIRST[r+1] = 0n;
            constPols.Compressor.PARTIALROUND[r+1] = 0n;
            constPols.Compressor.POSEIDONAFTERPART[r+1] = 0n;
            constPols.Compressor.POSEIDONCUSTFIRST[r+1] = 0n;
            constPols.Compressor.FFT4[r+1] = 0n;

            for (let k=12; k<18; k++) {
                constPols.Compressor.C[k][r] = 0n;
                constPols.Compressor.C[k][r+1] = 0n;
            }
            extraRows.push(r);
            extraRows.push(r+1);
            r+= 2;
        } else if(cgu.id == customGatesInfo.TreeSelector4Id) {
            assert(cgu.signals.length === 17);
            for (let i=0; i<12; i++) {
                sMap[i][r] = cgu.signals[i];
            }

            for (let i=0; i<12; i++) {
                sMap[i][r + 1] = i < 5 ? cgu.signals[i + 12] : 0;
            }

            constPols.Compressor.EVPOL4[r] = 0n;
            constPols.Compressor.TREESELECTOR4[r] = 1n;
            constPols.Compressor.CMULADD[r] = 0n;
            constPols.Compressor.GATE[r] = 0n;
            constPols.Compressor.GATE2[r] = 0n;
            constPols.Compressor.POSEIDONM[r] = 0n;
            constPols.Compressor.POSEIDONP[r] = 0n;
            constPols.Compressor.POSEIDONFIRST[r] = 0n;
            constPols.Compressor.PARTIALROUND[r] = 0n;
            constPols.Compressor.POSEIDONAFTERPART[r] = 0n;
            constPols.Compressor.POSEIDONCUSTFIRST[r] = 0n;
            constPols.Compressor.FFT4[r] = 0n;

            constPols.Compressor.EVPOL4[r+1] = 0n;
            constPols.Compressor.TREESELECTOR4[r+1] = 0n;
            constPols.Compressor.CMULADD[r+1] = 0n;
            constPols.Compressor.GATE[r+1] = 0n;
            constPols.Compressor.GATE2[r+1] = 0n;
            constPols.Compressor.POSEIDONM[r+1] = 0n;
            constPols.Compressor.POSEIDONP[r+1] = 0n;
            constPols.Compressor.POSEIDONFIRST[r+1] = 0n;
            constPols.Compressor.PARTIALROUND[r+1] = 0n;
            constPols.Compressor.POSEIDONAFTERPART[r+1] = 0n;
            constPols.Compressor.POSEIDONCUSTFIRST[r+1] = 0n;
            constPols.Compressor.FFT4[r+1] = 0n;

            for (let i=0; i<12; i++) {
                constPols.Compressor.C[i][r] = 0n;
                constPols.Compressor.C[i][r+1] = 0n;
            }

            for (let k=12; k<18; k++) {
                constPols.Compressor.C[k][r] = 0n;
                constPols.Compressor.C[k][r+1] = 0n;
            }
            extraRows.push(r);
            extraRows.push(r+1);
            r += 2;
        } else {
            throw new Error("Custom gate not defined", cgu.id);
        }
    }

    // Paste plonk constraints. 
    // Remember that each C12 row will contain two sets of constraints, each of them should be fulfilled by two different set of wires.
    const partialRows = {}; // Stores a row that is partially completed, which means that a we only have one set of wires (a_i, b_i, c_i) that fulfill a given constraint
    const halfRows = []; // Stores a row that already contains a constraint (qL, qR, qM, qO, qC) with two sets of wires that fulfill it
    for (let i=0; i<plonkConstraints.length; i++) {
        if ((i%10000) == 0) console.log(`Point check -> Processing constraint... ${i}/${plonkConstraints.length}`);
        const c = plonkConstraints[i];
        const k= c.slice(3, 8).map( a=> a.toString(16)).join(",");
        // Once a new constraint is read, check if there's some partial row with that constraint. If that's the case, add the wire (which is stored in [c0, c1, c2]) to 
        // the corresponding row
        if (partialRows[k]) {
            const pr = partialRows[k];
            sMap[pr.nUsed*3][pr.row] = c[0];
            sMap[pr.nUsed*3+1][pr.row] = c[1];
            sMap[pr.nUsed*3+2][pr.row] = c[2];
            pr.nUsed++;
            // If nUsed is equal to 2, it means the first set of constraints values is being fulfilled and the second half needs still to be added.
            // Otherwise the C12 row is full
            if (pr.nUsed == 2 || pr.nUsed == 4) {
                halfRows.push(pr);   
            }

            delete partialRows[k];
        // If the constraint is not stored in partialRows (which means that there is no other row that is using this very same set of constraints and is not full)
        // check if there's any half row. If that's the case, attach the new set of constraints values to that row 
        } else if (halfRows.length > 0) {
            const pr = halfRows.shift();
            if(pr.nUsed === 2) {
                constPols.Compressor.C[6][pr.row] = c[3];
                constPols.Compressor.C[7][pr.row] = c[4];
                constPols.Compressor.C[8][pr.row] = c[5];
                constPols.Compressor.C[9][pr.row] = c[6];
                constPols.Compressor.C[10][pr.row] = c[7];
                constPols.Compressor.C[11][pr.row] = 0n;

                sMap[6][pr.row] = c[0];
                sMap[7][pr.row] = c[1];
                sMap[8][pr.row] = c[2];

                pr.nUsed++;
                partialRows[k] = pr;
            } else if(pr.nUsed === 4) {
                constPols.Compressor.GATE2[pr.row] = 0n;
                constPols.Compressor.C[12][pr.row] = c[3];
                constPols.Compressor.C[13][pr.row] = c[4];
                constPols.Compressor.C[14][pr.row] = c[5];
                constPols.Compressor.C[15][pr.row] = c[6];
                constPols.Compressor.C[16][pr.row] = c[7];
                constPols.Compressor.C[17][pr.row] = 0n;

                sMap[12][pr.row] = c[0];
                sMap[13][pr.row] = c[1];
                sMap[14][pr.row] = c[2];

                pr.nUsed ++;
                partialRows[k] = pr;
            } else {
                assert(false);
            }
           
        // If the constraint is not stored in partialRows and all previous rows are full, start a new one
        } else if(extraRows.length > 0) {
            const row = extraRows.shift();
            constPols.Compressor.GATE2[row] = 1n;
            
            constPols.Compressor.C[12][row] = c[3];
            constPols.Compressor.C[13][row] = c[4];
            constPols.Compressor.C[14][row] = c[5];
            constPols.Compressor.C[15][row] = c[6];
            constPols.Compressor.C[16][row] = c[7];
            constPols.Compressor.C[17][row] = 0n;
            
            sMap[12][row] = c[0];
            sMap[13][row] = c[1];
            sMap[14][row] = c[2];
            
            partialRows[k] = {
                row: row,
                nUsed: 5
            };
        } else {
            constPols.Compressor.C[0][r] = c[3];
            constPols.Compressor.C[1][r] = c[4];
            constPols.Compressor.C[2][r] = c[5];
            constPols.Compressor.C[3][r] = c[6];
            constPols.Compressor.C[4][r] = c[7];
            constPols.Compressor.C[5][r] = 0n;
            constPols.Compressor.GATE[r] = 1n;
            constPols.Compressor.GATE2[r] = 0n;
            constPols.Compressor.EVPOL4[r] = 0n;
            constPols.Compressor.CMULADD[r] = 0n;
            constPols.Compressor.POSEIDONM[r] = 0n;
            constPols.Compressor.POSEIDONP[r] = 0n;
            constPols.Compressor.POSEIDONFIRST[r] = 0n;
            constPols.Compressor.PARTIALROUND[r] = 0n;
            constPols.Compressor.POSEIDONAFTERPART[r] = 0n;
            constPols.Compressor.POSEIDONCUSTFIRST[r] = 0n;
            constPols.Compressor.FFT4[r] = 0n;
            constPols.Compressor.TREESELECTOR4[r] = 0n;
            sMap[0][r] = c[0];
            sMap[1][r] = c[1];
            sMap[2][r] = c[2];

            partialRows[k] = {
                row: r,
                nUsed: 1
            };
            r ++;
        }
    }

    // Terminate the empty rows 
    // Notice that rows are fulfilled by copying the same constraint.
    // This is because all the Plonk equations need to hold, and if for
    // example we initialized the values to zero and Qc was different than zero
    // it would not work
    const openRows = Object.keys(partialRows);
    for (let i=0; i<openRows.length; i++) {
        const pr = partialRows[openRows[i]];
        if (pr.nUsed == 1) {
            sMap[3][pr.row] = sMap[0][pr.row];
            sMap[4][pr.row] = sMap[1][pr.row];
            sMap[5][pr.row] = sMap[2][pr.row];
            pr.nUsed ++;
            halfRows.push(pr);
        } else if (pr.nUsed == 3) {
            sMap[9][pr.row] = sMap[6][pr.row];
            sMap[10][pr.row] = sMap[7][pr.row];
            sMap[11][pr.row] = sMap[8][pr.row];
            pr.nUsed ++;
            halfRows.push(pr);
        } else if (pr.nUsed ==5) {
            sMap[15][pr.row] = sMap[12][pr.row];
            sMap[16][pr.row] = sMap[13][pr.row];
            sMap[17][pr.row] = sMap[14][pr.row];
            pr.nUsed ++;
            halfRows.push(pr);
        } else {
            assert(false);
        }
    }

    for (let i=0; i<halfRows.length; i++) {
        const pr = halfRows[i];
        if(pr.nUsed === 2) {
            sMap[6][pr.row] = 0;
            sMap[7][pr.row] = 0;
            sMap[8][pr.row] = 0;
            sMap[9][pr.row] = 0;
            sMap[10][pr.row] = 0;
            sMap[11][pr.row] = 0;
            constPols.Compressor.C[6][pr.row] = 0n;
            constPols.Compressor.C[7][pr.row] = 0n;
            constPols.Compressor.C[8][pr.row] = 0n;
            constPols.Compressor.C[9][pr.row] = 0n;
            constPols.Compressor.C[10][pr.row] = 0n;
            constPols.Compressor.C[11][pr.row] = 0n;
        } 

        if(pr.nUsed === 2 || pr.nUsed === 4) {
            sMap[12][pr.row] = 0;
            sMap[13][pr.row] = 0;
            sMap[14][pr.row] = 0;
            sMap[15][pr.row] = 0;
            sMap[16][pr.row] = 0;
            sMap[17][pr.row] = 0;
            constPols.Compressor.C[12][pr.row] = 0n;
            constPols.Compressor.C[13][pr.row] = 0n;
            constPols.Compressor.C[14][pr.row] = 0n;
            constPols.Compressor.C[15][pr.row] = 0n;
            constPols.Compressor.C[16][pr.row] = 0n;
            constPols.Compressor.C[17][pr.row] = 0n;
        }
    }

    // Calculate S Polynomials
    const ks = getKs(F, 17);
    let w = F.one;
    for (let i=0; i<N; i++) {
        if ((i%10000) == 0) console.log(`Point check -> Preparing S... ${i}/${N}`);
        constPols.Compressor.S[0][i] = w;
        for (let j=1; j<18; j++) {
            constPols.Compressor.S[j][i] = F.mul(w, ks[j-1]);
        }
        w = F.mul(w, F.w[nBits]);
    }

    let connections = 0;
    const lastSignal = {}
    for (let i=0; i<r; i++) {
        if ((i%10000) == 0) console.log(`Point check -> Connection S... ${i}/${r}`);
        for (let j=0; j<18; j++) {
            if (sMap[j][i]) {
                if (typeof lastSignal[sMap[j][i]] !== "undefined") {
                    const ls = lastSignal[sMap[j][i]];
                    connections++;
                    connect(constPols.Compressor.S[ls.col][ls.row], constPols.Compressor.S[j][i]);
                } else {
                    lastSignal[sMap[j][i]] = {
                        col: j,
                        row: i
                    };
                }
            }
        }
    }

    console.log(`Number of connections: ${connections}`);
    
    // Fill unused rows (NUsed < r < N) with empty gates
    while (r<N) {
        if ((r%100000) == 0) console.log(`Point check -> Empty gates... ${r}/${N}`);
        constPols.Compressor.TREESELECTOR4[r] = 0n;
        constPols.Compressor.EVPOL4[r] = 0n;
        constPols.Compressor.CMULADD[r] = 0n;
        constPols.Compressor.GATE[r] = 0n;
        constPols.Compressor.GATE2[r] = 0n;
        constPols.Compressor.POSEIDONM[r] = 0n;
        constPols.Compressor.POSEIDONP[r] = 0n;
        constPols.Compressor.POSEIDONFIRST[r] = 0n;
        constPols.Compressor.PARTIALROUND[r] = 0n;
        constPols.Compressor.POSEIDONAFTERPART[r] = 0n;
        constPols.Compressor.POSEIDONCUSTFIRST[r] = 0n;
        constPols.Compressor.FFT4[r] = 0n;
        for (let k=0; k<18; k++) {
            constPols.Compressor.C[k][r] = 0n;
        }
        r +=1;
    }

    // Calculate the Lagrangian Polynomials for the public rows
    // Its value is 1 on the i^th row and 0 otherwise
    for (let i=0; i<nPublicRows; i++) {
        const L = constPols.Global["L" + (i+1)];
        for (let i=0; i<N; i++) {
            L[i] = 0n;
        }
        L[i] = 1n;
    }

    return {
        pilStr: pilStr,
        constPols: constPols,
        sMap: sMap,
        plonkAdditions: plonkAdditions
    };

    function connect(p1, p2) {
        [p1, p2] = [p2, p1];
    }
}
