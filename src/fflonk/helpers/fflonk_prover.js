const {BigBuffer} = require("ffjavascript");
const { getPowersOfTau, Polynomial, commit, Keccak256Transcript } = require("shplonkjs");
const workerpool = require("workerpool");
const { fflonkgen_execute } = require("./fflonk_prover_worker");
const { calculateH1H2, calculateZ, buildZhInv } = require("../../helpers/polutils");
const { open } = require("shplonkjs/src/shplonk");

const Logger = require('logplease');

const parallelExec = false;
const useThreads = false;
const maxNperThread = 1 << 18;
const minNperThread = 1 << 12;


module.exports.fflonkProve = async function fflonkProve(cmPols, cnstPols, fflonkInfo, zkey, ptauFile, options) {
    const logger = Logger.create("logger");
    
    const {PTau, curve} = await getPowersOfTau(zkey.f, ptauFile, zkey.power, logger);

    const Fr = curve.Fr;

    const ctx = {};
    ctx.fflonkInfo = fflonkInfo;
    ctx.challenges = [];
    ctx.curve = curve;
    ctx.Fr = curve.Fr;
    // Define the big buffers
    ctx.N = 1 << zkey.power;
    ctx.nBits = zkey.power;
    ctx.extendBits = fflonkInfo.extendBits;
    ctx.nBitsExt = zkey.power + ctx.extendBits;
    ctx.NExt = (1 << ctx.nBitsExt);

    const domainSize = ctx.N;
    const domainSizeExt = ctx.NExt;
    const power = zkey.power;
    const n8r = Fr.n8;
    const sDomain = domainSize * n8r;
    const sDomainExt = domainSizeExt * n8r;

    if (logger) {
        logger.debug("-----------------------------");
        logger.debug("  PIL-FFLONK PROVE SETTINGS");
        logger.debug(`  Curve:         ${curve.name}`);
        logger.debug(`  Domain size:   ${domainSize} (2^${power})`);
        logger.debug(`  Domain size ext: ${domainSizeExt} (${1 << ctx.nBitsExt} * N)`);
        logger.debug(`  Const  pols:   ${fflonkInfo.nConstants}`);
        logger.debug(`  Step 1 pols:   ${fflonkInfo.mapSectionsN.cm1_n}`);
        logger.debug(`  Step 2 pols:   ${fflonkInfo.mapSectionsN.cm2_n}`);
        logger.debug(`  Step 3 pols:   ${fflonkInfo.mapSectionsN.cm3_n}`);
        logger.debug(`  Step 4 pols:   ${fflonkInfo.mapSectionsN.cm4_n}`);
        logger.debug(`  Temp exp pols: ${fflonkInfo.mapSectionsN.tmpExp_n}`);
        logger.debug("-----------------------------");
    }

    // Global counter
    let nCm = fflonkInfo.nCm1;

    // Reserve big buffers for the polynomial coefficients
    ctx.const_n = new BigBuffer(fflonkInfo.nConstants * sDomain); // Constant polynomials
    ctx.cm1_n = new BigBuffer(fflonkInfo.mapSectionsN.cm1_n * sDomain);
    ctx.cm2_n = new BigBuffer(fflonkInfo.mapSectionsN.cm2_n * sDomain);
    ctx.cm3_n = new BigBuffer(fflonkInfo.mapSectionsN.cm3_n * sDomain);
    ctx.cm4_n = new BigBuffer(fflonkInfo.mapSectionsN.cm4_n * sDomain);
    ctx.tmpExp_n = new BigBuffer(fflonkInfo.mapSectionsN.tmpExp_n * sDomain); // Expression polynomials
    ctx.x_n = new BigBuffer(sDomain); // Omegas de field extension

    // Reserve big buffers for the polynomial evaluations in the extended
    ctx.const_2ns = new BigBuffer(fflonkInfo.nConstants * sDomainExt);
    ctx.cm1_2ns = new BigBuffer(fflonkInfo.mapSectionsN.cm1_n * sDomainExt);
    ctx.cm2_2ns = new BigBuffer(fflonkInfo.mapSectionsN.cm2_n * sDomainExt);
    ctx.cm3_2ns = new BigBuffer(fflonkInfo.mapSectionsN.cm3_n * sDomainExt);
    ctx.q_2ns = new BigBuffer(fflonkInfo.qDim * sDomainExt);
    ctx.x_2ns = new BigBuffer(sDomainExt); // Omegas a l'extès


    // TODO REVIEW
    let w = Fr.one;
    for (let i = 0; i < domainSize; i++) {
        const i_n8r = i * n8r;

        ctx.x_n.set(w, i_n8r);
        w = Fr.mul(w, Fr.w[power])
    }

    let xx = Fr.shift;
    for (let i=0; i< domainSizeExt; i++) {
        const i_n8r = i * n8r;

        ctx.x_2ns.set(xx, i_n8r);
        xx = Fr.mul(xx, Fr.w[ctx.nBitsExt]);
    }
       

    // Build ZHInv
    const zhInv = buildZhInv(Fr, ctx.nBits, ctx.extendBits);
    ctx.Zi = zhInv;

    const committedPols = {};

    const transcript = new Keccak256Transcript(curve);

    if (logger) logger.debug("");

    const pool = workerpool.pool(__dirname + '/fflonk_prover_worker.js');

    ctx.publics = [];
    for (let i = 0; i < fflonkInfo.publics.length; i++) {
        const publicPol = fflonkInfo.publics[i];

        if ("cmP" === publicPol.polType) {
            const offset = publicPol.polId * sDomain + publicPol.idx * n8r;
            ctx.publics[i] = ctx.cm1_n.slice(offset, offset + n8r);
        } else if ("imP" === publicPol.polType) {
            ctx.publics[i] = calculateExpAtPoint(ctx, fflonkInfo.publicsCode[i], publicPol.idx);
        } else {
            throw new Error(`Invalid public type: ${polType.type}`);
        }
    }

    // ROUND 1. Compute Trace Column Polynomials
    if (logger) logger.debug("> ROUND 1. Compute Trace Column Polynomials");
    await round1();

    // ROUND 2. Compute Inclusion Polynomials
    if (logger) logger.debug("> ROUND 2. Compute Inclusion Polynomials");
    await round2();

    // ROUND 3. Compute Grand Product and Intermediate Polynomials
    if (logger) logger.debug("> ROUND 3. Compute Grand Product and Intermediate Polynomials");
    await round3();

    // ROUND 4. Trace Quotient Polynomials
    if (logger) logger.debug("> ROUND 4. Compute Trace Quotient Polynomials");
    await round4();
    
    const [cmts, evaluations] = await open(zkey, PTau, ctx, committedPols, curve, {logger});

    await pool.terminate();

    return {
        commits: cmts,
        evaluations,
        publics: ctx.publics,
    };    

    async function round1() {
        // STEP 1.1 - Compute random challenge
        // Add preprocessed polynomials to the transcript
        const cnstCommitPols = Object.keys(zkey).filter(k => k.match(/^f\d/));
        for(let i = 0; i < cnstCommitPols.length; ++i) {
            transcript.addPolCommitment(zkey[cnstCommitPols[i]]);
            committedPols[`${cnstCommitPols[i]}`] = {commit: zkey[cnstCommitPols[i]]};
        }
        
        for (let i = 0; i < cnstPols.$$nPols; i++) {
            const sOffset = i * sDomain;
            const sOffsetExt = i * sDomainExt;

            const name = cnstPols.$$defArray[i].name;
            if (cnstPols.$$defArray[i].idx >= 0) name += cnstPols.$$defArray[i].idx;

            if (logger) logger.debug(`··· Preparing ${name} constant polynomial`);

            const cnstPolBuffer = cnstPols.$$array[i];
            for (let j = 0; j < cnstPolBuffer.length; j++) {
                ctx.const_n.set(Fr.e(cnstPolBuffer[j]), sOffset + j * n8r);
            }

            // Compute coefficients
            ctx[name] = await Polynomial.fromEvaluations(ctx.const_n.slice(sOffset, sOffset + sDomain), curve, logger);
            
            // Compute extended evals
            ctx.const_2ns.set(ctx[name].coef, sOffsetExt);
            const bufferEvs = await Fr.fft(ctx.const_2ns.slice(sOffsetExt, sOffsetExt + sDomainExt));
            ctx.const_2ns.set(bufferEvs, sOffsetExt);
        }

        const commitsConstants = await commit(0, zkey, ctx, PTau, curve, { multiExp: false, logger });

        for (let j = 0; j < commitsConstants.length; ++j) {
            committedPols[`${commitsConstants[j].index}`].pol = commitsConstants[j].pol;
        }


        for (let i = 0; i < cmPols.$$nPols; i++) {
            const sOffset = i * sDomain;
            const sOffsetExt = i * sDomainExt;

            let name = cmPols.$$defArray[i].name;
            if (cmPols.$$defArray[i].idx >= 0)
                name += cmPols.$$defArray[i].idx;

            if (logger) logger.debug(`··· Preparing '${name}' polynomial`);

            // Compute polynomial evaluations
            const cmPolBuffer = cmPols.$$array[i];
            for (let j = 0; j < cmPolBuffer.length; j++) {
                ctx.cm1_n.set(Fr.e(cmPolBuffer[j]), sOffset + j * n8r);
            }

            let buffer = ctx.cm1_n.slice(sOffset, sOffset + sDomain);
            //buffer = await Fr.batchToMontgomery(buffer);
            
            ctx.cm1_n.set(buffer, sOffset);

            // Compute polynomial from evaluations
            ctx[name] = await Polynomial.fromEvaluations(buffer, curve, logger);

            // Compute extended evals
            ctx.cm1_2ns.set(ctx[name].coef.slice(), sOffsetExt);
            const bufferEvs = await Fr.fft(ctx.cm1_2ns.slice(sOffsetExt, sOffsetExt + sDomainExt));
            ctx.cm1_2ns.set(bufferEvs, sOffsetExt);
        }        

        const commits1 = await commit(1, zkey, ctx, PTau, curve, { multiExp: true, logger });
        for (let j = 0; j < commits1.length; ++j) {
            committedPols[`${commits1[j].index}`] = { commit: commits1[j].commit, pol: commits1[j].pol };
        }
    }

    async function round2() {
        // STEP 2.1 - Compute random challenge
        transcript.reset();

        if (logger) logger.debug("> Computing challenges alpha and beta");

        // Add all the publics to the transcript
        for (let i = 0; i < fflonkInfo.publics.length; i++) {
            transcript.addScalar(ctx.publics[i]);
        }

        if (0 === transcript.data.length) {
            transcript.addScalar(Fr.one);
        }

        // Compute challenge alpha
        ctx.challenges[0] = transcript.getChallenge();
        if (logger) logger.debug("··· challenges.alpha: " + Fr.toString(ctx.challenges[0]));

        // Compute challenge beta
        transcript.reset();
        transcript.addScalar(ctx.challenges[0]);
        ctx.challenges[1] = transcript.getChallenge();
        if (logger) logger.debug("··· challenges.beta: " + Fr.toString(ctx.challenges[1]));
        
        await callCalculateExps("step2prev", "n", pool, ctx, fflonkInfo, zkey, logger);

        if(0 === fflonkInfo.puCtx.length) {
            if(logger) logger.debug("··· !!! No polynomials to compute...skipping round 2");
            return;
        }

        for (let i = 0; i < fflonkInfo.puCtx.length; i++) {
            const sOffset = 2 * i * sDomain;
            const sOffsetExt = 2 * i * sDomainExt;

            const puCtx = fflonkInfo.puCtx[i];

            const fPol = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[puCtx.fExpId]);
            const tPol = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[puCtx.tExpId]);

            const [h1, h2] = calculateH1H2(Fr, fPol, tPol);
            setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm++], h1);
            setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm++], h2);

            // Compute polynomial coefficients
            ctx[`Plookup.H1_${i}`] = await Polynomial.fromEvaluations(ctx.cm2_n.slice(sOffset, sOffset + sDomain), curve, logger);
            ctx[`Plookup.H2_${i}`] = await Polynomial.fromEvaluations(ctx.cm2_n.slice(sOffset + sDomain, sOffset + 2 * sDomain), curve, logger);

            // Compute extended evals
            ctx.cm2_2ns.set(ctx[`Plookup.H1_${i}`].coef, sOffsetExt);
            ctx.cm2_2ns.set(ctx[`Plookup.H2_${i}`].coef, sOffsetExt + sDomainExt);

            const bufferEvs1 = await Fr.fft(ctx.cm2_2ns.slice(sOffsetExt, sOffsetExt + sDomainExt));
            const bufferEvs2 = await Fr.fft(ctx.cm2_2ns.slice(sOffsetExt + sDomainExt, sOffsetExt + 2*sDomainExt));

            ctx.cm2_2ns.set(bufferEvs1, sOffsetExt);
            ctx.cm2_2ns.set(bufferEvs2, sOffsetExt + sDomainExt);


        }

        const commits2 = await commit(2, zkey, ctx, PTau, curve, { multiExp: true, logger });
        for (let j = 0; j < commits2.length; ++j) {
            committedPols[`${commits2[j].index}`] = { commit: commits2[j].commit, pol: commits2[j].pol };
        }
    }

    async function round3() {
        transcript.reset();

        if (logger) logger.debug("> Computing challenges gamma and delta");

        // Compute challenge gamma
        transcript.addScalar(ctx.challenges[0]);
        transcript.addScalar(ctx.challenges[1]);
        ctx.challenges[2] = transcript.getChallenge();
        if (logger) logger.debug("··· challenges.gamma: " + Fr.toString(ctx.challenges[2]));

        // Compute challenge delta
        transcript.reset();
        transcript.addScalar(ctx.challenges[2]);
        ctx.challenges[3] = transcript.getChallenge();
        if (logger) logger.debug("··· challenges.delta: " + Fr.toString(ctx.challenges[3]));

        await callCalculateExps("step3prev", "n", pool, ctx, fflonkInfo, zkey, logger);

        const nPlookups = fflonkInfo.puCtx.length;
        const nPermutations = fflonkInfo.peCtx.length;
        const nConnections = fflonkInfo.ciCtx.length;

        if(0 === nPlookups + nPermutations + nConnections) {
            if(logger) logger.debug("··· !!! No polynomials to compute...skipping round 3");
            return;
        }

        for (let i = 0; i < nPlookups; i++) {
            const sOffset = i * sDomain;
            const sOffsetExt = i * sDomainExt;

            if (logger) logger.debug(`··· Calculating z for plookup ${i}`);

            const pu = fflonkInfo.puCtx[i];
            const pNum = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[pu.numId]);
            const pDen = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[pu.denId]);
            const z = await calculateZ(Fr, pNum, pDen);

            setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm++], z);

            // Compute polynomial coefficients
            ctx[`Plookup.Z${i}`] = await Polynomial.fromEvaluations(ctx.cm3_n.slice(sOffset, sOffset + sDomain), curve, logger);

            // Compute extended evals
            ctx.cm3_2ns.set(ctx[`Plookup.Z${i}`].coef, sOffsetExt);
            const bufferEvs = await Fr.fft(ctx.cm3_2ns.slice(sOffsetExt, sOffsetExt + sDomainExt));
            ctx.cm3_2ns.set(bufferEvs, sOffsetExt);
        }

        let offsetCm3 = nPlookups * sDomain;
        let offsetCm3Ext = nPlookups * sDomainExt;
        for (let i = 0; i < nPermutations; i++) {
            const sOffset = offsetCm3 + i * sDomain;
            const sOffsetExt = offsetCm3Ext + i * sDomainExt;
            if (logger) logger.debug(`··· Calculating z for permutation check ${i}`);

            const pe = fflonkInfo.peCtx[i];
            const pNum = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[pe.numId]);
            const pDen = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[pe.denId]);
            const z = await calculateZ(Fr, pNum, pDen);

            setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm++], z);

            // Compute polynomial coefficients
            ctx[`Permutation.Z${i}`] = await Polynomial.fromEvaluations(ctx.cm3_n.slice(sOffset, sOffset + sDomain), curve, logger);

            // Compute extended evals
            ctx.cm3_2ns.set(ctx[`Permutation.Z${i}`].coef, sOffsetExt);
            const bufferEvs = await Fr.fft(ctx.cm3_2ns.slice(sOffsetExt, sOffsetExt + sDomainExt));
            ctx.cm3_2ns.set(bufferEvs, sOffsetExt);
        }

        offsetCm3 += nPermutations * sDomain;
        offsetCm3Ext += nPermutations * sDomainExt;
        for (let i = 0; i < nConnections; i++) {
            const sOffset = offsetCm3 + i * sDomain;
            const sOffsetExt = offsetCm3Ext + i * sDomainExt;

            if (logger)
                logger.debug(`··· Calculating z for connection ${i}`);

            const ci = fflonkInfo.ciCtx[i];
            const pNum = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[ci.numId]);
            const pDen = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[ci.denId]);
            const z = await calculateZ(Fr, pNum, pDen);

            setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm++], z);

            // Compute polynomial coefficients
            ctx[`Connection.Z${i}`] = await Polynomial.fromEvaluations(ctx.cm3_n.slice(sOffset, sOffset + sDomain), curve, logger);

            // Compute extended evals
            ctx.cm3_2ns.set(ctx[`Connection.Z${i}`].coef, sOffsetExt);
            const bufferEvs = await Fr.fft(ctx.cm3_2ns.slice(sOffsetExt, sOffsetExt + sDomainExt));
            ctx.cm3_2ns.set(bufferEvs, sOffsetExt);
        }

        const commits3 = await commit(3, zkey, ctx, PTau, curve, { multiExp: true, logger });
        for (let j = 0; j < commits3.length; ++j) {
            committedPols[`${commits3[j].index}`] = { commit: commits3[j].commit, pol: commits3[j].pol };
        }

        await callCalculateExps("step3", "n", pool, ctx, fflonkInfo, zkey);
    }

    function printPol(buffer) {
        const len = buffer.byteLength / n8r;

        for(let i = 0; i < len; ++i) {
            console.log(i, Fr.toString(buffer.slice(i * n8r, (i + 1) * n8r)));
        }
    }

    async function round4() {

        for(let i = 0; i < fflonkInfo.imExpsList.length; ++i) {
            const imPol = getPol(ctx, fflonkInfo, fflonkInfo.imExp2cm[fflonkInfo.imExpsList[i]]);
            ctx[`Im${fflonkInfo.imExpsList[i]}`] = Polynomial.fromCoefficientsArray(imPol, curve, logger);
        }

        await callCalculateExps("step42ns", "2ns", pool, ctx, fflonkInfo, zkey, logger);

        transcript.reset();

        if (logger) logger.debug("> Computing challenge a");

        // Compute challenge a
        transcript.addScalar(ctx.challenges[2]);
        transcript.addScalar(ctx.challenges[3]);
        ctx.challenges[4] = transcript.getChallenge();
        if (logger) logger.debug("··· challenges.a: " + Fr.toString(ctx.challenges[4]));

        const qq1 = await ctx.curve.Fr.ifft(ctx.q_2ns);
        const qq2 = new BigBuffer(ctx.fflonkInfo.qDim*ctx.fflonkInfo.qDeg*sDomain);

        let curS = Fr.one;
        const shiftIn = Fr.exp(Fr.inv(Fr.shift), ctx.N);
        for (let p =0; p<ctx.fflonkInfo.qDeg; p++) {
            for (let i=0; i<ctx.N; i++) {
                for (let k=0; k<fflonkInfo.qDim; k++) {
                    const indexqq1 = (p*ctx.N*fflonkInfo.qDim + i*fflonkInfo.qDim + k)*n8r;
                    const indexqq2 = (i*fflonkInfo.qDim*fflonkInfo.qDeg + fflonkInfo.qDim*p + k)*n8r;
                    const element = Fr.mul(qq1.slice(indexqq1, indexqq1 + n8r), curS);
                    qq2.set(element, indexqq2);
                }
            }
            curS = Fr.mul(curS, shiftIn);
        }

        ctx["Q"] = new Polynomial(qq2, curve, logger);

        printPol(ctx["Q"].coef);

        const commits4 = await commit(4, zkey, ctx, PTau, curve, { multiExp: true, logger });
        for (let j = 0; j < commits4.length; ++j) {
            committedPols[`${commits4[j].index}`] = { commit: commits4[j].commit, pol: commits4[j].pol };
        }
    }

    async function callCalculateExps(step, dom, pool, ctx, fflonkInfo, zkey, logger) {
        if (parallelExec) {
            await calculateExpsParallel(pool, ctx, step, fflonkInfo, zkey);
        } else {
            calculateExps(ctx, fflonkInfo[step], dom, logger);
        }
    }
}


