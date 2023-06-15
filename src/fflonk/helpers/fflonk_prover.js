const {BigBuffer, utils} = require("ffjavascript");
const { Polynomial, commit, Keccak256Transcript, lcm } = require("shplonkjs");
const workerpool = require("workerpool");
const { fflonkgen_execute } = require("./fflonk_prover_worker");
const { calculateH1H2, calculateZ } = require("../../helpers/polutils");
const { open } = require("shplonkjs");

const { interpolate, ifft, fft } = require("../../helpers/fft/fft_p.bn128");
const { PILFFLONK_PROTOCOL_ID } = require("../zkey/zkey_constants");

const parallelExec = false;
const useThreads = false;
const maxNperThread = 1 << 18;
const minNperThread = 1 << 12;

const { stringifyBigInts } = utils;

module.exports = async function fflonkProve(zkey, cmPols, cnstPols, fflonkInfo, options) {
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

    ctx.N = 1 << zkey.power;
    ctx.nBits = zkey.power;
    ctx.extendBits = Math.ceil(Math.log2(fflonkInfo.qDeg + 1));
    ctx.nBitsExt = zkey.power + ctx.extendBits;
    ctx.Next = (1 << ctx.nBitsExt);

    ctx.challenges = [];

    const domainSize = ctx.N;
    const domainSizeExt = ctx.Next;
    const power = zkey.power;
    const n8r = Fr.n8;
    const sDomain = domainSize * n8r;
    const sDomainExt = domainSizeExt * n8r;

    if (logger) {
        logger.debug("-----------------------------");
        logger.debug("  PIL-FFLONK PROVE SETTINGS");
        logger.debug(`  Curve:         ${curve.name}`);
        logger.debug(`  Domain size:   ${domainSize} (2^${power})`);
        logger.debug(`  Extended Bits:   ${ctx.extendBits}`);
        logger.debug(`  Domain size ext: ${domainSizeExt} (2^${power + ctx.extendBits})`);
        logger.debug(`  Const  pols:   ${fflonkInfo.nConstants}`);
        logger.debug(`  Step 1 pols:   ${fflonkInfo.mapSectionsN.cm1_n}`);
        logger.debug(`  Step 2 pols:   ${fflonkInfo.mapSectionsN.cm2_n}`);
        logger.debug(`  Step 3 pols:   ${fflonkInfo.mapSectionsN.cm3_n}`);
        logger.debug(`  Step 4 pols:   ${fflonkInfo.mapSectionsN.cm4_n}`);
        logger.debug(`  Temp exp pols: ${fflonkInfo.mapSectionsN.tmpExp_n}`);
        logger.debug("-----------------------------");
    }

    // Global counter
    let nCm = 0;

    // Reserve big buffers for the polynomial evaluations
    ctx.const_n = new BigBuffer(fflonkInfo.nConstants * sDomain); // Constant polynomials
    ctx.cm1_n = new BigBuffer(fflonkInfo.mapSectionsN.cm1_n * sDomain);
    ctx.cm2_n = new BigBuffer(fflonkInfo.mapSectionsN.cm2_n * sDomain);
    ctx.cm3_n = new BigBuffer(fflonkInfo.mapSectionsN.cm3_n * sDomain);
    ctx.cm4_n = new BigBuffer(fflonkInfo.mapSectionsN.cm4_n * sDomain);
    ctx.tmpExp_n = new BigBuffer(fflonkInfo.mapSectionsN.tmpExp_n * sDomain); // Expression polynomials
    ctx.x_n = new BigBuffer(sDomain); // Omegas de field extension

    // Reserve big buffers for the polynomial coefficients
    ctx.const_coefs = new BigBuffer(fflonkInfo.nConstants * sDomain); // Constant polynomials
    ctx.cm1_coefs = new BigBuffer(fflonkInfo.mapSectionsN.cm1_n * sDomain * 2);
    ctx.cm2_coefs = new BigBuffer(fflonkInfo.mapSectionsN.cm2_n * sDomain);
    ctx.cm3_coefs = new BigBuffer(fflonkInfo.mapSectionsN.cm3_n * sDomain);

    // Reserve big buffers for the polynomial evaluations in the extended
    ctx.const_2ns = new BigBuffer(fflonkInfo.nConstants * sDomainExt);
    ctx.cm1_2ns = new BigBuffer(fflonkInfo.mapSectionsN.cm1_n * sDomainExt * 2);
    ctx.cm2_2ns = new BigBuffer(fflonkInfo.mapSectionsN.cm2_n * sDomainExt);
    ctx.cm3_2ns = new BigBuffer(fflonkInfo.mapSectionsN.cm3_n * sDomainExt);
    ctx.q_2ns = new BigBuffer(fflonkInfo.qDim * sDomainExt * 2);

    ctx.cm1_2ns_z  = new BigBuffer(fflonkInfo.mapSectionsN.cm1_n * sDomainExt);
    ctx.cm2_2ns_z = new BigBuffer(fflonkInfo.mapSectionsN.cm2_n * sDomainExt);
    ctx.cm3_2ns_z = new BigBuffer(fflonkInfo.mapSectionsN.cm3_n * sDomainExt);
    ctx.q_2ns_z = new BigBuffer(fflonkInfo.qDim * sDomainExt);

    ctx.x_2ns = new BigBuffer(sDomainExt); // Omegas a l'extès


    let w = Fr.one;
    for (let i = 0; i < domainSize; i++) {
        const i_n8r = i * n8r;

        ctx.x_n.set(w, i_n8r);
        w = Fr.mul(w, Fr.w[power])
    }

    w = Fr.one;
    for (let i=0; i< domainSizeExt; i++) {
        const i_n8r = i * n8r;

        ctx.x_2ns.set(w, i_n8r);
        w = Fr.mul(w, Fr.w[ctx.nBitsExt]);
    }
       

    const committedPols = {};

    const transcript = new Keccak256Transcript(curve);

    if (logger) logger.debug("");

    const pool = workerpool.pool(__dirname + '/fflonk_prover_worker.js');

    // Generate random blinding scalars ∈ F
    const randomBlinding = {}
    for(let i = 0; i < zkey.f.length; ++i) {
        for(let j = 0; j < zkey.f[i].stages.length; ++j) {
            if(zkey.f[i].stages[j].stage > 0 && zkey.f[i].stages[j].stage < 4) {
                for(let k = 0; k < zkey.f[i].stages[j].pols.length; ++k) {
                    const polName = zkey.f[i].stages[j].pols[k].name;
                    if(!randomBlinding[polName]) randomBlinding[polName] = 1;
                    randomBlinding[polName] += 1;
                }
            }
        }
    }

    const totalBlindings = Object.values(randomBlinding).reduce((curr, acc) => acc + curr, 0);

    ctx.challenges.b = [];
    for (let i = 0; i < totalBlindings; i++) {
        ctx.challenges.b[i] = Fr.random();
    }

    let bIndex = 0;

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
    
    const [cmts, evaluations,xiSeed] = await open(zkey, PTau, ctx, committedPols, curve, {logger, fflonkPreviousChallenge: ctx.challenges[4], nonCommittedPols: ["Q"]});

    // Compute xiSeed 
    const powerW = lcm(Object.keys(zkey).filter(k => k.match(/^w\d+$/)).map(wi => wi.slice(1)));

    let challengeXi = curve.Fr.exp(xiSeed, powerW);

    const xN = curve.Fr.exp(challengeXi, ctx.N);
    const Z = curve.Fr.sub(xN, curve.Fr.one);   

    evaluations.invZh = curve.Fr.inv(Z);

    await pool.terminate();
   
    let proof = {polynomials: {}, evaluations: {}};
    proof.protocol = "pilfflonk";
    proof.curve = curve.name;
    Object.keys(cmts).forEach(key => {
        proof.polynomials[key] = ctx.curve.G1.toObject(cmts[key]);
    });

    Object.keys(evaluations).forEach(key => {
        proof.evaluations[key] = ctx.curve.Fr.toObject(evaluations[key]);
    });

    proof = stringifyBigInts(proof);

    // Prepare public inputs
    let publicSignals = stringifyBigInts(ctx.publics.map(p => ctx.curve.Fr.toObject(p)));

    return {
        proof,
        publicSignals,
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
        
        //Compute extended evals
        if(fflonkInfo.nConstants > 0) {
            await interpolate(ctx.const_n, fflonkInfo.nConstants, ctx.nBits, ctx.const_coefs, ctx.const_2ns, ctx.nBitsExt, Fr, false);
            for (let i = 0; i < cnstPols.$$nPols; i++) {

                const name = cnstPols.$$defArray[i].name;
                if (cnstPols.$$defArray[i].idx >= 0) name += cnstPols.$$defArray[i].idx;
    
                if (logger) logger.debug(`··· Preparing ${name} constant polynomial`);
                
                 // Get coefs
                const coefs = getPolBuffer(ctx, fflonkInfo, i, {constants: true, coefs: true});
            
                // Define polynomial
                ctx[name] = new Polynomial(coefs, curve, logger);
            }
    
            const commitsConstants = await commit(0, zkey, ctx, PTau, curve, { multiExp: false, logger });
    
            for (let j = 0; j < commitsConstants.length; ++j) {
                committedPols[`${commitsConstants[j].index}`] = { pol:commitsConstants[j].pol };
            }
        }

        //Compute extended evals
        if(!fflonkInfo.mapSectionsN.cm1_n) {
            if(logger) logger.debug("··· !!! No committed polynomials to compute...skipping round 1");
            return;
        }

        await ifft(ctx.cm1_n, cmPols.$$nPols, ctx.nBits, ctx.cm1_coefs, Fr);

        for (let i = 0; i < cmPols.$$nPols; i++) {
            let name = cmPols.$$defArray[i].name;
            if (cmPols.$$defArray[i].idx >= 0) name += cmPols.$$defArray[i].idx;

            blindPolynomial(ctx.cm1_coefs, name, i, cmPols.$$nPols, domainSize, Fr);
        }
        
        await fft(ctx.cm1_coefs, cmPols.$$nPols, ctx.nBits + 2, ctx.cm1_2ns, Fr);

        for (let i = 0; i < cmPols.$$nPols; i++) {
            let name = cmPols.$$defArray[i].name;
            if (cmPols.$$defArray[i].idx >= 0) name += cmPols.$$defArray[i].idx;

            if (logger) logger.debug(`··· Preparing '${name}' polynomial`);

            // Get coefs
            const coefs = getPolBuffer(ctx, fflonkInfo, fflonkInfo.cm_n[nCm], {coefs: true, zk:true});
        
            // Define polynomial
            ctx[name] = new Polynomial(coefs, curve, logger);

            nCm += 1;
        }    

        const commits1 = await commit(1, zkey, ctx, PTau, curve, { multiExp: true, logger });
        for (let j = 0; j < commits1.length; ++j) {
            committedPols[`${commits1[j].index}`] = { commit: commits1[j].commit, pol: commits1[j].pol };
        }

        function blindPolynomial(buff, polName, idPol, nPols, domainSize, Fr) {
            const nPolOpenings = zkey.polsOpenings[polName];
            for(let i = 0; i < nPolOpenings; i++) {
                const b = ctx.challenges.b[bIndex++];
                blindBuffer(buff, i, idPol, nPols, Fr.neg(b), Fr);
                blindBuffer(buff, domainSize + i, idPol, nPols, b, Fr);
            }        
        
            function blindBuffer(buff, idx, idPol, nPols, blindingFactor, Fr) {
                const offset = (idx * nPols + idPol) * Fr.n8;
                const val = buff.slice(offset, offset + Fr.n8);
        
                buff.set(Fr.add(val, blindingFactor), offset);
            }
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

        await callCalculateExps("step2prev", "n", pool, ctx, fflonkInfo, false, logger);

        let nCm2 = nCm;

        for (let i = 0; i < fflonkInfo.puCtx.length; i++) {
            const puCtx = fflonkInfo.puCtx[i];

            const fPol = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[puCtx.fExpId]);
            const tPol = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[puCtx.tExpId]);

            const [h1, h2] = calculateH1H2(Fr, fPol, tPol);
            setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm+1], h1);
            setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm+2], h2);

            nCm += 2;
        }

        // Compute extended evals
        await interpolate(ctx.cm2_n, fflonkInfo.mapSectionsN.cm2_n, ctx.nBits, ctx.cm2_coefs, ctx.cm2_2ns, ctx.nBitsExt, Fr, false);

        for (let i = 0; i < fflonkInfo.puCtx.length; i++) {
            // Compute polynomial coefficients
            const coefs1  = getPolBuffer(ctx, fflonkInfo, fflonkInfo.cm_n[nCm2++], {coefs: true});
            ctx[`Plookup.H1_${i}`] = new Polynomial(coefs1, curve, logger);

            const coefs2  = getPolBuffer(ctx, fflonkInfo, fflonkInfo.cm_n[nCm2++], {coefs: true});
            ctx[`Plookup.H2_${i}`] = new Polynomial(coefs2, curve, logger);
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

        await callCalculateExps("step3prev", "n", pool, ctx, fflonkInfo, false, logger);

        let nCm3 = nCm;

        for (let i = 0; i < nPlookups; i++) {
            if (logger) logger.debug(`··· Calculating z for plookup ${i}`);

            const pu = fflonkInfo.puCtx[i];
            const pNum = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[pu.numId]);
            const pDen = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[pu.denId]);
            const z = await calculateZ(Fr, pNum, pDen);

            setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm], z);

            nCm+=1;
        }

        for (let i = 0; i < nPermutations; i++) {
            if (logger) logger.debug(`··· Calculating z for permutation check ${i}`);

            const pe = fflonkInfo.peCtx[i];
            const pNum = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[pe.numId]);
            const pDen = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[pe.denId]);
            const z = await calculateZ(Fr, pNum, pDen);

            setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm], z);
            nCm+=1;
        }

        for (let i = 0; i < nConnections; i++) {
            if (logger)
                logger.debug(`··· Calculating z for connection ${i}`);

            const ci = fflonkInfo.ciCtx[i];
            const pNum = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[ci.numId]);
            const pDen = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[ci.denId]);
            const z = await calculateZ(Fr, pNum, pDen);

            setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm], z);
            nCm+=1;
        }

        await callCalculateExps("step3", "n", pool, ctx, fflonkInfo, false, logger);

        await interpolate(ctx.cm3_n, fflonkInfo.mapSectionsN.cm3_n, ctx.nBits, ctx.cm3_coefs, ctx.cm3_2ns, ctx.nBitsExt, Fr, false);

        for (let i = 0; i < nPlookups; i++) {
            // Compute polynomial coefficients
            const coefs = getPolBuffer(ctx, fflonkInfo, fflonkInfo.cm_n[nCm3++], {coefs:true});
            ctx[`Plookup.Z${i}`] = new Polynomial(coefs, curve, logger);
        }

        for (let i = 0; i < nPermutations; i++) {
            // Compute polynomial coefficients
            const coefs = getPolBuffer(ctx, fflonkInfo, fflonkInfo.cm_n[nCm3++], {coefs:true});
            ctx[`Permutation.Z${i}`] = new Polynomial(coefs, curve, logger);
        }

        for (let i = 0; i < nConnections; i++) {
            // Compute polynomial coefficients
            const coefs = getPolBuffer(ctx, fflonkInfo, fflonkInfo.cm_n[nCm3++], {coefs:true});
            ctx[`Connection.Z${i}`] = new Polynomial(coefs, curve, logger);
        }

        for(let i = 0; i < fflonkInfo.imExpsList.length; ++i) {
            const coefs = getPolBuffer(ctx, fflonkInfo, fflonkInfo.cm_n[nCm3++], {coefs:true});
            ctx[`Im${fflonkInfo.imExpsList[i]}`] = new Polynomial(coefs, curve, logger);
        }

        const commits3 = await commit(3, zkey, ctx, PTau, curve, { multiExp: true, logger });
        for (let j = 0; j < commits3.length; ++j) {
            committedPols[`${commits3[j].index}`] = { commit: commits3[j].commit, pol: commits3[j].pol };
        }
    }

    async function round4() {

        transcript.reset();

        if (logger) logger.debug("> Computing challenge a");

        // Compute challenge a
        transcript.addScalar(ctx.challenges[3]);

        ctx.challenges[4] = transcript.getChallenge();
        if (logger) logger.debug("··· challenges.a: " + Fr.toString(ctx.challenges[4]));

        console.log("q_2ns");
        printPol(ctx.q_2ns, Fr);
        await callCalculateExps("step42ns", "2ns", pool, ctx, fflonkInfo, logger, true);
//        await callCalculateExps("step42ns", "2ns_z", pool, ctx, fflonkInfo, logger);
        printPol(ctx.q_2ns, Fr);

        ctx["Q"] = await Polynomial.fromEvaluations(ctx.q_2ns, curve, logger);
        printPol(ctx.Q.coef, Fr);
        ctx["Q"].divZh(ctx.N, (1<<(ctx.extendBits+1)));
        printPol(ctx["Q"].coef, Fr);

        const commits4 = await commit(4, zkey, ctx, PTau, curve, { multiExp: true, logger });
        for (let j = 0; j < commits4.length; ++j) {
            committedPols[`${commits4[j].index}`] = { commit: commits4[j].commit, pol: commits4[j].pol };
        }
    }

    async function callCalculateExps(step, dom, pool, ctx, fflonkInfo, logger, zk) {
        if (parallelExec) {
            await calculateExpsParallel(pool, ctx, step, fflonkInfo, zk);
        } else {
            calculateExps(ctx, fflonkInfo[step], dom, logger, zk);
        }
    }
}


