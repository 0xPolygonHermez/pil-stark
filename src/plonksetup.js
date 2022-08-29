const BigArray = require("@iden3/bigarray");
const { assert } = require("chai");
const fs = require("fs");
const path = require("path");
const F3G = require("./f3g.js");
const {log2} = require("./utils");
const {tmpName} = require("tmp-promise");
const { newConstantPolsArray, compile, getKs } = require("pilcom");
const ejs = require("ejs");
const { connect } = require("http2");



module.exports = async function plonkSetup(r1cs) {
    const F = new F3G();
    const [plonkConstraints, plonkAdditions] = processConstraints(F, r1cs);

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
        constPols.Compressor.Qm[r] = 0n;
        constPols.Compressor.Ql[r] = 0n;
        constPols.Compressor.Qr[r] = 0n;
        constPols.Compressor.Qo[r] = 0n;
        constPols.Compressor.Qk[r] = 0n;
        r +=1;
    }

    constPols.Global.L1[0] = 1n;
    for (let i=1; i<N; i++) {
        constPols.Global.L1[i] = 0n;
    }

    return {
        pilStr: pilStr,
        constPols: constPols,
        sMap: sMap,
        plonkAdditions: plonkAdditions
    };

    function connect(p1, i1, p2, i2) {
        [p1[i1], p2[i2]] = [p2[i2], p1[i1]];
    }

}

function processConstraints(F, r1cs, logger ) {
    const plonkConstraints = new BigArray();
    const plonkAdditions = new BigArray();
    let plonkNVars = r1cs.nVars;


    /*
    for (let s = 1; s <= nPublic ; s++) {
        const sl = s;
        const sr = 0;
        const so = 0;
        const qm = F.zero;
        const ql = F.one;
        const qr = F.zero;
        const qo = F.zero;
        const qc = F.zero;

        plonkConstraints.push([sl, sr, so, qm, ql, qr, qo, qc]);
    }
*/

    function join(lc1, k, lc2) {
        const res = {};
        for (let s in lc1) {
            if (typeof res[s] == "undefined") {
                res[s] = F.mul(k, lc1[s]);
            } else {
                res[s] = F.add(res[s], F.mul(k, lc1[s]));
            }
        }
        for (let s in lc2) {
            if (typeof res[s] == "undefined") {
                res[s] = lc2[s];
            } else {
                res[s] = F.add(res[s], lc2[s]);
            }
        }
        normalize(res);
        return res;
    }

    function normalize(lc) {
        const ss = Object.keys(lc);
        for (let i=0; i< ss.length; i++) {
            if (lc[ss[i]] == 0n) delete lc[ss[i]];
        }
    }

    function reduceCoefs(lc, maxC) {
        const res = {
            k: F.zero,
            s: [],
            coefs: []
        }
        const cs = [];
        for (let s in lc) {
            if (s==0) {
                res.k = F.add(res.k, lc[s]);
            } else if (lc[s] != 0n) {
                cs.push([Number(s), lc[s]])
            }
        }
        while (cs.length>maxC) {
            const c1 = cs.shift();
            const c2 = cs.shift();

            const sl = c1[0];
            const sr = c2[0];
            const so = plonkNVars++;
            const qm = F.zero;
            const ql = F.neg(c1[1]);
            const qr = F.neg(c2[1]);
            const qo = F.one;
            const qc = F.zero;

            plonkConstraints.push([sl, sr, so, qm, ql, qr, qo, qc]);

            plonkAdditions.push([sl, sr, c1[1], c2[1]]);

            cs.push([so, F.one]);
        }
        for (let i=0; i<cs.length; i++) {
            res.s[i] = cs[i][0];
            res.coefs[i] = cs[i][1];
        }
        while (res.coefs.length < maxC) {
            res.s.push(0);
            res.coefs.push(F.zero);
        }
        return res;
    }

    function addConstraintSum(lc) {
        const C = reduceCoefs(lc, 3);
        const sl = C.s[0];
        const sr = C.s[1];
        const so = C.s[2];
        const qm = F.zero;
        const ql = C.coefs[0];
        const qr = C.coefs[1];
        const qo = C.coefs[2];
        const qc = C.k;
        plonkConstraints.push([sl, sr, so, qm, ql, qr, qo, qc]);
    }

    function addConstraintMul(lcA, lcB, lcC) {
        const A = reduceCoefs(lcA, 1);
        const B = reduceCoefs(lcB, 1);
        const C = reduceCoefs(lcC, 1);


        const sl = A.s[0];
        const sr = B.s[0];
        const so = C.s[0];
        const qm = F.mul(A.coefs[0], B.coefs[0]);
        const ql = F.mul(A.coefs[0], B.k);
        const qr = F.mul(A.k, B.coefs[0]);
        const qo = F.neg(C.coefs[0]);
        const qc = F.sub(F.mul(A.k, B.k) , C.k);
        plonkConstraints.push([sl, sr, so, qm, ql, qr, qo, qc]);
    }

    function getLCType(lc) {
        let k = F.zero;
        let n = 0;
        const ss = Object.keys(lc);
        for (let i=0; i< ss.length; i++) {
            if (lc[ss[i]] == 0n) {
                delete lc[ss[i]];
            } else if (ss[i] == 0) {
                k = F.add(k, lc[ss[i]]);
            } else {
                n++;
            }
        }
        if (n>0) return n.toString();
        if (k != F.zero) return "k";
        return "0";
    }

    function process(lcA, lcB, lcC) {
        const lctA = getLCType(lcA);
        const lctB = getLCType(lcB);
        if ((lctA == "0") || (lctB == "0")) {
            normalize(lcC);
            addConstraintSum(lcC);
        } else if (lctA == "k") {
            const lcCC = join(lcB, lcA[0], lcC);
            addConstraintSum(lcCC);
        } else if (lctB == "k") {
            const lcCC = join(lcA, lcB[0], lcC);
            addConstraintSum(lcCC);
        } else {
            addConstraintMul(lcA, lcB, lcC);
        }
    }

    for (let c=0; c<r1cs.constraints.length; c++) {
        if ((logger)&&(c%10000 == 0)) logger.debug(`processing constraints: ${c}/${r1cs.nConstraints}`);
        process(...r1cs.constraints[c]);
    }


    return [plonkConstraints, plonkAdditions];

}
