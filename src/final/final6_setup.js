const { assert } = require("chai");
const fs = require("fs");
const path = require("path");
const { log2 } = require("pilcom/src/utils.js");
const {tmpName} = require("tmp-promise");
const { newConstantPolsArray, compile, getKs } = require("pilcom");
const ejs = require("ejs");
const r1cs2plonk = require("../r1cs2plonk");
const { C, M } = require("./poseidon_constants.js");
const { getCustomGatesInfo, calculatePlonkConstraints } = require("./final_helpers.js");

module.exports = async function plonkSetup(F, r1cs, options) {
    // Calculate the number plonk Additions and plonk constraints from the R1CS
    const [plonkConstraints, plonkAdditions] = r1cs2plonk(F, r1cs);
    
    // Get information about the custom gates from the R1CS
    const customGatesInfo = getCustomGatesInfo(r1cs);
    
    let rangeCheckRows = customGatesInfo.nRangeCheck;
    let nGLCMulAddRows = customGatesInfo.nGLCMulAdd * 2;

    const nPlonk = 2;

    // Calculate how many C12 constraints are needed 
    const CPlonkConstraints = calculatePlonkConstraints(plonkConstraints,nPlonk);

    // Calculate the total number of publics used in PIL and how many rows are needed to store all of them
    let nPublics = r1cs.nOutputs + r1cs.nPubInputs;
    const nPublicRows = Math.floor((nPublics - 1)/6) + 1; 

    const N_ROUNDS_P = [56, 57, 56, 60, 60, 63, 64, 63, 60, 66, 60, 65, 70, 60, 64, 68];

    const nRoundsF = 8;
    const nRoundsP = N_ROUNDS_P[customGatesInfo.nPoseidonInputs - 2]; 

    const nRoundsPoseidon = nRoundsF + nRoundsP;

    const poseidonRows = customGatesInfo.nPoseidonT*(nRoundsPoseidon + 1);

    console.log(`Number of Plonk constraints: ${plonkConstraints.length} -> Number of plonk per row: ${nPlonk} -> Constraints:  ${CPlonkConstraints}`);
    console.log(`Number of Plonk additions: ${plonkAdditions.length}`);
    console.log(`Number of publics: ${nPublics} -> Constraints: ${nPublicRows}`);
    console.log(`Number of PoseidonT with ${customGatesInfo.nPoseidonInputs}: ${customGatesInfo.nPoseidonT} -> Number of rows: ${poseidonRows}`);
    console.log(`Number of RangeChecks: ${customGatesInfo.nRangeCheck} -> Number of rows: ${rangeCheckRows}`);
    console.log(`Number of GLCMulAdd: ${customGatesInfo.nGLCMulAdd} -> Number of rows: ${nGLCMulAddRows}`);

    const NUsed = nPublicRows + CPlonkConstraints + poseidonRows + rangeCheckRows + nGLCMulAddRows;
    
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

    const template = await fs.promises.readFile(path.join(__dirname, "final6.pil.ejs"), "utf8");
    const obj = {
        N,
        NUsed,
        nBits,
        nPublics,
        M: M[customGatesInfo.nPoseidonInputs - 1],
        nInPoseidon: customGatesInfo.nPoseidonInputs,
    };

    const pilStr = ejs.render(template ,  obj);
    const pilFile = await tmpName();
    await fs.promises.writeFile(pilFile, pilStr, "utf8");
    const pil = await compile(F, pilFile);
    const constPols =  newConstantPolsArray(pil, F);

    fs.promises.unlink(pilFile);

    // Stores the positions of all the values that each of the committed polynomials takes in each row 
    // Remember that there are 6 committed polynomials and the number of rows is stored in NUsed
    const sMap = [];
    for (let i=0;i<6; i++) {
        sMap[i] = new Uint32Array(N);
    }

    // Paste public inputs. All constant polynomials are set to 0
    for (let i=0; i<nPublicRows; i++) {
        constPols.Final.GATE[i] = 0n;
        constPols.Final.POSEIDON_FULL_ROUND[i] = 0n;
        constPols.Final.POSEIDON_PARTIAL_ROUND[i] = 0n;
        constPols.Final.RANGE_CHECK[i] = 0n;
        constPols.Final.GLCMULADD[i] = 0n;
        for (let k=0; k<5; k++) {
            constPols.Final.C[k][i] = 0n;
        }
    }

    // Store the public inputs position in the mapping sMap
    for (let i=0; i<nPublicRows*6; i++) {
        // Since each row contains 6 public inputs, it is possible that
        // the last row is partially empty. Therefore, fulfill that last row
        // with 0.
        if(i < nPublics) {
            sMap[i%6][Math.floor(i/6)] = 1+i;
        } else {
            sMap[i%6][Math.floor(i/6)] = 0;
        }
    }

    let r = nPublicRows;
    
    // Generate Custom Gates
    
    for(let i = 0; i < r1cs.customGatesUses.length; i++) {
        if ((i%10000) == 0) console.log(`Point check -> Processing Poseidon custom gates... ${i}/${r1cs.customGatesUses.length}`);
        const cgu = r1cs.customGatesUses[i];
        if (cgu.id == customGatesInfo.PoseidonT) {
            assert(cgu.signals.length == (nRoundsPoseidon+1)*customGatesInfo.nPoseidonInputs);
            // First 30 rows store the each one of the rounds, while the last one only stores the output hash value so
            // that it can be checked.
            // All constant polynomials are set to 0 except for C, which contains the GL Poseidon constants, 
            // POSEIDON16, which is always 1, and POSEIDON_PARTIAL_ROUND, which is 1 in the first and last for rounds and zero otherwise
            for (let k=0; k<nRoundsPoseidon + 1; k++) {
                for (let j=0; j<5; j++) {
                    sMap[j][r+k] = cgu.signals[k*customGatesInfo.nPoseidonInputs+j];
                    constPols.Final.C[j][r+k] = k < nRoundsPoseidon ? BigInt(C[customGatesInfo.nPoseidonInputs - 1][k*customGatesInfo.nPoseidonInputs+j]) : 0n;
                }
            
                constPols.Final.GATE[r+k] = 0n;
                constPols.Final.POSEIDON_FULL_ROUND[r+k] = k < nRoundsPoseidon ? ((k<4)||(k>=nRoundsP + 4) ? 1n : 0n) : 0n;
                constPols.Final.POSEIDON_PARTIAL_ROUND[r+k] = k < nRoundsPoseidon ? ((k<4)||(k>=nRoundsP + 4) ? 0n : 1n) : 0n;
                constPols.Final.RANGE_CHECK[r+k] = 0n;
                constPols.Final.GLCMULADD[r+k] = 0n;
            }
            r+=nRoundsPoseidon + 1;
        } else if(typeof customGatesInfo.RangeCheckNBits[cgu.id] !== "undefined") {
            const nBytes = Math.ceil(Number(customGatesInfo.RangeCheckNBits[cgu.id][0]) / 16);
            assert(cgu.signals.length == 1 + nBytes);
            constPols.Final.GATE[r] = 0n;
            constPols.Final.POSEIDON_FULL_ROUND[r] = 0n;
            constPols.Final.POSEIDON_PARTIAL_ROUND[r] = 0n;
            constPols.Final.RANGE_CHECK[r] = 1n;
            constPols.Final.GLCMULADD[r] = 0n;
    
            for (let k=0; k<5; k++) {
                constPols.Final.C[k][r] = 0n;
            }

            sMap[0][r] = cgu.signals[0];
            for(let k = 1; k < 6; k++) {
                if(k - 1 > nBytes) break;
                sMap[k][r] = cgu.signals[k];
            }

            r += 1;
        } else if(cgu.id == customGatesInfo.GLCMulAdd) {
            assert(cgu.signals.length == 12);
            constPols.Final.GATE[r] = 0n;
            constPols.Final.GLCMULADD[r] = 1n;
            constPols.Final.POSEIDON_FULL_ROUND[r] = 0n;
            constPols.Final.POSEIDON_PARTIAL_ROUND[r] = 0n;
            constPols.Final.RANGE_CHECK[r] = 0n;
    
            constPols.Final.GATE[r+1] = 0n;
            constPols.Final.GLCMULADD[r+1] = 0n;
            constPols.Final.POSEIDON_FULL_ROUND[r+1] = 0n;
            constPols.Final.POSEIDON_PARTIAL_ROUND[r+1] = 0n;
            constPols.Final.RANGE_CHECK[r+1] = 0n;

            for (let k=0; k<5; k++) {
                constPols.Final.C[k][r] = 0n;
                constPols.Final.C[k][r+1] = 0n;
            }
            
            for(let k = 0; k < 6; k++) {
                sMap[k][r] = cgu.signals[k];
                sMap[k][r + 1] = cgu.signals[k + 6];
            }
            
            r += 2;
        } else {
            throw new Error("Custom gate not defined", cgu.id);
        }
    }

    assert(N >= 65536);
    for(let i=0; i<N; i++) {
        constPols.Final.RANGE[i] = BigInt(i%65536);
    }

    // Paste plonk constraints. 
    const partialRows = {}; // Stores a row that is partially completed, which means that a we only have one set of wires (a_i, b_i, c_i) that fulfill a given constraint
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
            pr.nUsed ++;
            // If nUsed is equal to 2, it means the first set of constraints values is being fulfilled and the second half needs still to be added.
            // Otherwise the C12 row is full
            if (pr.nUsed == nPlonk) {
                delete partialRows[k];
            } 
        // If the constraint is not stored in partialRows (which means that there is no other row that is using this very same set of constraints and is not full)
        // check if there's any half row. If that's the case, attach the new set of constraints values to that row 
        } else {
            constPols.Final.GATE[r] = 1n;
            constPols.Final.POSEIDON_PARTIAL_ROUND[r] = 0n;
            constPols.Final.POSEIDON_FULL_ROUND[r] = 0n;
            constPols.Final.RANGE_CHECK[r] = 0n;
            constPols.Final.GLCMULADD[r] = 0n;
            sMap[0][r] = c[0];
            sMap[1][r] = c[1];
            sMap[2][r] = c[2];

            sMap[3][r] = c[0];
            sMap[4][r] = c[1];
            sMap[5][r] = c[2];

            constPols.Final.C[0][r] = c[3];
            constPols.Final.C[1][r] = c[4];
            constPols.Final.C[2][r] = c[5];
            constPols.Final.C[3][r] = c[6];
            constPols.Final.C[4][r] = c[7];
            partialRows[k] = {
                row: r,
                nUsed: 1
            };
            r++;
        }
    }

    const ks = getKs(F, 5);
    let w = F.one;
    for (let i=0; i<N; i++) {
        if ((i%10000) == 0) console.log(`Point check -> Preparing S... ${i}/${N}`);
        constPols.Final.S[0][i] = w;
        for (let j=1; j<6; j++) {
            constPols.Final.S[j][i] = F.mul(w, ks[j-1]);
        }
        w = F.mul(w, F.w[nBits]);
    }

    const lastSignal = {}
    for (let i=0; i<r; i++) {
        if ((i%10000) == 0) console.log(`Point check -> Connection S... ${i}/${r}`);
        for (let j=0; j<6; j++) {
            if (sMap[j][i]) {
                if (typeof lastSignal[sMap[j][i]] !== "undefined") {
                    const ls = lastSignal[sMap[j][i]];
                    connect(constPols.Final.S[ls.col][ls.row], constPols.Final.S[j][i]);
                } else {
                    lastSignal[sMap[j][i]] = {
                        col: j,
                        row: i
                    };
                }
            }
        }
    }
    
    // Fill unused rows (NUsed < r < N) with empty gates
    while (r < N) {
        if ((r%100000) == 0) console.log(`Point check -> Empty gates... ${r}/${N}`);
        constPols.Final.GATE[r] = 0n;
        constPols.Final.POSEIDON_FULL_ROUND[r] = 0n;
        constPols.Final.POSEIDON_PARTIAL_ROUND[r] = 0n;
        constPols.Final.RANGE_CHECK[r] = 0n;
        constPols.Final.GLCMULADD[r] = 0n;
        for (let k=0; k<5; k++) {
            constPols.Final.C[k][r] = 0n;
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
        plonkAdditions: plonkAdditions,
    };

    function connect(p1, p2) {
        [p1, p2] = [p2, p1];
    }
}
