const { BigBuffer, utils } = require("ffjavascript");
const { Polynomial, Keccak256Transcript, commit, open } = require("shplonkjs");
const workerpool = require("workerpool");
const { fflonkgen_execute } = require("./fflonk_prover_worker");
const { calculateH1H2, calculateZ } = require("../../helpers/polutils");

const { ifft, fft } = require("../../helpers/fft/fft_p.bn128");
const { PILFFLONK_PROTOCOL_ID } = require("../zkey/zkey_constants");

const parallelExec = true;
const useThreads = false;
const maxNperThread = 1 << 18;
const minNperThread = 1 << 12;

const { stringifyBigInts } = utils;

module.exports = async function fflonkProve(zkey, cmPols, fflonkInfo, options) {
    const logger = options.logger;

    if (logger) logger.info("PIL-FFLONK PROVER STARTED");

    if (zkey.protocolId !== PILFFLONK_PROTOCOL_ID) {
        throw new Error("zkey file is not fflonk");
    }

    const curve = zkey.curve;

    PTau = zkey.pTau;

    const Fr = curve.Fr;

    const ctx = {};
    ctx.fflonkInfo = fflonkInfo;
    ctx.curve = curve;
    ctx.Fr = curve.Fr;

    ctx.extendBits = Math.ceil(Math.log2(fflonkInfo.qDeg + 1));

    ctx.nBits = zkey.power;
    ctx.nBitsCoefs = zkey.power + fflonkInfo.nBitsZK;
    ctx.nBitsExt = zkey.power + ctx.extendBits + fflonkInfo.nBitsZK;

    ctx.extendBitsTotal = (ctx.nBitsExt - ctx.nBits);

    ctx.N = 1 << ctx.nBits;
    ctx.NCoefs = 1 << ctx.nBitsCoefs;
    ctx.Next = (1 << ctx.nBitsExt);

    ctx.challenges = [0,0,0,0,0];

    const domainSize = ctx.N;
    const domainSizeCoefs = ctx.NCoefs;
    const domainSizeExt = ctx.Next;

    const power = zkey.power;
    const n8r = Fr.n8;

    const sDomain = domainSize * n8r;
    const sDomainCoefs = domainSizeCoefs * n8r;
    const sDomainExt = domainSizeExt * n8r;

    const domainSizeQ = fflonkInfo.qDeg * domainSize + fflonkInfo.maxPolsOpenings * 2 + 1;
    const nQ = zkey.maxQDegree ? Math.ceil(domainSizeQ / (zkey.maxQDegree * domainSize)) : 1;

    if (logger) {
        logger.debug("-----------------------------");
        logger.debug("  PIL-FFLONK PROVE SETTINGS");
        logger.debug(`  Curve:         ${curve.name}`);
        logger.debug(`  Domain size:   ${domainSize} (2^${power})`);
        logger.debug(`  Domaize size coefs: ${domainSizeCoefs} (2^${ctx.nBitsCoefs})`);
        logger.debug(`  Domain size ext: ${domainSizeExt} (2^${ctx.nBitsExt})`);
        logger.debug(`  ExtendBits: ${ctx.extendBitsTotal}`);
        logger.debug(`  Const  pols:   ${fflonkInfo.nConstants}`);
        logger.debug(`  Stage 1 pols:   ${fflonkInfo.mapSectionsN.cm1_n}`);
        logger.debug(`  Stage 2 pols:   ${fflonkInfo.mapSectionsN.cm2_n}`);
        logger.debug(`  Stage 3 pols:   ${fflonkInfo.mapSectionsN.cm3_n}`);
        logger.debug(`  Stage 4 pols:   ${nQ}`);
        logger.debug(`  Temp exp pols: ${fflonkInfo.mapSectionsN.tmpExp_n}`);
        logger.debug("-----------------------------");
    }

    // Reserve big buffers for the polynomial evaluations
    ctx.const_n = new BigBuffer(fflonkInfo.nConstants * sDomain); // Constant polynomials
    ctx.cm1_n = new BigBuffer(fflonkInfo.mapSectionsN.cm1_n * sDomain);    
    ctx.cm2_n = new BigBuffer(fflonkInfo.mapSectionsN.cm2_n * sDomain);
    ctx.cm3_n = new BigBuffer(fflonkInfo.mapSectionsN.cm3_n * sDomain);
    ctx.tmpExp_n = new BigBuffer(fflonkInfo.mapSectionsN.tmpExp_n * sDomain); // Expression polynomials
    ctx.x_n = new BigBuffer(sDomain); // Omegas de field extension

    // Reserve big buffers for the polynomial coefficients
    ctx.const_coefs = new BigBuffer(fflonkInfo.nConstants * sDomain); // Constant polynomials
    ctx.cm1_coefs = new BigBuffer(fflonkInfo.mapSectionsN.cm1_n * sDomainCoefs);
    ctx.cm2_coefs = new BigBuffer(fflonkInfo.mapSectionsN.cm2_n * sDomainCoefs);
    ctx.cm3_coefs = new BigBuffer(fflonkInfo.mapSectionsN.cm3_n * sDomainCoefs);

    // Reserve big buffers for the polynomial evaluations in the extended
    ctx.const_2ns = new BigBuffer(fflonkInfo.nConstants * sDomainExt);
    ctx.cm1_2ns = new BigBuffer(fflonkInfo.mapSectionsN.cm1_n * sDomainExt);
    ctx.cm2_2ns = new BigBuffer(fflonkInfo.mapSectionsN.cm2_n * sDomainExt);
    ctx.cm3_2ns = new BigBuffer(fflonkInfo.mapSectionsN.cm3_n * sDomainExt);
    ctx.q_2ns = new BigBuffer(fflonkInfo.qDim * sDomainExt);
    ctx.x_2ns = new BigBuffer(sDomainExt); // Omegas a l'extès

    // Read committed polynomials
    await cmPols.writeToBigBufferFr(ctx.cm1_n, Fr);

    // Read const coefs and extended evals
    ctx.const_n.set(zkey.constPolsEvals);
    ctx.const_coefs.set(zkey.constPolsCoefs);
    ctx.const_2ns.set(zkey.constPolsEvalsExt);

    // Read x_n and x_2ns
    ctx.x_n.set(zkey.x_n);
    ctx.x_2ns.set(zkey.x_2ns);

    const committedPols = {};

    let commitsStage1 = [];
    let commitsStage2 = [];
    let commitsStage3 = [];
    let commitsStage4 = [];

    const nonCommittedPols = [];

    const transcript = new Keccak256Transcript(curve);

    if (logger) logger.debug("");

    const pool = workerpool.pool(__dirname + '/fflonk_prover_worker.js');

    // STAGE 0. Compute Publics and store constants
    await stage0();

    // STAGE 1. Compute Trace Column Polynomials
    if (logger) logger.debug("> STAGE 1. Compute Trace Column Polynomials");
    await stage1();

    // STAGE 2. Compute Inclusion Polynomials
    await stage2();

    // STAGE 3. Compute Grand Product and Intermediate Polynomials
    await stage3();

    // STAGE 4. Trace Quotient Polynomials
    if (logger) logger.debug("> STAGE 4. Compute Trace Quotient Polynomials");
    await stage4();


    // STEP 5.1 - Compute challenge xi Seed
    transcript.reset();

    if (logger) logger.debug("> Computing challenge xi seed");

    // Compute challenge a
    transcript.addScalar(ctx.challenges[4]);

    for(let i = 0; i < commitsStage4.length; i++) {
        transcript.addPolCommitment(commitsStage4[i].commit);
    }

    const challengeXiSeed = transcript.getChallenge();
    if (logger) logger.debug("··· challenges.xiSeed: " + Fr.toString(challengeXiSeed));

    const [cmts, evaluations] = await open(zkey, PTau, ctx, committedPols, curve, { logger, xiSeed: challengeXiSeed, nonCommittedPols});

    if(logger) logger.debug("··· Batched Inverse shplonk: " + Fr.toString(evaluations["inv"]));
    // Compute challengeXiSeed 
    let challengeXi = curve.Fr.exp(challengeXiSeed, zkey.powerW);

    const xN = curve.Fr.exp(challengeXi, ctx.N);
    const Z = curve.Fr.sub(xN, curve.Fr.one);

    if(logger) logger.debug("··· Z: " + Fr.toString(Z));

    evaluations.invZh = curve.Fr.inv(Z);

    if(logger) logger.debug("··· invZh: " + Fr.toString(evaluations.invZh));


    await pool.terminate();

    let proof = { polynomials: {}, evaluations: {} };
    proof.protocol = "pilfflonk";
    proof.curve = curve.name;
    Object.keys(cmts).forEach(key => {
        proof.polynomials[key] = ctx.curve.G1.toObject(cmts[key]);
    });

    Object.keys(evaluations).forEach(key => {
        if (key !== "Q") proof.evaluations[key] = ctx.curve.Fr.toObject(evaluations[key]);
    });

    proof = stringifyBigInts(proof);

    // Prepare public inputs
    let publicSignals = stringifyBigInts(ctx.publics.map(p => ctx.curve.Fr.toObject(p)));

    return {
        proof,
        publicSignals,
    };

    async function stage0() {
        // Add constant composed polynomials
        if (fflonkInfo.nConstants > 0) {
            for (let i = 0; i < fflonkInfo.nConstants; i++) {
                const coefs = getPolFromBuffer(ctx.const_coefs, fflonkInfo.nConstants, ctx.NCoefs, i, Fr);
                ctx[zkey.polsNamesStage[0][i]] = new Polynomial(coefs, ctx.curve, logger);
            }
            
            const cnstCommitPols = Object.keys(zkey).filter(k => k.match(/^f\d/));
            for (let i = 0; i < cnstCommitPols.length; ++i) {
                const commit = zkey[cnstCommitPols[i]].commit;
                const pol = new Polynomial(zkey[cnstCommitPols[i]].pol, curve, logger);
                console.log(cnstCommitPols[i], curve.G1.toString(commit));
                transcript.addPolCommitment(commit);
                committedPols[`${cnstCommitPols[i]}_0`] = { commit: commit, pol: pol };
            }
        }

        // Calculate publics
        ctx.publics = [];
        for (let i = 0; i < fflonkInfo.publics.length; i++) {
            const publicPol = fflonkInfo.publics[i];

            if ("cmP" === publicPol.polType) {
                const offset = (fflonkInfo.publics[i].idx * fflonkInfo.mapSectionsN.cm1_n + fflonkInfo.publics[i].polId) * n8r;
                ctx.publics[i] = ctx.cm1_n.slice(offset, offset + n8r);
            } else if ("imP" === publicPol.polType) {
                ctx.publics[i] = calculateExpAtPoint(ctx, fflonkInfo.publicsCode[i], publicPol.idx);
            } else {
                throw new Error(`Invalid public type: ${polType.type}`);
            }
        }


        // Add all the publics to the transcript
        for (let i = 0; i < fflonkInfo.publics.length; i++) {
            transcript.addScalar(ctx.publics[i]);
        }
    }

    async function stage1() {
        // STEP 1.3 - Compute commit polynomials (coefficients + evaluations) and commit them
        if (!fflonkInfo.mapSectionsN.cm1_n) return;

        await extend(1, ctx, zkey, fflonkInfo.mapSectionsN.cm1_n, Fr, logger);

        // STEP 1.4 - Commit stage 1 polynomials
        commitsStage1 = await commit(1, zkey, ctx, PTau, curve, { multiExp: true, logger });
        commitsStage1.forEach((com) => committedPols[`${com.index}`] = { commit: com.commit, pol: com.pol });

        commitsStage1.forEach((com) => console.log(com.index, ctx.curve.G1.toString(com.commit)));

        for(let i = 0; i < commitsStage1.length; i++) {
            transcript.addPolCommitment(commitsStage1[i].commit);
        }
    }

    async function stage2() {
        if(!fflonkInfo.mapSectionsN.cm2_n && fflonkInfo.peCtx.length === 0) return;

        if (logger) logger.debug("> Computing challenges alpha and beta");

        // Compute challenge alpha
        ctx.challenges[0] = transcript.getChallenge();
        if (logger) logger.debug("··· challenges.alpha: " + Fr.toString(ctx.challenges[0]));

        // Compute challenge beta
        transcript.reset();
        transcript.addScalar(ctx.challenges[0]);
        ctx.challenges[1] = transcript.getChallenge();
        transcript.reset();
        transcript.addScalar(ctx.challenges[1]);
        if (logger) logger.debug("··· challenges.beta: " + Fr.toString(ctx.challenges[1]));        

        if (!fflonkInfo.mapSectionsN.cm2_n) return;

        if (logger) logger.debug("> STAGE 2. Compute Inclusion Polynomials");

        // STEP 2.2 - Compute stage 2 polynomials --> h1, h2
        await callCalculateExps("step2prev", "n", pool, ctx, fflonkInfo, false, { logger });

        let nCm2 = fflonkInfo.mapSectionsN.cm1_n;

        for (let i = 0; i < fflonkInfo.puCtx.length; i++) {
            const puCtx = fflonkInfo.puCtx[i];

            const fPol = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[puCtx.fExpId]);
            const tPol = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[puCtx.tExpId]);

            const [h1, h2] = calculateH1H2(Fr, fPol, tPol);
            setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm2 + 2 * i], h1);
            setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm2 + 2 * i + 1], h2);
        }

        await extend(2, ctx, zkey, fflonkInfo.mapSectionsN.cm2_n, Fr, logger);

        // STEP 2.3 - Commit stage 2 polynomials
        commitsStage2 = await commit(2, zkey, ctx, PTau, curve, { multiExp: true, logger });
        commitsStage2.forEach((com) => committedPols[`${com.index}`] = { commit: com.commit, pol: com.pol });

        commitsStage2.forEach((com) => console.log(com.index, ctx.curve.G1.toString(com.commit)));

        // STEP 2.4 - Add to transcript
        for(let i = 0; i < commitsStage2.length; i++) {
            transcript.addPolCommitment(commitsStage2[i].commit);
        }
    }

    async function stage3() {
        if (!fflonkInfo.mapSectionsN.cm3_n) return;

        if (logger) logger.debug("> STAGE 3. Compute Grand Product and Intermediate Polynomials");

        // Compute challenge gamma
        ctx.challenges[2] = transcript.getChallenge();
        if (logger) logger.debug("··· challenges.gamma: " + Fr.toString(ctx.challenges[2]));

        // Compute challenge delta
        transcript.reset();
        transcript.addScalar(ctx.challenges[2]);
        ctx.challenges[3] = transcript.getChallenge();
        transcript.reset();
        if (logger) logger.debug("··· challenges.delta: " + Fr.toString(ctx.challenges[3]));


        // STEP 3.2 - Compute stage 3 polynomials --> Plookup Z, Permutations Z & ConnectionZ polynomials
        const nPlookups = fflonkInfo.puCtx.length;
        const nPermutations = fflonkInfo.peCtx.length;
        const nConnections = fflonkInfo.ciCtx.length;

        await callCalculateExps("step3prev", "n", pool, ctx, fflonkInfo, false, {logger});

        let nCm3 = fflonkInfo.mapSectionsN.cm1_n + fflonkInfo.mapSectionsN.cm2_n;

        for (let i = 0; i < nPlookups; i++) {
            if (logger) logger.debug(`··· Calculating z for plookup ${i}`);

            const pu = fflonkInfo.puCtx[i];
            const pNum = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[pu.numId]);
            const pDen = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[pu.denId]);
            const z = await calculateZ(Fr, pNum, pDen);

            setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm3 + i], z);
        }

        for (let i = 0; i < nPermutations; i++) {
            if (logger) logger.debug(`··· Calculating z for permutation check ${i}`);

            const pe = fflonkInfo.peCtx[i];
            const pNum = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[pe.numId]);
            const pDen = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[pe.denId]);
            const z = await calculateZ(Fr, pNum, pDen);

            setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm3 + nPlookups + i], z);
        }

        for (let i = 0; i < nConnections; i++) {
            if (logger)
                logger.debug(`··· Calculating z for connection ${i}`);

            const ci = fflonkInfo.ciCtx[i];
            const pNum = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[ci.numId]);
            const pDen = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[ci.denId]);
            const z = await calculateZ(Fr, pNum, pDen);

            setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm3 + nPlookups + nPermutations + i], z);
        }

        await callCalculateExps("step3", "n", pool, ctx, fflonkInfo, { logger });

        await extend(3, ctx, zkey, fflonkInfo.mapSectionsN.cm3_n, Fr, logger);

        // STEP 3.3 - Commit stage 3 polynomials
        commitsStage3 = await commit(3, zkey, ctx, PTau, curve, { multiExp: true, logger });
        commitsStage3.forEach((com) => committedPols[`${com.index}`] = { commit: com.commit, pol: com.pol });

        commitsStage3.forEach((com) => console.log(com.index, ctx.curve.G1.toString(com.commit)));

        transcript.addScalar(ctx.challenges[3]);

        for(let i = 0; i < commitsStage3.length; i++) {
            transcript.addPolCommitment(commitsStage3[i].commit);
        }
    }

    async function stage4() {
        // STEP 4.1 - Compute random challenges
        if (logger) logger.debug("> Computing challenge a");

        // Compute challenge a
        ctx.challenges[4] = transcript.getChallenge();
        if (logger) logger.debug("··· challenges.a: " + Fr.toString(ctx.challenges[4]));

        // STEP 4.2 - Compute stage 4 polynomial --> Q polynomial
        await callCalculateExps("step42ns", "2ns", pool, ctx, fflonkInfo, { logger });

        ctx["Q"] = await Polynomial.fromEvaluations(ctx.q_2ns, curve, logger);
        ctx["Q"].divZh(ctx.N, 1 << ctx.extendBitsTotal);

        console.log("Q DEGREE", ctx["Q"].degree());

        if(zkey.maxQDegree) {
            const nQ = Math.ceil(domainSizeQ / (zkey.maxQDegree * domainSize));
            // let rand1 = Fr.random();
            // let rand2 = Fr.random();
            let rand1 = Fr.two;
            let rand2 = Fr.e(3);
            for(let i = 0; i < nQ; ++i) {
                const st = (i * zkey.maxQDegree * domainSize) * Fr.n8;
                const end = (i == nQ - 1 ? domainSizeQ : (i + 1) * zkey.maxQDegree * domainSize) * Fr.n8;

                let len = end - st;
                let extLen = i == nQ - 1 ? len : len + 2 * Fr.n8;
                let coefs = new BigBuffer(extLen);
                
                coefs.set(ctx["Q"].coef.slice(st, end));

                // Blind Qi polynomials
                if (i > 0) {
                    coefs.set(Fr.sub(coefs.slice(0, Fr.n8), rand1), 0);
                    coefs.set(Fr.sub(coefs.slice(Fr.n8, 2*Fr.n8), rand2), Fr.n8);
                }

                if (i < nQ - 1) {
                    // rand1 = Fr.random();
                    // rand2 = Fr.random();
                    rand1 = Fr.two;
                    rand2 = Fr.e(3);
                    coefs.set(rand1, len);
                    coefs.set(rand2, len + Fr.n8);
                }
                
                ctx[`Q${i}`] = new Polynomial(coefs, curve, logger);

            } 
        } else {
            nonCommittedPols.push("Q");
        }

        // STEP 4.3 - Commit stage 4 polynomials
        commitsStage4 = await commit(4, zkey, ctx, PTau, curve, { multiExp: true, logger });
        commitsStage4.forEach((com) => committedPols[`${com.index}`] = { commit: com.commit, pol: com.pol });

        commitsStage4.forEach((com) => console.log(com.index, ctx.curve.G1.toString(com.commit)));

    }

    async function callCalculateExps(step, dom, pool, ctx, fflonkInfo, options) {
        if (parallelExec) {
            await calculateExpsParallel(pool, ctx, step, fflonkInfo, options);
        } else {
            calculateExps(ctx, fflonkInfo[step], dom, options);
        }
    }
}


