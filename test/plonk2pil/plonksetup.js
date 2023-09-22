const fs = require("fs");
const path = require("path");
const F3g = require("../../src/helpers/f3g.js");
const { log2 } = require("pilcom/src/utils.js");
const {tmpName} = require("tmp-promise");
const { newConstantPolsArray, compile, getKs } = require("pilcom");
const ejs = require("ejs");
const r1cs2plonk = require("../../src/r1cs2plonk");
const { connect } = require("../../src/helpers/polutils.js");



module.exports = async function plonkSetup(r1cs) {
    const F = new F3g();
    const [plonkConstraints, plonkAdditions] = r1cs2plonk(F, r1cs);

    const nPublics = r1cs.nOutputs + r1cs.nPubInputs;
    const nPublicRows = nPublics;

    const NUsed = nPublicRows + plonkConstraints.length;
    const nBits = log2(NUsed - 1) + 1;
    const N = 1 << nBits;

    const template = await fs.promises.readFile(path.join(__dirname, "plonk.pil.ejs"), "utf8");
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

    const sMap = [];
    for (let i=0;i<3; i++) {
        sMap[i] = new Uint32Array(NUsed);
    }

    let r=0;

    // Paste public inputs.
    for (let i=0; i<nPublicRows; i++) {
        constPols.PlonkCircuit.Qm[r+i] = 0n;
        constPols.PlonkCircuit.Ql[r+i] = 0n;
        constPols.PlonkCircuit.Qr[r+i] = 0n;
        constPols.PlonkCircuit.Qo[r+i] = 0n;
        constPols.PlonkCircuit.Qk[r+i] = 0n;
    }

    for (let i=0; i<nPublics; i++) {
        sMap[0][r+i] = 1+i;
        sMap[1][r+i] = 0;
        sMap[2][r+i] = 0;
    }

    r += nPublicRows;

    // Paste plonk constraints.
    const partialRows = {};
    for (let i=0; i<plonkConstraints.length; i++) {
        if ((i%10000) == 0) console.log(`Processing constraint... ${i}/${plonkConstraints.length}`);
        const c = plonkConstraints[i];
        constPols.PlonkCircuit.Qm[r] = c[3];
        constPols.PlonkCircuit.Ql[r] = c[4];
        constPols.PlonkCircuit.Qr[r] = c[5];
        constPols.PlonkCircuit.Qo[r] = c[6];
        constPols.PlonkCircuit.Qk[r] = c[7];
        sMap[0][r] = c[0];
        sMap[1][r] = c[1];
        sMap[2][r] = c[2];
        r ++;
    }

    // Calculate S Polynomials
    const ks = getKs(F, 2);
    let w = F.one;
    for (let i=0; i<N; i++) {
        if ((i%10000) == 0) console.log(`Preparing S... ${i}/${N}`);
        constPols.PlonkCircuit.S[0][i] = w;
        for (let j=1; j<3; j++) {
            constPols.PlonkCircuit.S[j][i] = F.mul(w, ks[j-1]);
        }
        w = F.mul(w, F.w[nBits]);
    }

    const lastSignal = {}
    for (let i=0; i<r; i++) {
        if ((i%10000) == 0) console.log(`Connection S... ${i}/${r}`);
        for (let j=0; j<3; j++) {
            if (sMap[j][i]) {
                if (typeof lastSignal[sMap[j][i]] !== "undefined") {
                    const ls = lastSignal[sMap[j][i]];
                    connect(constPols.PlonkCircuit.S[ls.col], ls.row, constPols.PlonkCircuit.S[j], i);
                } else {
                    lastSignal[sMap[j][i]] = {
                        col: j,
                        row: i
                    };
                }
            }
        }
    }

    // Fill unused rows
    while (r<N) {
        if ((r%100000) == 0) console.log(`Empty gates... ${r}/${N}`);
        constPols.PlonkCircuit.Qm[r] = 0n;
        constPols.PlonkCircuit.Ql[r] = 0n;
        constPols.PlonkCircuit.Qr[r] = 0n;
        constPols.PlonkCircuit.Qo[r] = 0n;
        constPols.PlonkCircuit.Qk[r] = 0n;
        r +=1;
    }

    for (let j=0; j<nPublics; ++j) {
        let lPol = constPols.Global[`L${j+1}`];
        for (let i=0; i<N; i++) {
            lPol[i] = 0n;
        }
        lPol[j] = 1n;
    }

    return {
        pilStr: pilStr,
        constPols: constPols,
        sMap: sMap,
        plonkAdditions: plonkAdditions
    };
}
