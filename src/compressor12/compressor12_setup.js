const { assert } = require("chai");
const fs = require("fs");
const path = require("path");
const F3G = require("../f3g.js");
const {log2} = require("../utils");
const {tmpName} = require("tmp-promise");
const { newConstantPolsArray, compile, getKs } = require("pilcom");
const ejs = require("ejs");
const r1cs2plonk = require("../r1cs2plonk");
const { CPOSEIDON } = require("./poseidon_constants.js");
const { getCustomGatesInfo, calculateC12PlonkConstraints } = require("./compressor12_helpers.js");

module.exports = async function plonkSetup(r1cs, options) {
    const F = new F3G();
    // Calculate the number plonk Additions and plonk constraints from the R1CS
    const [plonkConstraints, plonkAdditions] = r1cs2plonk(F, r1cs);

    // Calculate how many C12 constraints are needed 
    const NPlonk = calculateC12PlonkConstraints(plonkConstraints);

    console.log(`nConstraints: ${r1cs.nConstraints}`);
    console.log(`PLONK nConstraints: ${plonkConstraints.length}`);
    console.log(`PLONK Additions: ${plonkAdditions.length}`);

    // Get information about the custom gates from the R1CS
    const customGatesInfo = getCustomGatesInfo(r1cs);

    // Calculate the total number of publics used in PIL and how many rows are needed to store all of them (remember that each row can store up to 12 values)
    let nPublics = r1cs.nOutputs + r1cs.nPubInputs;
    const nPublicRows = Math.floor((nPublics + 11)/12); 

    console.log(`Number of CMulAdd: ${customGatesInfo.nCMulAdd}`);
    console.log(`Number of Poseidon12: ${customGatesInfo.nPoseidon12}`);
    console.log(`Number of FFT4: ${customGatesInfo.nFFT4}`);
    console.log(`Number of nEvPol4: ${customGatesInfo.nFFT4}`);

    // Calculate the total number of rows that the C12 Plonkish will have. 
    // - Each public uses one single row
    // - NPlonk stores the number of rows needed to fulfill all the constraints 
    // - Each Poseidon12 custom gate uses 31 rows (30 rows one for each of the GL Poseidon hash round and the last one to check the Poseidon Hash)
    // - Each FFT4 custom gateuses 2 rows (1 for actually computing the FFT and the other one for checking the output)
    // - Each EvalPol4 custom gate uses 2 rows (1 for actually computing the evaluation and the other one for checking the output)
    const NUsed = nPublicRows + NPlonk + customGatesInfo.nCMulAdd + customGatesInfo.nPoseidon12*31 + customGatesInfo.nFFT4*2 + customGatesInfo.nEvPol4*2;
    
    //Calculate the first power of 2 that's bigger than the number of constraints
    let nBits = log2(NUsed - 1) + 1;

    if (options.forceNBits) {
        if (options.forceNBits < nBits) {
            throw new Error("ForceNBits is less than required");
        }
        nBits = options.forceNBits;
    }
    const N = 1 << nBits; // First power of 2 whose value is higher than the number of constraitn

    const template = await fs.promises.readFile(path.join(__dirname, "compressor12.pil.ejs"), "utf8");
    const obj = {
        N: N,
        NUsed: NUsed,
        nBits: nBits,
        nPublics: nPublics
    };

    const pilStr = ejs.render(template ,  obj);
    const pilFile = await tmpName();
    await fs.promises.writeFile(pilFile, pilStr, "utf8");
    const pil = await compile(F, pilFile);
    const constPols =  newConstantPolsArray(pil);

    fs.promises.unlink(pilFile);

    // Stores the positions of all the values that each of the committed polynomials takes in each row 
    // Remember that there are 12 committed polynomials and the number of rows is stored in NUsed
    const sMap = [];
    for (let i=0;i<12; i++) {
        sMap[i] = new Uint32Array(NUsed);
    }

    // Paste public inputs. All constant polynomials are set to 0
    for (let i=0; i<nPublicRows; i++) {
        constPols.Compressor.EVPOL4[i] = 0n;
        constPols.Compressor.CMULADD[i] = 0n;
        constPols.Compressor.GATE[i] = 0n;
        constPols.Compressor.POSEIDON12[i] = 0n;
        constPols.Compressor.PARTIAL[i] = 0n;
        constPols.Compressor.FFT4[i] = 0n;
        for (let k=0; k<12; k++) {
            constPols.Compressor.C[k][i] = 0n;
        }
    }

    // Store the public inputs position in the mapping sMap
    for (let i=0; i<nPublicRows*12; i++) {
        // Since each row contains 12 public inputs, it is possible that
        // the last row is partially empty. Therefore, fulfill that last row
        // with 0.
        if(i < nPublics) {
            sMap[i%12][Math.floor(i/12)] = 1+i;
        } else {
            sMap[i%12][Math.floor(i/12)] = 0;
        }
    }

    let r = nPublicRows;

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
            pr.nUsed ++;
            // If nUsed is equal to 2, it means the first set of constraints values is being fulfilled and the second half needs still to be added.
            // Otherwise the C12 row is full
            if (pr.nUsed == 2) {
                halfRows.push(pr);
                delete partialRows[k];
            } else if (pr.nUsed == 4) {
                delete partialRows[k];
            }
        // If the constraint is not stored in partialRows (which means that there is no other row that is using this very same set of constraints and is not full)
        // check if there's any half row. If that's the case, attach the new set of constraints values to that row 
        } else if (halfRows.length>0) {
            const pr = halfRows.shift();
            constPols.Compressor.C[6][pr.row] = c[3];
            constPols.Compressor.C[7][pr.row] = c[4];
            constPols.Compressor.C[8][pr.row] = c[5];
            constPols.Compressor.C[9][pr.row] = c[6];
            constPols.Compressor.C[10][pr.row] = c[7];
            constPols.Compressor.C[11][pr.row] = 0n;

            sMap[pr.nUsed*3][pr.row] = c[0];
            sMap[pr.nUsed*3+1][pr.row] = c[1];
            sMap[pr.nUsed*3+2][pr.row] = c[2];
            pr.nUsed ++;
            partialRows[k] = pr;
        // If the constraint is not stored in partialRows and all previous rows are full, start a new one
        } else {
            constPols.Compressor.C[0][r] = c[3];
            constPols.Compressor.C[1][r] = c[4];
            constPols.Compressor.C[2][r] = c[5];
            constPols.Compressor.C[3][r] = c[6];
            constPols.Compressor.C[4][r] = c[7];
            constPols.Compressor.C[5][r] = 0n;
            constPols.Compressor.GATE[r] = 1n;
            constPols.Compressor.POSEIDON12[r] = 0n;
            constPols.Compressor.PARTIAL[r] = 0n;
            constPols.Compressor.CMULADD[r] = 0n;
            constPols.Compressor.EVPOL4[r] = 0n;
            constPols.Compressor.FFT4[r] = 0n;
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
        } else {
            assert(false);
        }
    }

    for (let i=0; i<halfRows.length; i++) {
        const pr = halfRows[i];
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

    // Generate Custom Gates
    for (let i=0; i<r1cs.customGatesUses.length; i++) {
        if ((i%10000) == 0) console.log(`Point check -> Processing custom gates... ${i}/${r1cs.customGatesUses.length}`);
        const cgu = r1cs.customGatesUses[i];
        if (cgu.id == customGatesInfo.Poseidon12Id) {
            assert(cgu.signals.length == 31*12);
            // First 30 rows store the each one of the rounds, while the last one only stores the output hash value so
            // that it can be checked.
            // All constant polynomials are set to 0 except for C, which contains the GL Poseidon constants, 
            // POSEIDON12, which is always 1, and PARTIAL, which is 1 in the first and last for rounds and zero otherwise
            for (let i=0; i<31; i++) {
                for (let j=0; j<12; j++) {
                    sMap[j][r+i] = cgu.signals[i*12+j];
                    constPols.Compressor.C[j][r+i] = i<30 ? CPOSEIDON[i*12+j] : 0n;
                }
                constPols.Compressor.GATE[r+i] = 0n;
                constPols.Compressor.POSEIDON12[r+i] = i<30 ? 1n : 0n;
                constPols.Compressor.PARTIAL[r+i] = i<30 ? ((i<4)||(i>=26) ? 0n : 1n) : 0n;
                constPols.Compressor.CMULADD[r+i] = 0n;
                constPols.Compressor.EVPOL4[r+i] = 0n;
                constPols.Compressor.FFT4[r+i] = 0n;
            }
            r+=31;
        } else if (cgu.id == customGatesInfo.CMulAddId) {
            for (let i=0; i<12; i++) {
                sMap[i][r] = cgu.signals[i];
            }
            // All constant polynomials are set to 0 except for CMULADD, which is always 1
            constPols.Compressor.CMULADD[r] = 1n;
            constPols.Compressor.GATE[r] = 0n;
            constPols.Compressor.POSEIDON12[r] = 0n;
            constPols.Compressor.PARTIAL[r] = 0n;
            constPols.Compressor.EVPOL4[r] = 0n;
            constPols.Compressor.FFT4[r] = 0n;
            for (let j=0; j<12; j++) {
                constPols.Compressor.C[j][r] = 0n;
            }
            r+= 1;
        } else if ( typeof customGatesInfo.FFT4Parameters[cgu.id] !== "undefined") {
            for (let i=0; i<12; i++) {
                sMap[i][r] = cgu.signals[i];
                sMap[i][r+1] = cgu.signals[12+i];
            }
         
            // All constant polynomials are set to 0 except for FFT4, which is always 1, and C, which takes
            // the values according the FFT4 parameters
            constPols.Compressor.CMULADD[r] = 0n;
            constPols.Compressor.GATE[r] = 0n;
            constPols.Compressor.POSEIDON12[r] = 0n;
            constPols.Compressor.PARTIAL[r] = 0n;
            constPols.Compressor.EVPOL4[r] = 0n;
            constPols.Compressor.FFT4[r] = 1n;
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

            constPols.Compressor.CMULADD[r+1] = 0n;
            constPols.Compressor.GATE[r+1] = 0n;
            constPols.Compressor.POSEIDON12[r+1] = 0n;
            constPols.Compressor.PARTIAL[r+1] = 0n;
            constPols.Compressor.EVPOL4[r+1] = 0n;
            constPols.Compressor.FFT4[r+1] = 0n;
            for (let k=0; k<12; k++) {
                constPols.Compressor.C[k][r+1] = 0n;
            }
            r+= 2;
        } else if (cgu.id == customGatesInfo.EvPol4Id) {
            for (let i=0; i<12; i++) {
                sMap[i][r] = cgu.signals[i];
                sMap[i][r+1] =  i < 9 ? cgu.signals[12+i] : 0;
            }

            constPols.Compressor.EVPOL4[r] = 1n;
            constPols.Compressor.CMULADD[r] = 0n;
            constPols.Compressor.GATE[r] = 0n;
            constPols.Compressor.POSEIDON12[r] = 0n;
            constPols.Compressor.PARTIAL[r] = 0n;
            constPols.Compressor.FFT4[r] = 0n;

            for (let i=0; i<12; i++) {
                constPols.Compressor.C[i][r] = 0n;
                constPols.Compressor.C[i][r+1] = 0n;
            }

            constPols.Compressor.EVPOL4[r+1] = 0n;
            constPols.Compressor.CMULADD[r+1] = 0n;
            constPols.Compressor.GATE[r+1] = 0n;
            constPols.Compressor.POSEIDON12[r+1] = 0n;
            constPols.Compressor.PARTIAL[r+1] = 0n;
            constPols.Compressor.FFT4[r+1] = 0n;
            r+= 2;
        } else {
            throw new Error("Custom gate not defined", cgu.id);
        }
    }

    // Calculate Sigma Polynomials
    const ks = getKs(F, 11);
    let w = F.one;
    for (let i=0; i<N; i++) {
        if ((i%10000) == 0) console.log(`Point check -> Preparing S... ${i}/${N}`);
        constPols.Compressor.S[0][i] = w;
        for (let j=1; j<12; j++) {
            constPols.Compressor.S[j][i] = F.mul(w, ks[j-1]);
        }
        w = F.mul(w, F.w[nBits]);
    }

    const lastSignal = {}
    for (let i=0; i<r; i++) {
        if ((i%10000) == 0) console.log(`Point check -> Connection S... ${i}/${r}`);
        for (let j=0; j<12; j++) {
            if (sMap[j][i]) {
                if (typeof lastSignal[sMap[j][i]] !== "undefined") {
                    const ls = lastSignal[sMap[j][i]];
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

    // Fill unused rows (NUsed < r < N) with empty gates
    while (r<N) {
        if ((r%100000) == 0) console.log(`Point check -> Empty gates... ${r}/${N}`);
        constPols.Compressor.EVPOL4[r] = 0n;
        constPols.Compressor.CMULADD[r] = 0n;
        constPols.Compressor.GATE[r] = 0n;
        constPols.Compressor.POSEIDON12[r] = 0n;
        constPols.Compressor.PARTIAL[r] = 0n;
        constPols.Compressor.FFT4[r] = 0n;
        for (let k=0; k<12; k++) {
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