function calculateExps(ctx, code, dom, logger) {
    ctx.tmp = new Array(code.tmpUsed);

    cFirst = new Function("ctx", "i", compileCode(ctx, code.first, dom));

    const N = dom === "n" ? ctx.N : ctx.NExt;
    const pCtx = ctxProxy(ctx);

    for (let i = 0; i < N; i++) {
        if (i !== 0 && (i % 1000) === 0) {
            if(logger) logger.debug(`··· Calculating expression ${i}/${N}`);
        }

        cFirst(pCtx, i);
    }
}

function calculateExpAtPoint(ctx, code, i) {
    ctx.tmp = new Array(code.tmpUsed);
    cFirst = new Function("ctx", "i", compileCode(ctx, code.first, "n", true));
    const pCtx = ctxProxy(ctx);
    return cFirst(pCtx, i);
}

//TODO: FIX THIS FUNCTION
async function calculateExpsParallel(pool, ctx, execPart, fflonkInfo, zkey) {

    let dom;
    let code = fflonkInfo[execPart];
    let execInfo = {
        inputSections: [],
        outputSections: []
    };
    if (execPart == "step2prev") {
        execInfo.inputSections.push({ name: "cm1_n" });
        execInfo.inputSections.push({ name: "const_n" });
        execInfo.outputSections.push({ name: "cm2_n" });
        execInfo.outputSections.push({ name: "cm3_n" });
        execInfo.outputSections.push({ name: "tmpExp_n" });
        dom = "n";
    } else if (execPart == "step3prev") {
        execInfo.inputSections.push({ name: "cm1_n" });
        execInfo.inputSections.push({ name: "cm2_n" });
        execInfo.inputSections.push({ name: "cm3_n" });
        execInfo.inputSections.push({ name: "const_n" });
        execInfo.inputSections.push({ name: "x_n" });
        execInfo.outputSections.push({ name: "cm3_n" });
        execInfo.outputSections.push({ name: "tmpExp_n" });
        dom = "n";
    } else if (execPart == "step3") {
        execInfo.inputSections.push({ name: "cm1_n" });
        execInfo.inputSections.push({ name: "cm2_n" });
        execInfo.inputSections.push({ name: "cm3_n" });
        execInfo.inputSections.push({ name: "const_n" });
        execInfo.inputSections.push({ name: "x_n" });
        execInfo.outputSections.push({ name: "cm3_n" });
        execInfo.outputSections.push({ name: "tmpExp_n" });
        dom = "n";
    } else if (execPart == "step42ns") {
        execInfo.inputSections.push({ name: "cm1_2ns" });
        execInfo.inputSections.push({ name: "cm2_2ns" });
        execInfo.inputSections.push({ name: "cm3_2ns" });
        execInfo.inputSections.push({ name: "const_2ns" });
        execInfo.inputSections.push({ name: "x_2ns" });
        execInfo.outputSections.push({ name: "q_2ns" });
        dom = "2ns";
    } else {
        throw new Error("Exec type not defined" + execPart);
    }

    function setWidth(section) {
        if ((section.name == "const_n") || (section.name == "const_2ns")) {
            section.width = fflonkInfo.nConstants;
        } else if (typeof fflonkInfo.mapSectionsN[section.name] != "undefined") {
            section.width = fflonkInfo.mapSectionsN[section.name];
        } else if (["x_n", "x_2ns"].indexOf(section.name) >= 0 ) {
            section.width = 1;
        }  else if (["q_2ns"].indexOf(section.name) >= 0 ) {
            section.width = fflonkInfo.qDim;
        } else {
            throw new Error("Invalid section name "+ section.name);
        }
    }
    for (let i=0; i<execInfo.inputSections.length; i++) setWidth(execInfo.inputSections[i]);
    for (let i=0; i<execInfo.outputSections.length; i++) setWidth(execInfo.outputSections[i]);

    const cFirst = compileCode(ctx, code.first, dom);

    const n = dom === "n" ? ctx.N : ctx.NExt;
    const next = 1;
    let nPerThread = Math.floor((n-1)/pool.maxWorkers)+1;
    if (nPerThread>maxNperThread) nPerThread = maxNperThread;
    if (nPerThread<minNperThread) nPerThread = minNperThread;
    const promises = [];
    let res = [];
    for (let i=0; i< n; i+=nPerThread) {
        const curN = Math.min(nPerThread, n-i);
        const ctxIn = {
            curve: ctx.curve,
            n: n,
            nBits: ctx.nBits,
            extendBits: ctx.extendBits,
            next: next,
            evals: ctx.evals,
            publics: ctx.publics,
            challenges: ctx.challenges
        };
        for (let s =0; s<execInfo.inputSections.length; s++) {
            const si = execInfo.inputSections[s];
            ctxIn[si.name] = new BigBuffer((curN+next)*si.width*ctx.Fr.n8);
            const s1 = si.width > 0 ? ctx[si.name].slice(i*si.width*ctx.Fr.n8, (i + curN)*si.width*ctx.Fr.n8) : ctx[si.name];
            for(let j = 0; j < curN*si.width; ++j) {
                ctxIn[si.name].set(s1.slice(j*ctx.Fr.n8, (j+1)*ctx.Fr.n8), j*ctx.Fr.n8);
            }
            const sNext = si.width > 0 ? ctx[si.name].slice( (((i+curN)%n) *si.width)*ctx.Fr.n8, (((i+curN)%n) *si.width + si.width*next)*ctx.Fr.n8) : ctx[si.name];
            for(let j = 0; j < si.width*next; ++j) {
                ctxIn[si.name].set(sNext.slice(j*ctx.Fr.n8, (j+1)*ctx.Fr.n8), (curN*si.width + j)*ctx.Fr.n8);
            }
        }
        if (useThreads) {
            promises.push(pool.exec("fflonkgen_execute", [ctxIn, cFirst, curN, execInfo, execPart, i ,n]));
        } else {
            res.push(await fflonkgen_execute(ctxIn, cFirst, curN, execInfo, execPart, i, n));
        }        
    }
    if (useThreads) {
        res = await Promise.all(promises)
    }
    for (let i=0; i<res.length; i++) {
        for (let s =0; s<execInfo.outputSections.length; s++) {
            const si = execInfo.outputSections[s];
            for(let j = 0; j < res[i][si.name].byteLength/ctx.Fr.n8 - si.width*next; ++j) {
                ctx[si.name].set(res[i][si.name].slice(j*ctx.Fr.n8, (j+1)*ctx.Fr.n8), (i*nPerThread*si.width + j)*ctx.Fr.n8);
            }
        }
    }

}

