const { assert } = require("chai");
const fs = require("fs");
const path = require("path");
const { log2 } = require("pilcom/src/utils.js");
const {tmpName} = require("tmp-promise");
const { newConstantPolsArray, compile, getKs } = require("pilcom");
const ejs = require("ejs");
const r1cs2plonk = require("../r1cs2plonk");
const {M, P, S, C} = require("../helpers/hash/poseidon/poseidon_constants_opt.js");
const { getCustomGatesInfo, calculatePlonkConstraintsRowsC12 } = require("./compressor_helpers.js");
const { connect } = require("../helpers/polutils");

/*
    Compress plonk constraints and verifies custom gates using 12 committed polynomials
*/
module.exports = async function plonkSetup(F, r1cs, options) {
    const committedPols = 12;

    // Calculate the number plonk Additions and plonk constraints from the R1CS
    const [plonkConstraints, plonkAdditions] = r1cs2plonk(F, r1cs);

    // Given the PLONK Constraints, which have the following form: qL*a + qR*b + qM*a*b + qO*c + qC = 0,
    // calculate the number of constraints required in the compressed Plonk. 
    // Since each regular plonk constrain only uses 3 wires (a, b and c), and several sets of wires can share the same set of polynomial
    // gates, we can further extend the compression by storing 2 different sets of (a_i, b_i, c_i) for every set of (qL, qR, qM, Q0, qC)
    // the committed polynomial. 
    // In this particular case, we will store two sets of gates in every row. The first one will correspond to a[0], a[1], a[2] and a[3], a[4], a[5] 
    // and the second on will correspond to a[6], a[7], a[8] and a[9], a[10], a[11]
    // In addition to that, since the first row of TreeSelector custom gate only uses 6 committed polynomials and it doesn't use any constant value, we will 
    // verify two plonk constraints in those rows.
    // In the same way, since Cmul and EvalPol have 3 committed polynomial values empty we will verify two plonk constraints in each row

    // Get information about the custom gates from the R1CS
    const customGatesInfo = getCustomGatesInfo(r1cs);

    // Calculate the total number of publics used in PIL and how many rows are needed to store all of them (remember that each row can store up to 12 values)
    let nPublics = r1cs.nOutputs + r1cs.nPubInputs;
    const nPublicRows = Math.floor((nPublics + 11)/12); 

    // Calculate the total number of rows that the Plonkish will have. 
    // - Each public uses one single row
    // - NPlonk stores the number of rows needed to fulfill all the constraints 
    // - Each Poseidon12 custom gate uses 11 rows (Input -> Round 1 -> Round 2 -> Round 3 -> Round 4 -> Round 15 -> Round 26 -> Round 27 -> Round 28 -> Round 29 -> Output)
    // - Each FFT4 custom gate uses 2 rows (1 for actually computing the FFT and the other one for checking the output)
    // - Each EvalPol4 custom gate uses 2 rows (1 for actually computing the evaluation and the other one for checking the output)
    // - Each TreeSelector custom gate uses 2 rows 
    console.log(`Number of publics: ${nPublics} -> Constraints: ${nPublicRows}`);
    console.log(`Number of CMul: ${customGatesInfo.nCMul} -> Constraints: ${customGatesInfo.nCMul}`);
    console.log(`Number of Poseidon12: ${customGatesInfo.nPoseidon12} -> Constraints: ${customGatesInfo.nPoseidon12*11}`);
    console.log(`Number of Poseidon12 custom: ${customGatesInfo.nCustPoseidon12} -> Constraints: ${customGatesInfo.nCustPoseidon12*11}`)
    console.log(`Total Number of Poseidon:  ${customGatesInfo.nPoseidon12 + customGatesInfo.nCustPoseidon12} -> Constraints ${(customGatesInfo.nPoseidon12 + customGatesInfo.nCustPoseidon12)*11}`);
    console.log(`Number of FFT4: ${customGatesInfo.nFFT4} -> Constraints: ${customGatesInfo.nFFT4*2}`);
    console.log(`Number of EvPol4: ${customGatesInfo.nEvPol4} -> Constraints: ${customGatesInfo.nEvPol4*2}`);
    console.log(`Number of TreeSelector4: ${customGatesInfo.nTreeSelector4} -> Constraints: ${customGatesInfo.nTreeSelector4*2}`);
    
    const nRowsCustomGates = nPublicRows + customGatesInfo.nCMul + customGatesInfo.nCustPoseidon12*11 + customGatesInfo.nPoseidon12*11 + customGatesInfo.nFFT4*2 + customGatesInfo.nEvPol4*2 + customGatesInfo.nTreeSelector4*2;
    
    // Calculate how many  constraints are needed 
    const CPlonkConstraints = calculatePlonkConstraintsRowsC12(plonkConstraints, customGatesInfo.nEvPol4 + customGatesInfo.nCMul, customGatesInfo.nTreeSelector4);

    console.log(`Number of plonk constraints: ${plonkConstraints.length}`);
    console.log(`Number of Plonk constraints stored in EvalPol -> ${customGatesInfo.nEvPol4*3}`)
    console.log(`Number of Plonk constraints stored in CMul and FFT4 -> ${(customGatesInfo.nCMul + customGatesInfo.nFFT4)*2}`)   
    console.log(`Number of plonk constraints new rows: ${CPlonkConstraints}`);
    
    const NUsed = nRowsCustomGates + CPlonkConstraints;
    
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

    const template = await fs.promises.readFile(path.join(__dirname, "compressor12.pil.ejs"), "utf8");
    const obj = {
        nBits: nBits,
        nPublics: nPublics,
        M,
        SS: S,
        P,
        C,
        committedPols
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
    for (let i=0;i<committedPols; i++) {
        sMap[i] = new Uint32Array(N);
    }

    const extraRows = [];
    const extraRowsTreeSelector = [];

    // Store the public inputs position in the mapping sMap
    // All constant polynomials are set to 0
    for (let i=0; i<nPublicRows; i++) {
        constPols.Compressor.EVPOL4[i] = 0n;
        constPols.Compressor.CMUL[i] = 0n;
        constPols.Compressor.GATE[i] = 0n;
        constPols.Compressor.POSEIDONM[i] = 0n;
        constPols.Compressor.POSEIDONP[i] = 0n;
        constPols.Compressor.POSEIDONFIRST[i] = 0n;
        constPols.Compressor.PARTIALROUND[i] = 0n;
        constPols.Compressor.PARTIALROUND2[i] = 0n;
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
    }
    
    let r = nPublicRows;

    // Generate Custom Gates
    for (let i=0; i<r1cs.customGatesUses.length; i++) {
        if ((i%10000) == 0) console.log(`Point check -> Processing custom gates... ${i}/${r1cs.customGatesUses.length}`);
        const cgu = r1cs.customGatesUses[i];
        if (cgu.id == customGatesInfo.Poseidon12Id) {
            assert(cgu.signals.length == 11*12);
                
            let counterC = 12;
            let counterS = 0;

            for (let i = 0; i < 11; ++i) {
                for (let j = 0; j<12; j++) {
                    sMap[j][r+i] = cgu.signals[counterS++];
                    // Partial rounds rows verify 11 rounds, and hence only 11 constants are needed. 
                    // For the last two rounds no constants are required according to the implementation
                    constPols.Compressor.C[j][r+i] = (i === 4 && j === 11) || (i === 5 && j === 11) || i == 9 || i == 10 ? 0n : BigInt(C[counterC++]);
                }

                constPols.Compressor.GATE[r+i] = 0n;
                constPols.Compressor.POSEIDONM[r+i] = i !== 3 && i !== 4 && i !== 5 && i !== 10 ? 1n : 0n;
                constPols.Compressor.POSEIDONP[r+i] = i === 3 ? 1n : 0n; // Round 3 -> Round 4
                constPols.Compressor.POSEIDONCUSTFIRST[r+i] = 0n;
                constPols.Compressor.POSEIDONFIRST[r+i] = i === 0 ? 1n : 0n; // Input -> Round 1
                constPols.Compressor.PARTIALROUND[r+i] = i === 4 ? 1n : 0n; // Round 4 -> Round 15
                constPols.Compressor.PARTIALROUND2[r+i] = i === 5 ? 1n : 0n; // Round 15 -> Round 26
                constPols.Compressor.CMUL[r+i] = 0n;
                constPols.Compressor.EVPOL4[r+i] = 0n;
                constPols.Compressor.TREESELECTOR4[r+i] = 0n;
                constPols.Compressor.FFT4[r+i] = 0n;

            }

            r+=11;
        } else if(cgu.id == customGatesInfo.CustPoseidon12Id) {
            assert(cgu.signals.length == 9 + 10*12);
            let counterC = 12;
            let counterS = 0;

            for (let i = 0; i < 11; ++i) {
                for (let j = 0; j<12; j++) {
                    sMap[j][r+i] = (i === 0 && (j === 9 || j === 10 || j === 11)) ? 0 : cgu.signals[counterS++];
                    // Partial rounds rows verify 11 rounds, and hence only 11 constants are needed. 
                    // For the last two rounds no constants are required according to the implementation
                    constPols.Compressor.C[j][r+i] = (i === 4 && j === 11) || (i === 5 && j === 11) || i == 9 || i == 10 ? 0n : BigInt(C[counterC++]);
                }

                constPols.Compressor.GATE[r+i] = 0n;
                constPols.Compressor.POSEIDONM[r+i] = i !== 3 && i !== 4 && i !== 5 && i !== 10 ? 1n : 0n;
                constPols.Compressor.POSEIDONP[r+i] = i === 3 ? 1n : 0n; // Round 3 -> Round 4
                constPols.Compressor.POSEIDONCUSTFIRST[r+i] = i === 0 ? 1n : 0n; // Input -> Round 1
                constPols.Compressor.POSEIDONFIRST[r+i] = 0n;
                constPols.Compressor.PARTIALROUND[r+i] = i === 4 ? 1n : 0n; // Round 4 -> Round 15
                constPols.Compressor.PARTIALROUND2[r+i] = i === 5 ? 1n : 0n; // Round 15 -> Round 26
                constPols.Compressor.CMUL[r+i] = 0n;
                constPols.Compressor.EVPOL4[r+i] = 0n;
                constPols.Compressor.TREESELECTOR4[r+i] = 0n;
                constPols.Compressor.FFT4[r+i] = 0n;

            }

            r+=11;
        } else if (cgu.id == customGatesInfo.CMulId) {
            assert(cgu.signals.length === 9);
            for (let i=0; i<9; i++) {
                sMap[i + 3][r] = cgu.signals[i];
            }
            constPols.Compressor.CMUL[r] = 1n;
            constPols.Compressor.GATE[r] = 0n;
            constPols.Compressor.POSEIDONM[r] = 0n;
            constPols.Compressor.POSEIDONP[r] = 0n;
            constPols.Compressor.POSEIDONFIRST[r] = 0n;
            constPols.Compressor.PARTIALROUND[r] = 0n;
            constPols.Compressor.PARTIALROUND2[r] = 0n;
            constPols.Compressor.POSEIDONCUSTFIRST[r] = 0n;
            constPols.Compressor.EVPOL4[r] = 0n;
            constPols.Compressor.TREESELECTOR4[r] = 0n;
            constPols.Compressor.FFT4[r] = 0n;
            
            for (let k=0; k<12; k++) {
                constPols.Compressor.C[k][r] = 0n;
            }

            // Add this row to extraRows so that a[9], a[10], a[11] and a[12], a[13] and a[14] along with C[6], C[7], C[8], C[9], C[10] 
            // can be used to verify two sets of plonk constraints
            extraRows.push(r);
            r+= 1;
        } else if ( typeof customGatesInfo.FFT4Parameters[cgu.id] !== "undefined") {
            assert(cgu.signals.length === 24);
            for (let i=0; i<12; i++) {
                sMap[i][r] = cgu.signals[i];
                sMap[i][r+1] = cgu.signals[12 + i];
            }
            
            constPols.Compressor.CMUL[r] = 0n;
            constPols.Compressor.GATE[r] = 0n;
            constPols.Compressor.POSEIDONM[r] = 0n;
            constPols.Compressor.POSEIDONP[r] = 0n;
            constPols.Compressor.POSEIDONFIRST[r] = 0n;
            constPols.Compressor.PARTIALROUND[r] = 0n;
            constPols.Compressor.PARTIALROUND2[r] = 0n;
            constPols.Compressor.POSEIDONCUSTFIRST[r] = 0n;
            constPols.Compressor.EVPOL4[r] = 0n;
            constPols.Compressor.TREESELECTOR4[r] = 0n;
            constPols.Compressor.FFT4[r] = 1n;

            constPols.Compressor.CMUL[r+1] = 0n;
            constPols.Compressor.GATE[r+1] = 0n;
            constPols.Compressor.POSEIDONM[r+1] = 0n;
            constPols.Compressor.POSEIDONP[r+1] = 0n;
            constPols.Compressor.POSEIDONFIRST[r+1] = 0n;
            constPols.Compressor.PARTIALROUND[r+1] = 0n;
            constPols.Compressor.PARTIALROUND2[r+1] = 0n;
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

            for (let k=9; k<12; k++) {
                constPols.Compressor.C[k][r] = 0n;
            }

            for (let k=0; k<12; k++) {
                constPols.Compressor.C[k][r+1] = 0n;
            }

            r+= 2;
        } else if (cgu.id == customGatesInfo.EvPol4Id) {
            assert(cgu.signals.length === 21);
            for (let i=0; i<9; i++) {
                sMap[i + 3][r] = cgu.signals[i];               
            }

            for (let i=0; i<12; i++) {
                sMap[i][r+1] = cgu.signals[9 + i];
            }

            for (let i=0; i<12; i++) {
                constPols.Compressor.C[i][r] = 0n;
                constPols.Compressor.C[i][r+1] = 0n;
            }
            constPols.Compressor.EVPOL4[r] = 1n;
            constPols.Compressor.TREESELECTOR4[r] = 0n;
            constPols.Compressor.CMUL[r] = 0n;
            constPols.Compressor.GATE[r] = 0n;
            constPols.Compressor.POSEIDONM[r] = 0n;
            constPols.Compressor.POSEIDONP[r] = 0n;
            constPols.Compressor.POSEIDONFIRST[r] = 0n;
            constPols.Compressor.PARTIALROUND[r] = 0n;
            constPols.Compressor.PARTIALROUND2[r] = 0n;
            constPols.Compressor.POSEIDONCUSTFIRST[r] = 0n;
            constPols.Compressor.FFT4[r] = 0n;

            constPols.Compressor.EVPOL4[r+1] = 0n;
            constPols.Compressor.TREESELECTOR4[r+1] = 0n;
            constPols.Compressor.CMUL[r+1] = 0n;
            constPols.Compressor.GATE[r+1] = 0n;
            constPols.Compressor.POSEIDONM[r+1] = 0n;
            constPols.Compressor.POSEIDONP[r+1] = 0n;
            constPols.Compressor.POSEIDONFIRST[r+1] = 0n;
            constPols.Compressor.PARTIALROUND[r+1] = 0n;
            constPols.Compressor.PARTIALROUND2[r+1] = 0n;
            constPols.Compressor.POSEIDONCUSTFIRST[r+1] = 0n;
            constPols.Compressor.FFT4[r+1] = 0n;

            // Add r + 1 to extraRows so that a[6]', a[7]', a[8]' and a[9]', a[10]', a[11]' and a[12]', a[13]' and a[14]' along with C[6]', C[7]', C[8]', C[9]', C[10]' 
            // can be used to verify three sets of plonk constraints
            extraRows.push(r);
            r+= 2;
        } else if(cgu.id == customGatesInfo.TreeSelector4Id) {
            assert(cgu.signals.length === 17);
            for (let i=0; i<6; i++) {
                sMap[i + 6][r] = cgu.signals[i];
            }
            for (let i=0; i<11; i++) {
                sMap[i][r+1] = cgu.signals[i + 6];
            }

            constPols.Compressor.EVPOL4[r] = 0n;
            constPols.Compressor.TREESELECTOR4[r] = 1n;
            constPols.Compressor.CMUL[r] = 0n;
            constPols.Compressor.GATE[r] = 0n;
            constPols.Compressor.POSEIDONM[r] = 0n;
            constPols.Compressor.POSEIDONP[r] = 0n;
            constPols.Compressor.POSEIDONFIRST[r] = 0n;
            constPols.Compressor.PARTIALROUND[r] = 0n;
            constPols.Compressor.PARTIALROUND2[r] = 0n;
            constPols.Compressor.POSEIDONCUSTFIRST[r] = 0n;
            constPols.Compressor.FFT4[r] = 0n;

            constPols.Compressor.EVPOL4[r+1] = 0n;
            constPols.Compressor.TREESELECTOR4[r+1] = 0n;
            constPols.Compressor.CMUL[r+1] = 0n;
            constPols.Compressor.GATE[r+1] = 0n;
            constPols.Compressor.POSEIDONM[r+1] = 0n;
            constPols.Compressor.POSEIDONP[r+1] = 0n;
            constPols.Compressor.POSEIDONFIRST[r+1] = 0n;
            constPols.Compressor.PARTIALROUND[r+1] = 0n;
            constPols.Compressor.PARTIALROUND2[r+1] = 0n;
            constPols.Compressor.POSEIDONCUSTFIRST[r+1] = 0n;
            constPols.Compressor.FFT4[r+1] = 0n;

            for (let i=0; i<12; i++) {
                constPols.Compressor.C[i][r] = 0n;
                constPols.Compressor.C[i][r+1] = 0n;
            }

            extraRowsTreeSelector.push(r);
            r += 2;
        } else {
            throw new Error("Custom gate not defined", cgu.id);
        }
    }

    // Paste plonk constraints.
    // Each row can be split in two subsets: 
    // a[0], a[1], a[2] and a[3], a[4], a[5] --> C[0], C[1], C[2], C[3], C[4]
    // a[6], a[7], a[8] and a[9], a[10], a[11] --> C[6], C[7], C[8], C[9], C[10]  
    // Remember that each row will contain two sets of constraints, each of them should be fulfilled by two different set of wires.
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
            if(pr.nUsed === 2 || pr.nUsed === 4) {
                delete partialRows[k];
            }
           
        // If the constraint is not stored in partialRows (which means that there is no other row that is using this very same set of constraints and is not full)
        // check if there's any half row. If that's the case, attach the new set of constraints values to that row 
        } else if (halfRows.length > 0) {
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
        } else if(extraRowsTreeSelector.length > 0) {
            const row = extraRowsTreeSelector.shift();
            constPols.Compressor.C[0][row] = c[3];
            constPols.Compressor.C[1][row] = c[4];
            constPols.Compressor.C[2][row] = c[5];
            constPols.Compressor.C[3][row] = c[6];
            constPols.Compressor.C[4][row] = c[7];
            constPols.Compressor.C[5][row] = 0n;

            sMap[0][row] = c[0];
            sMap[1][row] = c[1];
            sMap[2][row] = c[2];
            
            partialRows[k] = {
                row: row,
                nUsed: 1
            };
        // If the constraint is not stored in partialRows and all previous rows are full, start a new one
        } else if(extraRows.length > 0) {
            const row = extraRows.shift();
            constPols.Compressor.C[0][row] = c[3];
            constPols.Compressor.C[1][row] = c[4];
            constPols.Compressor.C[2][row] = c[5];
            constPols.Compressor.C[3][row] = c[6];
            constPols.Compressor.C[4][row] = c[7];
            constPols.Compressor.C[5][row] = 0n;

            sMap[0][row] = c[0];
            sMap[1][row] = c[1];
            sMap[2][row] = c[2];
        } else {
            constPols.Compressor.C[0][r] = c[3];
            constPols.Compressor.C[1][r] = c[4];
            constPols.Compressor.C[2][r] = c[5];
            constPols.Compressor.C[3][r] = c[6];
            constPols.Compressor.C[4][r] = c[7];
            constPols.Compressor.C[5][r] = 0n;
            constPols.Compressor.GATE[r] = 1n;
            constPols.Compressor.EVPOL4[r] = 0n;
            constPols.Compressor.CMUL[r] = 0n;
            constPols.Compressor.POSEIDONM[r] = 0n;
            constPols.Compressor.POSEIDONP[r] = 0n;
            constPols.Compressor.PARTIALROUND[r] = 0n;
            constPols.Compressor.PARTIALROUND2[r] = 0n;
            constPols.Compressor.POSEIDONFIRST[r] = 0n;
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

            halfRows.push({
                row: r,
                nUsed: 2
            });

            for(let i = 6; i < 12; ++i) {
                sMap[i][r] = 0;
                constPols.Compressor.C[i][r] = 0n;
            }
            r++;
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
        } else if (pr.nUsed == 3) {
            sMap[9][pr.row] = sMap[6][pr.row];
            sMap[10][pr.row] = sMap[7][pr.row];
            sMap[11][pr.row] = sMap[8][pr.row];

        } else {
            assert(false);
        }
    }
    
    // Calculate S Polynomials
    const ks = getKs(F, committedPols-1);
    let w = F.one;
    for (let i=0; i<N; i++) {
        if ((i%10000) == 0) console.log(`Point check -> Preparing S... ${i}/${N}`);
        constPols.Compressor.S[0][i] = w;
        for (let j=1; j<committedPols; j++) {
            constPols.Compressor.S[j][i] = F.mul(w, ks[j-1]);
        }
        w = F.mul(w, F.w[nBits]);
    }

    let connections = 0;
    const lastSignal = {}
    for (let i=0; i<r; i++) {
        if ((i%10000) == 0) console.log(`Point check -> Connection S... ${i}/${r}`);
        for (let j=0; j<committedPols; j++) {
            if (sMap[j][i]) {
                if (typeof lastSignal[sMap[j][i]] !== "undefined") {
                    const ls = lastSignal[sMap[j][i]];
                    connections++;
                    connect(constPols.Compressor.S[ls.col],ls.row, constPols.Compressor.S[j], i);
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
        constPols.Compressor.CMUL[r] = 0n;
        constPols.Compressor.GATE[r] = 0n;
        constPols.Compressor.POSEIDONM[r] = 0n;
        constPols.Compressor.POSEIDONP[r] = 0n;
        constPols.Compressor.POSEIDONFIRST[r] = 0n;
        constPols.Compressor.PARTIALROUND[r] = 0n;
        constPols.Compressor.PARTIALROUND2[r] = 0n;
        constPols.Compressor.POSEIDONCUSTFIRST[r] = 0n;
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
}
