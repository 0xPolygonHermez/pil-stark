const {BigBuffer} = require("ffjavascript");
const { getPowersOfTau, Polynomial, commit, Keccak256Transcript } = require("shplonkjs");
const workerpool = require("workerpool");
const { fflonkgen_execute } = require("./fflonk_prover_worker");
const { calculateH1H2, calculateZ } = require("../../helpers/polutils");
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
    ctx.extendBits = Math.max(1, Math.ceil(Math.log2(fflonkInfo.qDeg)));
    ctx.nBitsExt = zkey.power + ctx.extendBits;
    ctx.Next = (1 << ctx.nBitsExt);

    const domainSize = ctx.N;
    const domainSizeExt = ctx.Next;
    const power = zkey.power;
    const n8r = Fr.n8;
    const sDomain = domainSize * n8r;
    const sDomainNext = domainSizeExt * n8r;

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
    ctx.const_2ns = new BigBuffer(fflonkInfo.nConstants * sDomainNext);
    ctx.cm1_2ns = new BigBuffer(fflonkInfo.mapSectionsN.cm1_n * sDomainNext);
    ctx.cm2_2ns = new BigBuffer(fflonkInfo.mapSectionsN.cm2_n * sDomainNext);
    ctx.cm3_2ns = new BigBuffer(fflonkInfo.mapSectionsN.cm3_n * sDomainNext);
    ctx.q_2ns = new BigBuffer(fflonkInfo.qDim * sDomainNext);
    ctx.x_2ns = new BigBuffer(sDomainNext); // Omegas a l'extès


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
       

    const committedPols = {};

    const transcript = new Keccak256Transcript(curve);

    if (logger) logger.debug("");

    const pool = workerpool.pool(__dirname + '/fflonk_prover_worker.js');

    // ROUND 0. Store constants and committed values. Calculate publics
    await round0(); 

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
    
    async function round0() {
   
        for (let i = 0; i < cnstPols.$$nPols; i++) {

            const name = cnstPols.$$defArray[i].name;
            if (cnstPols.$$defArray[i].idx >= 0) name += cnstPols.$$defArray[i].idx;

            if (logger) logger.debug(`··· Preparing ${name} constant polynomial`);

            const cnstPolBuffer = cnstPols.$$array[i];
            for (let j = 0; j < cnstPolBuffer.length; j++) {
                ctx.const_n.set(Fr.e(cnstPolBuffer[j]), (i + fflonkInfo.nConstants * j) * n8r);
            }
        }

        for (let i = 0; i < cmPols.$$nPols; i++) {
            let name = cmPols.$$defArray[i].name;
            if (cmPols.$$defArray[i].idx >= 0)
                name += cmPols.$$defArray[i].idx;

            if (logger) logger.debug(`··· Preparing '${name}' polynomial`);

            // Compute polynomial evaluations
            const cmPolBuffer = cmPols.$$array[i];
            for (let j = 0; j < cmPolBuffer.length; j++) {
                ctx.cm1_n.set(Fr.e(cmPolBuffer[j]), (i + j*fflonkInfo.mapSectionsN.cm1_n)*n8r);
            }
        }   
        
        ctx.publics = [];
        for (let i = 0; i < fflonkInfo.publics.length; i++) {
            const publicPol = fflonkInfo.publics[i];
    
            if ("cmP" === publicPol.polType) {
                //const offset = publicPol.polId * sDomain + publicPol.idx * n8r;
                const offset = (fflonkInfo.publics[i].idx * fflonkInfo.mapSectionsN.cm1_n + fflonkInfo.publics[i].polId)*n8r;
                ctx.publics[i] = ctx.cm1_n.slice(offset, offset + n8r);
            } else if ("imP" === publicPol.polType) {
                ctx.publics[i] = calculateExpAtPoint(ctx, fflonkInfo.publicsCode[i], publicPol.idx);
            } else {
                throw new Error(`Invalid public type: ${polType.type}`);
            }
        }
    }

    async function round1() {
        // STEP 1.1 - Compute random challenge
        // Add preprocessed polynomials to the transcript
        
        for (let i = 0; i < cnstPols.$$nPols; i++) {

            const name = cnstPols.$$defArray[i].name;
            if (cnstPols.$$defArray[i].idx >= 0) name += cnstPols.$$defArray[i].idx;

            if (logger) logger.debug(`··· Preparing ${name} constant polynomial`);

            const cnstPolBuffer = cnstPols.$$array[i];
            const evalsBuffer = new BigBuffer(cnstPolBuffer.length * ctx.Fr.n8);
            for (let j = 0; j < cnstPolBuffer.length; j++) {
                evalsBuffer.set(Fr.e(cnstPolBuffer[j]), j * n8r);
            }

            // Compute coefficients
            ctx[name] = await Polynomial.fromEvaluations(evalsBuffer, curve, logger);
            
            // Compute extended evals 
            await extend(ctx, ctx[name].coef, i, sDomainNext, true);
        }

        const commitsConstants = await commit(0, zkey, ctx, PTau, curve, { multiExp: false, logger });

        for (let j = 0; j < commitsConstants.length; ++j) {
            committedPols[`${commitsConstants[j].index}`] = { pol:commitsConstants[j].pol };
        }


        for (let i = 0; i < cmPols.$$nPols; i++) {
            let name = cmPols.$$defArray[i].name;
            if (cmPols.$$defArray[i].idx >= 0)
                name += cmPols.$$defArray[i].idx;

            if (logger) logger.debug(`··· Preparing '${name}' polynomial`);

            // Compute polynomial evaluations
            const cmPolBuffer = cmPols.$$array[i];
            const evalsBuffer = new BigBuffer(cmPolBuffer.length * ctx.Fr.n8);
            for (let j = 0; j < cmPolBuffer.length; j++) {
                evalsBuffer.set(Fr.e(cmPolBuffer[j]), j * n8r);
            }
            
            // Compute polynomial from evaluations
            ctx[name] = await Polynomial.fromEvaluations(evalsBuffer, curve, logger);


            //Compute extended evals
            await extend(ctx, ctx[name].coef, fflonkInfo.mapSections.cm1_2ns[i], sDomainNext);
        }        


        const commits1 = await commit(1, zkey, ctx, PTau, curve, { multiExp: true, logger });
        for (let j = 0; j < commits1.length; ++j) {
            committedPols[`${commits1[j].index}`] = { commit: commits1[j].commit, pol: commits1[j].pol };
        }
    }

    async function round2() {
        if (logger) logger.debug("> Computing challenges alpha and beta");

        const cnstCommitPols = Object.keys(zkey).filter(k => k.match(/^f\d/));
        for(let i = 0; i < cnstCommitPols.length; ++i) {
            transcript.addPolCommitment(zkey[cnstCommitPols[i]]);
            committedPols[`${cnstCommitPols[i]}`].commit = zkey[cnstCommitPols[i]];
        }

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
        
        if(!fflonkInfo.mapSectionsN.cm2_n) {
            if(logger) logger.debug("··· !!! No polynomials to compute...skipping round 2");
            return;
        }

        await callCalculateExps("step2prev", "n", pool, ctx, fflonkInfo, zkey, logger);

        for (let i = 0; i < fflonkInfo.puCtx.length; i++) {
            const puCtx = fflonkInfo.puCtx[i];

            const fPol = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[puCtx.fExpId]);
            const tPol = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[puCtx.tExpId]);

            const [h1, h2] = calculateH1H2(Fr, fPol, tPol);
            setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm], h1);
            setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm+1], h2);

            // Compute polynomial coefficients
            const bufferEvals1  = getPolBuffer(ctx, fflonkInfo, fflonkInfo.cm_n[nCm]);
            ctx[`Plookup.H1_${i}`] = await Polynomial.fromEvaluations(bufferEvals1, curve, logger);

            const bufferEvals2  = getPolBuffer(ctx, fflonkInfo, fflonkInfo.cm_n[nCm+1]);
            ctx[`Plookup.H2_${i}`] = await Polynomial.fromEvaluations(bufferEvals2, curve, logger);

            // Compute extended evals
            await extend(ctx, ctx[`Plookup.H1_${i}`].coef, fflonkInfo.mapSections.cm2_2ns[2*i], sDomainNext);
            await extend(ctx, ctx[`Plookup.H1_${i}`].coef, fflonkInfo.mapSections.cm2_2ns[2*i + 1], sDomainNext);

            nCm += 2;
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

        if(!fflonkInfo.mapSectionsN.cm3_n) {
            if(logger) logger.debug("··· !!! No polynomials to compute...skipping round 3");
            return;
        }

        const nPlookups = fflonkInfo.puCtx.length;
        const nPermutations = fflonkInfo.peCtx.length;
        const nConnections = fflonkInfo.ciCtx.length;

        await callCalculateExps("step3prev", "n", pool, ctx, fflonkInfo, zkey, logger);

        for (let i = 0; i < nPlookups; i++) {
            if (logger) logger.debug(`··· Calculating z for plookup ${i}`);

            const pu = fflonkInfo.puCtx[i];
            const pNum = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[pu.numId]);
            const pDen = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[pu.denId]);
            const z = await calculateZ(Fr, pNum, pDen);

            setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm], z);

            // Compute polynomial coefficients
            const bufferEvals = getPolBuffer(ctx, fflonkInfo, fflonkInfo.cm_n[nCm]);
            ctx[`Plookup.Z${i}`] = await Polynomial.fromEvaluations(bufferEvals, curve, logger);

            // Compute extended evals
            await extend(ctx, ctx[`Plookup.Z${i}`].coef, fflonkInfo.mapSections.cm3_2ns[i], sDomainNext);

            nCm++;
        }

        for (let i = 0; i < nPermutations; i++) {
            if (logger) logger.debug(`··· Calculating z for permutation check ${i}`);

            const pe = fflonkInfo.peCtx[i];
            const pNum = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[pe.numId]);
            const pDen = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[pe.denId]);
            const z = await calculateZ(Fr, pNum, pDen);

            setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm], z);

            // Compute polynomial coefficients
            const bufferEvals = getPolBuffer(ctx, fflonkInfo, fflonkInfo.cm_n[nCm]);
            ctx[`Permutation.Z${i}`] = await Polynomial.fromEvaluations(bufferEvals, curve, logger);

            // Compute extended evals
            await extend(ctx, ctx[`Permutation.Z${i}`].coef, fflonkInfo.mapSections.cm3_2ns[i + nPlookups], sDomainNext);

            nCm++;
        }

        for (let i = 0; i < nConnections; i++) {
            if (logger)
                logger.debug(`··· Calculating z for connection ${i}`);

            const ci = fflonkInfo.ciCtx[i];
            const pNum = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[ci.numId]);
            const pDen = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[ci.denId]);
            const z = await calculateZ(Fr, pNum, pDen);

            setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm], z);

            // Compute polynomial coefficients
            const bufferEvals = getPolBuffer(ctx, fflonkInfo, fflonkInfo.cm_n[nCm]);
            ctx[`Connection.Z${i}`] = await Polynomial.fromEvaluations(bufferEvals, curve, logger);

            // Compute extended evals
            await extend(ctx, ctx[`Connection.Z${i}`].coef, fflonkInfo.mapSections.cm3_2ns[i + nPlookups + nPermutations], sDomainNext);

            nCm++;
        }

        await callCalculateExps("step3", "n", pool, ctx, fflonkInfo, zkey);

        for(let i = 0; i < fflonkInfo.imExpsList.length; ++i) {
            const imPol = getPolBuffer(ctx, fflonkInfo, fflonkInfo.cm_n[nCm]);
            ctx[`Im${fflonkInfo.imExpsList[i]}`] = await Polynomial.fromEvaluations(imPol, curve, logger);

            await extend(ctx, ctx[`Im${fflonkInfo.imExpsList[i]}`].coef, fflonkInfo.mapSections.cm3_2ns[i + nPlookups + nPermutations + nConnections], sDomainNext);
            nCm++;
        }

        const commits3 = await commit(3, zkey, ctx, PTau, curve, { multiExp: true, logger });
        for (let j = 0; j < commits3.length; ++j) {
            committedPols[`${commits3[j].index}`] = { commit: commits3[j].commit, pol: commits3[j].pol };
        }
    }

    function printPol(buffer) {
        const len = buffer.byteLength / n8r;

        console.log("---------------------------");
        for(let i = 0; i < len; ++i) {
            console.log(i, Fr.toString(buffer.slice(i * n8r, (i + 1) * n8r)));
        }
        console.log("---------------------------");
    }

    async function round4() {

        transcript.reset();

        if (logger) logger.debug("> Computing challenge a");

        // Compute challenge a
        transcript.addScalar(ctx.challenges[2]);
        transcript.addScalar(ctx.challenges[3]);
        ctx.challenges[4] = transcript.getChallenge();
        if (logger) logger.debug("··· challenges.a: " + Fr.toString(ctx.challenges[4]));

        await callCalculateExps("step42ns", "2ns", pool, ctx, fflonkInfo, zkey, logger);

        printPol(ctx.q_2ns);
        ctx["Q"] = await Polynomial.fromEvaluations(ctx.q_2ns, curve, logger);
        ctx["Q"].divZh(ctx.N, (1<<ctx.extendBits));

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

    const N = dom === "n" ? ctx.N : ctx.Next;
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

    const n = dom === "n" ? ctx.N : ctx.Next;
    const Next = dom === "n" ? 1 : (1 << ctx.extendBits);
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
            next: Next,
            evals: ctx.evals,
            publics: ctx.publics,
            challenges: ctx.challenges
        };
        for (let s =0; s<execInfo.inputSections.length; s++) {
            const si = execInfo.inputSections[s];
            ctxIn[si.name] = new BigBuffer((curN+Next)*si.width*ctx.Fr.n8);
            const s1 = si.width > 0 ? ctx[si.name].slice(i*si.width*ctx.Fr.n8, (i + curN)*si.width*ctx.Fr.n8) : ctx[si.name];
            ctxIn[si.name].set(s1, ctx.Fr.n8);
            const sNext = si.width > 0 ? ctx[si.name].slice( (((i+curN)%n) *si.width)*ctx.Fr.n8, (((i+curN)%n) *si.width + si.width*Next)*ctx.Fr.n8) : ctx[si.name];
            ctxIn[si.name].set(sNext, curN*si.width*ctx.Fr.n8);
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
            ctx[si.name].set(res[i][si.name], i*nPerThread*si.width*ctx.Fr.n8);
        }
    }

}