function compileCode(ctx, code, dom, ret) {
    const body = [];

    const next = 1;
    const N = dom === "n" ? ctx.N : ctx.NExt;

    for (let j=0;j<code.length; j++) {
        const src = [];
        for (k=0; k<code[j].src.length; k++) {
            src.push(getRef(code[j].src[k]));
        }
        let exp;

        switch (code[j].op) {
            case 'add': exp = `ctx.curve.Fr.add(${src[0]}, ${src[1]})`;  break;
            case 'sub': exp = `ctx.curve.Fr.sub(${src[0]}, ${src[1]})`;  break;
            case 'mul': exp = `ctx.curve.Fr.mul(${src[0]}, ${src[1]})`;  break;
            case 'copy': exp = `${src[0]}`;  break;
            default: throw new Error("Invalid op:"+ c[j].op);
        }
        setRef(code[j].dest, exp);
    }

    console.log(body);
    if (ret) {
        body.push(`  return ${getRef(code[code.length-1].dest)};`);
    }

    return body.join("\n");

    function getRef(r) {
        switch (r.type) {
            case "tmp": return `ctx.tmp[${r.id}]`;
            case "const": {
                const index = r.prime ? `(i + ${next})%${N}` : "i"
                if(dom === "n") {
                    return `ctx.const_n.slice((${r.id}*${N} + ${index})*${ctx.Fr.n8},(${r.id}*${N} + ${index} + 1)*${ctx.Fr.n8})`;
                } else if(dom === "2ns") {
                    return `ctx.const_2ns.slice((${r.id}*${N} + ${index})*${ctx.Fr.n8},(${r.id}*${N} + ${index} + 1)*${ctx.Fr.n8})`;
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "cm": {
                if(dom === "n") {
                    return evalMap(ctx.fflonkInfo.cm_n[r.id], r.prime)
                } else if(dom === "2ns") {
                    return evalMap(ctx.fflonkInfo.cm_2ns[r.id], r.prime)
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "tmpExp": {
                if(dom === "n") {
                    return evalMap(ctx.fflonkInfo.tmpExp_n[r.id], r.prime)
                } else {
                    throw new Error("Invalid dom"); 
                }
            }
            case "number": {
                return `ctx.curve.Fr.e(${r.value}n)`;
            }
            case "public": return `ctx.publics[${r.id}]`;
            case "challenge": return `ctx.challenges[${r.id}]`;
            case "eval": return `ctx.evals[${r.id}]`;
            case "x": 
                if (dom=="n") {
                    return `ctx.x_n.slice(i*ctx.Fr.n8, (i+1)*ctx.Fr.n8)`;
                } else if (dom=="2ns") {
                    return `ctx.x_2ns.slice(i*ctx.Fr.n8, (i+1)*ctx.Fr.n8)`;
                } else {
                    throw new Error("Invalid dom");
                }
            case "Zi": return `ctx.Zi(i)`;
            default: throw new Error("Invalid reference type get: " + r.type);
        }
    }

    function setRef(r, val) {
        switch (r.type) {
            case "tmp": {
                body.push(`  ctx.tmp[${r.id}] = ${val};`);
                break;
            }
            case "q":
                if (dom=="n") {
                    throw new Error("Accessing q in domain n");
                } else if (dom=="2ns") {
                    body.push(`  ctx.q_2ns.set(${val}, i*${ctx.Fr.n8})`);
                }
                break;
            case "cm":
                if (dom=="n") {
                    body.push(`  ${evalMap(ctx.fflonkInfo.cm_n[r.id], r.prime, val)};`);
                } else if (dom=="2ns") {
                    body.push(`  ${evalMap(ctx.fflonkInfo.cm_2ns[r.id], r.prime, val)};`);
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            case "tmpExp":
                if (dom=="n") {
                    body.push(`  ${evalMap(ctx.fflonkInfo.tmpExp_n[r.id], r.prime, val)};`);
                } else if (dom=="2ns") {
                    throw new Error("Invalid dom");
                }
                break;
            default: throw new Error("Invalid reference type set: " + r.type);
        }
    }

    function evalMap(polId, prime, setValue) {
        let p = ctx.fflonkInfo.varPolMap[polId];
        offset = p.sectionPos;
        let index = prime ? `(i + ${next})%${N}` : "i";
        if(setValue) {
            return `ctx.${p.section}.set(${setValue},(${offset}*${N} + ${index})*${ctx.Fr.n8})`;
        } else {
            return `ctx.${p.section}.slice((${offset}*${N} + ${index})*${ctx.Fr.n8},(${offset}*${N} + ${index} + 1)*${ctx.Fr.n8})`;
        }
        
    }
}

const BigBufferHandler = {
    get: function(obj, prop) {
        if (!isNaN(prop)) {
            return obj.getElement(prop);
        } else return obj[prop];
    },
    set: function(obj, prop, value) {
        if (!isNaN(prop)) {
            return obj.setElement(prop, value);
        } else {
            obj[prop] = value;
            return true;
        }
    }
};

function ctxProxy(ctx) {

    const pCtx = {};

    createProxy("cm1_n");
    createProxy("cm2_n");
    createProxy("cm3_n");
    createProxy("cm4_n");
    createProxy("cm1_2ns");
    createProxy("cm2_2ns");
    createProxy("cm3_2ns");
    createProxy("tmpExp_n");
    createProxy("const_n");
    createProxy("const_2ns");
    createProxy("q_2ns");
    createProxy("x_n");
    createProxy("x_2ns");


    pCtx.curve = ctx.curve;
    pCtx.publics = ctx.publics;
    pCtx.challenges = ctx.challenges;

    pCtx.nBits = ctx.nBits;
    pCtx.N = ctx.N;
    pCtx.fflonkInfo = ctx.fflonkInfo;
    pCtx.tmp = ctx.tmp;
    pCtx.Fr = ctx.Fr;
    pCtx.evals = ctx.evals;
    pCtx.Zi = ctx.Zi;

    return pCtx;

    function createProxy(section) {
        if (ctx[section]) {
            pCtx[section] = new Proxy(ctx[section], BigBufferHandler);
        }
    }
}

function setPol(ctx, fflonkInfo, idPol, pol) {
    const p = getPolRef(ctx, fflonkInfo, idPol);
    for (let i=0; i<p.deg; i++) {
        p.buffer.set(pol[i], (p.offset * ctx.N + i) * ctx.Fr.n8);
    }
}


function getPolRef(ctx, fflonkInfo, idPol) {
    let p = fflonkInfo.varPolMap[idPol];
    let polRef = {
        buffer: ctx[p.section],
        deg: fflonkInfo.mapDeg[p.section],
        offset: p.sectionPos,
        size: fflonkInfo.mapSectionsN[p.section],
        dim: p.dim
    };
    return polRef;
}

function getPol(ctx, fflonkInfo, idPol) {
    const p = getPolRef(ctx, fflonkInfo, idPol);
    const res = new Array(p.deg);
    for (let i=0; i<p.deg; i++) {
    res[i] = p.buffer.slice((p.offset * ctx.N + i) * ctx.Fr.n8, (p.offset * ctx.N + i + 1) * ctx.Fr.n8)
    }
    return res;
}
