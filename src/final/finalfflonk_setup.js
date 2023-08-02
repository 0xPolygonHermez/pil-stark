const fs = require("fs");
const path = require("path");
const { log2 } = require("pilcom/src/utils.js");
const {tmpName} = require("tmp-promise");
const { newConstantPolsArray, compile, getKs } = require("pilcom");
const ejs = require("ejs");
const r1cs2plonk = require("../r1cs2plonk");
const { calculatePlonkConstraints } = require("./final_helpers.js");

module.exports = async function plonkSetup(F, r1cs, options) {
    // Calculate the number plonk Additions and plonk constraints from the R1CS
    const [plonkConstraints, plonkAdditions] = r1cs2plonk(F, r1cs);
        
    const nCommitted = options.nCommitted ? Number(options.nCommitted) : 6;
    if(nCommitted%3 != 0 || nCommitted < 3) throw new Error("Invalid number of committed polynomials");

    const nPlonk = nCommitted/3;

    // Calculate how many C12 constraints are needed 
    const CPlonkConstraints = calculatePlonkConstraints(plonkConstraints,nPlonk);

    // Calculate the total number of publics used in PIL and how many rows are needed to store all of them
    let nPublics = r1cs.nOutputs + r1cs.nPubInputs;
    const nPublicRows = Math.floor((nPublics - 1)/nCommitted) + 1; 


    console.log(`Number of Plonk constraints: ${plonkConstraints.length} -> Number of plonk per row: ${nPlonk} -> Constraints:  ${CPlonkConstraints}`);
    console.log(`Number of Plonk additions: ${plonkAdditions.length}`);
    console.log(`Number of publics: ${nPublics} -> Constraints: ${nPublicRows}`);

    const NUsed = nPublicRows + CPlonkConstraints;
    
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

    const template = await fs.promises.readFile(path.join(__dirname, "finalfflonk.pil.ejs"), "utf8");
    const obj = {
        N,
        NUsed,
        nBits,
        nPublics,
        nPlonk,
        nCommitted,
    };

    const pilStr = ejs.render(template ,  obj);
    const pilFile = await tmpName();
    await fs.promises.writeFile(pilFile, pilStr, "utf8");
    const pil = await compile(F, pilFile);
    const constPols =  newConstantPolsArray(pil, F);

    fs.promises.unlink(pilFile);

    // Stores the positions of all the values that each of the committed polynomials takes in each row 
    // Remember that there are ${nCommitted} committed polynomials and the number of rows is stored in NUsed
    const sMap = [];
    for (let i=0;i<nCommitted; i++) {
        sMap[i] = new Uint32Array(N);
    }

    // Paste public inputs. All constant polynomials are set to 0
    for (let i=0; i<nPublicRows; i++) {
        for (let k=0; k<5; k++) {
            constPols.Final.C[k][i] = 0n;
        }
    }

    // Store the public inputs position in the mapping sMap
    for (let i=0; i<nPublicRows*nCommitted; i++) {
        // Since each row contains ${nCommitted} public inputs, it is possible that
        // the last row is partially empty. Therefore, fulfill that last row
        // with 0.
        if(i < nPublics) {
            sMap[i%nCommitted][Math.floor(i/nCommitted)] = 1+i;
        } else {
            sMap[i%nCommitted][Math.floor(i/nCommitted)] = 0;
        }
    }

    let r = nPublicRows;
    
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
            for(let j=0; j < nPlonk; j++) {
                sMap[3*j][r] = c[0];
                sMap[3*j + 1][r] = c[1];
                sMap[3*j + 2][r] = c[2];
            }

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

    const ks = getKs(F, nCommitted - 1);
    let w = F.one;
    for (let i=0; i<N; i++) {
        if ((i%10000) == 0) console.log(`Point check -> Preparing S... ${i}/${N}`);
        constPols.Final.S[0][i] = w;
        for (let j=1; j<nCommitted; j++) {
            constPols.Final.S[j][i] = F.mul(w, ks[j-1]);
        }
        w = F.mul(w, F.w[nBits]);
    }

    const lastSignal = {}
    for (let i=0; i<r; i++) {
        if ((i%10000) == 0) console.log(`Point check -> Connection S... ${i}/${r}`);
        for (let j=0; j<nCommitted; j++) {
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