function compileCode(ctx, code, dom, ret) {
    const body = [];

    const Next = dom === "n" ? 1 : (1 << ctx.extendBits);
    const N = dom === "n" ? ctx.N : ctx.Next;

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
                const index = r.prime ? `((i + ${Next})%${N})` : "i"
                if(dom === "n") {
                    return `ctx.const_n.slice((${r.id} + ${index} * ${ctx.fflonkInfo.nConstants})*${ctx.Fr.n8}, (${r.id} + ${index} * ${ctx.fflonkInfo.nConstants} + 1)*${ctx.Fr.n8})`;
                } else if(dom === "2ns") {
                    return `ctx.const_2ns.slice((${r.id} + ${index} * ${ctx.fflonkInfo.nConstants})*${ctx.Fr.n8}, (${r.id} + ${index} * ${ctx.fflonkInfo.nConstants} + 1)*${ctx.Fr.n8})`;
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
        let index = prime ? `((i + ${Next})%${N})` : "i";
        let size = ctx.fflonkInfo.mapSectionsN[p.section];
        if(setValue) {
            return `ctx.${p.section}.set(${setValue},(${offset} + (${index}*${size}))*${ctx.Fr.n8})`;
        } else {
            return `ctx.${p.section}.slice((${offset} + (${index}*${size}))*${ctx.Fr.n8},(${offset} + ${index}*${size} + 1)*${ctx.Fr.n8})`;
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

    return pCtx;

    function createProxy(section) {
        if (ctx[section]) {
            pCtx[section] = new Proxy(ctx[section], BigBufferHandler);
        }
    }
}

async function extend(ctx, buffFrom, idPol, sDomainNext, constants) {
    const Fr = ctx.Fr;
    const coefficientsN = new BigBuffer(sDomainNext);
    coefficientsN.set(buffFrom, 0);
    const extendedEvals = await Fr.fft(coefficientsN);
    setPolBuffer(ctx, ctx.fflonkInfo, idPol, extendedEvals, constants);
}

function setPol(ctx, fflonkInfo, idPol, pol) {
    const p = getPolRef(ctx, fflonkInfo, idPol);
    for (let i=0; i<p.deg; i++) {
        p.buffer.set(pol[i], (p.offset + i*p.size) * ctx.Fr.n8);
    }
}


function setPolBuffer(ctx, fflonkInfo, idPol, pol, constants) {
    const p = constants ? {buffer: ctx.const_2ns, deg: ctx.Next, offset: idPol, size: fflonkInfo.nConstants} : getPolRef(ctx, fflonkInfo, idPol);
    for (let i=0; i<p.deg; i++) {
        p.buffer.set(pol.slice(i*ctx.Fr.n8, (i + 1)*ctx.Fr.n8), (p.offset + i*p.size) * ctx.Fr.n8);
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
        res[i] = p.buffer.slice((p.offset + i*p.size) * ctx.Fr.n8, (p.offset + i*p.size + 1) * ctx.Fr.n8);
    }
    return res;
}

function getPolBuffer(ctx, fflonkInfo, idPol) {
    const p = getPolRef(ctx, fflonkInfo, idPol);
    const res = new BigBuffer(p.deg * ctx.Fr.n8);
    for (let i=0; i<p.deg; i++) {
        res.set(p.buffer.slice((p.offset + i*p.size) * ctx.Fr.n8, (p.offset + i*p.size + 1) * ctx.Fr.n8), i*ctx.Fr.n8);
    }
    return res;
}