function calculateExps(ctx, code, dom, logger, zk) {
    ctx.tmp = new Array(code.tmpUsed);

    cFirst = new Function("ctx", "i", compileCode(ctx, code.first, dom));

    let N = dom === "n" ? ctx.N : ctx.Next;
    if(zk) N = N * 2;
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

async function calculateExpsParallel(pool, ctx, execPart, fflonkInfo, zk) {

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
        if(zk) {
            execInfo.inputSections.push({ name: "cm1_2ns_z" });
            execInfo.inputSections.push({ name: "cm2_2ns_z" });
            execInfo.inputSections.push({ name: "cm3_2ns_z" });
            execInfo.inputSections.push({ name: "const_2ns" });
            execInfo.inputSections.push({ name: "x_2ns" });
            execInfo.outputSections.push({ name: "q_2ns_z" });
            dom = "2ns_z";
        } else {
            execInfo.inputSections.push({ name: "cm1_2ns" });
            execInfo.inputSections.push({ name: "cm2_2ns" });
            execInfo.inputSections.push({ name: "cm3_2ns" });
            execInfo.inputSections.push({ name: "const_2ns" });
            execInfo.inputSections.push({ name: "x_2ns" });
            execInfo.outputSections.push({ name: "q_2ns" });
            dom = "2ns";

        }
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
        } else {
            throw new Error("Invalid section name "+ section.name);
        }
    }
    for (let i=0; i<execInfo.inputSections.length; i++) setWidth(execInfo.inputSections[i]);
    for (let i=0; i<execInfo.outputSections.length; i++) setWidth(execInfo.outputSections[i]);

    const cFirst = compileCode(ctx, code.first, dom);

    const n = dom === "n" ? ctx.N : ctx.Next;
    const next = dom === "n" ? 1 : (1 << ctx.extendBits);
    let nPerThread = Math.floor((n-1)/pool.maxWorkers)+1;
    if (nPerThread>maxNperThread) nPerThread = maxNperThread;
    if (nPerThread<minNperThread) nPerThread = minNperThread;
    const promises = [];
    let res = [];
    for (let i=0; i< n; i+=nPerThread) {
        const curN = Math.min(nPerThread, n-i);
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
        for (let s =0; s<execInfo.inputSections.length; s++) {
            const si = execInfo.inputSections[s];
            ctxIn[si.name] = new BigBuffer((curN+next)*si.width*ctx.Fr.n8);
            const s1 = si.width > 0 ? ctx[si.name].slice(i*si.width*ctx.Fr.n8, (i + curN)*si.width*ctx.Fr.n8) : ctx[si.name];
            ctxIn[si.name].set(s1, 0);
            const sNext = si.width > 0 ? ctx[si.name].slice( (((i+curN)%n) *si.width)*ctx.Fr.n8, (((i+curN)%n) *si.width + si.width*next)*ctx.Fr.n8) : ctx[si.name];
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
            const b = si.width > 0 ? res[i][si.name].slice(0, res[i][si.name].byteLength - si.width*next*ctx.Fr.n8) : res[i][si.name];
            ctx[si.name].set(b, i*nPerThread*si.width*ctx.Fr.n8);
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
            case 'add': exp = `ctx.Fr.add(${src[0]}, ${src[1]})`;  break;
            case 'sub': exp = `ctx.Fr.sub(${src[0]}, ${src[1]})`;  break;
            case 'mul': exp = `ctx.Fr.mul(${src[0]}, ${src[1]})`;  break;
            case 'copy': exp = `${src[0]}`;  break;
            default: throw new Error("Invalid op:"+ c[j].op);
        }
        setRef(code[j].dest, exp);
    }

    if (ret) {
        body.push(`  return ${getRef(code[code.length-1].dest)};`);
    }

    console.log(body);
    return body.join("\n");

    function getRef(r) {
        switch (r.type) {
            case "tmp": return `ctx.tmp[${r.id}]`;
            case "const": {
                const index = r.prime ? `((i + ${Next})%${N})` : "i"
                if(dom === "n") {
                    return `ctx.const_n.slice((${r.id} + ${index} * ${ctx.fflonkInfo.nConstants})*${ctx.Fr.n8}, (${r.id} + ${index} * ${ctx.fflonkInfo.nConstants} + 1)*${ctx.Fr.n8})`;
                } else if(dom === "2ns" || dom === "2ns_z") {
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
                } else if(dom === "2ns_z") {
                    return evalMap(ctx.fflonkInfo.cm_2ns_z[r.id], r.prime)
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
                return `ctx.Fr.e(${r.value}n)`;
            }
            case "public": return `ctx.publics[${r.id}]`;
            case "challenge": return `ctx.challenges[${r.id}]`;
            case "eval": return `ctx.evals[${r.id}]`;
            case "x": 
                if (dom=="n") {
                    return `ctx.x_n.slice(i*${ctx.Fr.n8}, (i+1)*${ctx.Fr.n8})`;
                } else if (dom === "2ns" || dom === "2ns_z") {
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
                if (dom=="n") {
                    throw new Error("Accessing q in domain n");
                } else if (dom=="2ns") {
                    body.push(`  ctx.q_2ns.set(${val}, i*${ctx.Fr.n8})`);
                } else if (dom === "2ns_z") {
                    body.push(`  ctx.q_2ns_z.set(${val}, i*${ctx.Fr.n8})`);
                }
                break;
            case "cm":
                if (dom=="n") {
                    body.push(`  ${evalMap(ctx.fflonkInfo.cm_n[r.id], r.prime, val)};`);
                } else if (dom=="2ns") {
                    body.push(`  ${evalMap(ctx.fflonkInfo.cm_2ns[r.id], r.prime, val)};`);
                } else if (dom=="2ns_z") {
                    body.push(`  ${evalMap(ctx.fflonkInfo.cm_2ns_z[r.id], r.prime, val)};`);
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            case "tmpExp":
                if (dom=="n") {
                    body.push(`  ${evalMap(ctx.fflonkInfo.tmpExp_n[r.id], r.prime, val)};`);
                } else if (dom=="2ns" || dom === "2ns_z") {
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
    createProxy("cm1_2ns_z");
    createProxy("cm2_2ns_z");
    createProxy("cm3_2ns_z");
    createProxy("q_2ns_z");
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
    for (let i=0; i<p.deg; i++) {
        res[i] = p.buffer.slice((p.offset + i*p.size) * ctx.Fr.n8, (p.offset + i*p.size + 1) * ctx.Fr.n8);
    }
    return res;
}

function getPolBuffer(ctx, fflonkInfo, idPol, options = {constants: false, coefs: false, zk: false}) {
    const p = options.constants 
        ? {buffer: options.coefs ? ctx.const_coefs : ctx.const_n, deg: ctx.N, offset: idPol, size: fflonkInfo.nConstants} 
        : getPolRef(ctx, fflonkInfo, idPol, options.coefs);
    const zkFactor = options.zk ? 2 : 1;
    const res = new BigBuffer(p.deg * zkFactor * ctx.Fr.n8);

    for (let i=0; i<p.deg * zkFactor; i++) {
        res.set(p.buffer.slice((p.offset + i*p.size) * ctx.Fr.n8, (p.offset + i*p.size + 1) * ctx.Fr.n8), i*ctx.Fr.n8);
    }
    return res;
}

function printPol(buffer, Fr) {
    const len = buffer.byteLength / Fr.n8;

    console.log("---------------------------");
    for(let i = 0; i < len; ++i) {
        console.log(i, Fr.toString(buffer.slice(i * Fr.n8, (i + 1) * Fr.n8)));
    }
    console.log("---------------------------");
}