function calculateExps(ctx, code, dom, options = {}) {
    ctx.tmp = new Array(code.tmpUsed);

    cFirst = new Function("ctx", "i", compileCode(ctx, code.first, dom, false));

    const N = dom === "n" ? ctx.N : ctx.Next;

    const pCtx = ctxProxy(ctx);

    for (let i = 0; i < N; i++) {
        if (i !== 0 && (i % 1000) === 0) {
            if (options.logger) options.logger.debug(`··· Calculating expression ${i}/${N}`);
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

async function calculateExpsParallel(pool, ctx, execPart, fflonkInfo, options = { }) {

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
        } else if (["x_n", "x_2ns"].indexOf(section.name) >= 0) {
            section.width = 1;
        } else {
            throw new Error("Invalid section name " + section.name);
        }
    }
    for (let i = 0; i < execInfo.inputSections.length; i++) setWidth(execInfo.inputSections[i]);
    for (let i = 0; i < execInfo.outputSections.length; i++) setWidth(execInfo.outputSections[i]);

    const cFirst = compileCode(ctx, code.first, dom, false);

    const n = dom === "n" ? ctx.N : ctx.Next;
    const next = dom === "n" ? 1 : (1 << ctx.extendBitsTotal);

    let nPerThread = Math.floor((n - 1) / pool.maxWorkers) + 1;
    if (nPerThread > maxNperThread) nPerThread = maxNperThread;
    if (nPerThread < minNperThread) nPerThread = minNperThread;
    const promises = [];
    let res = [];
    for (let i = 0; i < n; i += nPerThread) {
        const curN = Math.min(nPerThread, n - i);
        const ctxIn = {
            Fr: ctx.Fr,
            n: n,
            nBits: ctx.nBits,
            extendBits: ctx.extendBits,
            next: next,
            evals: ctx.evals,
            publics: ctx.publics,
            challenges: ctx.challenges
        };
        for (let s = 0; s < execInfo.inputSections.length; s++) {
            const si = execInfo.inputSections[s];
            ctxIn[si.name] = new BigBuffer((curN + next) * si.width * ctx.Fr.n8);
            const s1 = si.width > 0 ? ctx[si.name].slice(i * si.width * ctx.Fr.n8, (i + curN) * si.width * ctx.Fr.n8) : ctx[si.name];
            ctxIn[si.name].set(s1, 0);
            const sNext = si.width > 0 ? ctx[si.name].slice((((i + curN) % n) * si.width) * ctx.Fr.n8, (((i + curN) % n) * si.width + si.width * next) * ctx.Fr.n8) : ctx[si.name];
            ctxIn[si.name].set(sNext, curN * si.width * ctx.Fr.n8);
        }
        if (useThreads) {
            promises.push(pool.exec("fflonkgen_execute", [ctxIn, cFirst, curN, execInfo, execPart, i, n]));
        } else {
            res.push(await fflonkgen_execute(ctxIn, cFirst, curN, execInfo, execPart, i, n));
        }
    }
    if (useThreads) {
        res = await Promise.all(promises)
    }
    for (let i = 0; i < res.length; i++) {
        for (let s = 0; s < execInfo.outputSections.length; s++) {
            const si = execInfo.outputSections[s];
            const b = si.width > 0 ? res[i][si.name].slice(0, res[i][si.name].byteLength - si.width * next * ctx.Fr.n8) : res[i][si.name];
            ctx[si.name].set(b, i * nPerThread * si.width * ctx.Fr.n8);
        }
    }

}

function compileCode(ctx, code, dom, ret) {
    const body = [];

    const next = dom === "n" ? 1 : (1 << ctx.extendBitsTotal);
    const N = dom === "n" ? ctx.N : ctx.Next;

    for (let j = 0; j < code.length; j++) {
        const src = [];
        for (k = 0; k < code[j].src.length; k++) {
            src.push(getRef(code[j].src[k]));
        }
        let exp;

        switch (code[j].op) {
            case 'add': exp = `ctx.Fr.add(${src[0]}, ${src[1]})`; break;
            case 'sub': exp = `ctx.Fr.sub(${src[0]}, ${src[1]})`; break;
            case 'mul': exp = `ctx.Fr.mul(${src[0]}, ${src[1]})`; break;
            case 'copy': exp = `${src[0]}`; break;
            default: throw new Error("Invalid op:" + c[j].op);
        }
        setRef(code[j].dest, exp);
    }

    if (ret) {
        body.push(`  return ${getRef(code[code.length - 1].dest)};`);
    }

    return body.join("\n");

    function getRef(r) {
        switch (r.type) {
            case "tmp": return `ctx.tmp[${r.id}]`;
            case "const": {
                const index = r.prime ? `((i + ${next})%${N})` : "i"
                if (dom === "n") {
                    return `ctx.const_n.slice((${r.id} + ${index} * ${ctx.fflonkInfo.nConstants})*${ctx.Fr.n8}, (${r.id} + ${index} * ${ctx.fflonkInfo.nConstants} + 1)*${ctx.Fr.n8})`;
                } else if (dom === "2ns") {
                    return `ctx.const_2ns.slice((${r.id} + ${index} * ${ctx.fflonkInfo.nConstants})*${ctx.Fr.n8}, (${r.id} + ${index} * ${ctx.fflonkInfo.nConstants} + 1)*${ctx.Fr.n8})`;

                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "cm": {
                if (dom === "n") {
                    return evalMap(ctx.fflonkInfo.cm_n[r.id], r.prime)
                } else if (dom === "2ns") {
                    return evalMap(ctx.fflonkInfo.cm_2ns[r.id], r.prime)
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "tmpExp": {
                if (dom === "n") {
                    return evalMap(ctx.fflonkInfo.tmpExp_n[r.id], r.prime)
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "number": {
                return `ctx.Fr.e(${r.value}n)`;
            }
            case "public": return `ctx.publics[${r.id}]`;
            case "challenge": return `ctx.challenges[${r.id}]`;
            case "eval": return `ctx.evals[${r.id}]`;
            case "x":
                if (dom == "n") {
                    return `ctx.x_n.slice(i*${ctx.Fr.n8}, (i+1)*${ctx.Fr.n8})`;
                } else if (dom === "2ns") {
                    return `ctx.x_2ns.slice(i*${ctx.Fr.n8}, (i+1)*${ctx.Fr.n8})`;
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
                if (dom == "n") {
                    throw new Error("Accessing q in domain n");
                } else if (dom == "2ns") {
                    body.push(`  ctx.q_2ns.set(${val}, i*${ctx.Fr.n8})`);
                }
                break;
            case "cm":
                if (dom == "n") {
                    body.push(`  ${evalMap(ctx.fflonkInfo.cm_n[r.id], r.prime, val)};`);
                } else if (dom == "2ns") {
                    body.push(`  ${evalMap(ctx.fflonkInfo.cm_2ns[r.id], r.prime, val)};`);
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            case "tmpExp":
                if (dom == "n") {
                    body.push(`  ${evalMap(ctx.fflonkInfo.tmpExp_n[r.id], r.prime, val)};`);
                } else if (dom == "2ns") {
                    throw new Error("Invalid dom");
                }
                break;
            default: throw new Error("Invalid reference type set: " + r.type);
        }
    }

    function evalMap(polId, prime, val) {
        let p = ctx.fflonkInfo.varPolMap[polId];
        offset = p.sectionPos;
        let index = prime ? `((i + ${next})%${N})` : "i";
        let size = ctx.fflonkInfo.mapSectionsN[p.section];
        if (val) {
            return `ctx.${p.section}.set(${val},(${offset} + (${index}*${size}))*${ctx.Fr.n8})`;
        } else {
            return `ctx.${p.section}.slice((${offset} + ${index}*${size})*${ctx.Fr.n8},(${offset} + ${index}*${size} + 1)*${ctx.Fr.n8})`;
        }

    }
}

const BigBufferHandler = {
    get: function (obj, prop) {
        if (!isNaN(prop)) {
            return obj.getElement(prop);
        } else return obj[prop];
    },
    set: function (obj, prop, value) {
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
    createProxy("cm1_2ns");
    createProxy("cm2_2ns");
    createProxy("cm3_2ns");
    createProxy("tmpExp_n");
    createProxy("const_n");
    createProxy("const_2ns");
    createProxy("q_2ns");
    createProxy("x_n");
    createProxy("x_2ns");


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


function setPol(ctx, fflonkInfo, idPol, pol) {
    const p = getPolRef(ctx, fflonkInfo, idPol);
    for (let i = 0; i < p.deg; i++) {
        p.buffer.set(pol[i], (p.offset + i * p.size) * ctx.Fr.n8);
    }
}


function getPolRef(ctx, fflonkInfo, idPol, coefs = false) {
    let p = fflonkInfo.varPolMap[idPol];
    let polRef = {
        buffer: !coefs ? ctx[p.section] : ctx[p.section.split("_")[0] + "_coefs"],
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
    for (let i = 0; i < p.deg; i++) {
        res[i] = p.buffer.slice((p.offset + i * p.size) * ctx.Fr.n8, (p.offset + i * p.size + 1) * ctx.Fr.n8);
    }
    return res;
}

async function extend(stage, ctx, zkey, nPols, Fr, logger) {
    
    const buffFrom = ctx["cm" + stage + "_n"];
    const buffCoefs = ctx["cm" + stage + "_coefs"];
    const buffTo = ctx["cm" + stage + "_2ns"];

    await ifft(buffFrom, nPols, ctx.nBits, buffCoefs, Fr);

    for (let i = 0; i < nPols; i++) {
        let nOpenings = findNumberOpenings(zkey.f, zkey.polsNamesStage[stage][i], stage);
        for(let j = 0; j < nOpenings; ++j) {
            // const b = Fr.random();
            const b = Fr.two;
            let offset1 = (j * nPols + i) * Fr.n8; 
            let offsetN = ((j + ctx.N) * nPols + i) * Fr.n8; 
            buffCoefs.set(Fr.add(buffCoefs.slice(offset1,offset1 + Fr.n8), Fr.neg(b)), offset1);
            buffCoefs.set(Fr.add(buffCoefs.slice(offsetN, offsetN + Fr.n8), b), offsetN);
        }
    }

    // Store coefs to context
    for (let i = 0; i < nPols; i++) {
        const coefs = getPolFromBuffer(buffCoefs, nPols, ctx.NCoefs, i, Fr);
        ctx[zkey.polsNamesStage[stage][i]] = new Polynomial(coefs, ctx.curve, logger);
    }

    await fft(buffCoefs, nPols, ctx.nBitsExt, buffTo, Fr);
}

function getPolFromBuffer(buff, nPols, N, id, Fr) {
    let polBuffer = new BigBuffer(N * Fr.n8);
    for (let j = 0; j < N; j++) {
        polBuffer.set(buff.slice((id + j * nPols) * Fr.n8, (id + j * nPols + 1) * Fr.n8), j * Fr.n8);
    }
    return polBuffer
}


function findNumberOpenings(f, name, stage) {
    for(let i = 0; i < f.length; ++i) {
        if(f[i].stages[0].stage != stage) continue;
        for(let j = 0; j < f[i].pols.length; ++j) {
            if(f[i].pols[j] === name) {
                return f[i].openingPoints.length + 1;
            }
        }
    }
    return 0;
}

function printPol(buffer, Fr) {
    const len = buffer.byteLength / Fr.n8;

    console.log("---------------------------");
    for (let i = 0; i < len; ++i) {
        console.log(i, Fr.toString(buffer.slice(i * Fr.n8, (i + 1) * Fr.n8)));
    }
    console.log("---------------------------");
}


