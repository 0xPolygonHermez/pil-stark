
const assert = require("assert");
const TranscriptBN128 = require("../../helpers/transcript/transcript.bn128");
const { buildZhInv, calculateH1H2, calculateZ } = require("../../helpers/polutils.js");
const buildPoseidonBN128 = require("circomlibjs").buildPoseidon;
const _ = require("json-bigint");
const workerpool = require("workerpool");
const {BigBuffer} = require("pilcom");
const fflonkInfoGen = require("./fflonk_info.js");
const { Proof } = require("./proof");
const {CHALLENGE_U, CHALLENGE_DEFVAL, CHALLENGE_BETA, CHALLENGE_GAMMA, CHALLENGE_ALPHA, CHALLENGE_XI, CHALLENGE_V,
    CHALLENGE_VP
} = require("./expressionops");
const { fflonkgen_execute } = require("./fflonk_prover_worker");
const Keccak256Transcript = require("shplonkjs/src/Keccak256Transcript");

const parallelExec = true;
const useThreads = true;
const maxNperThread = 1<<18;
const minNperThread = 1<<12;


module.exports = async function fflonkProve(pilFile, pilConfigFile, cmPols, constPols, options) {
    const F = options.F;
  
    const transcript = new Keccak256Transcript(curve);

    const poseidonBN128 = await buildPoseidonBN128();
    let arity = options.arity || 16;
    let custom = options.custom || false;
    console.log(`Arity: ${arity}, Custom: ${custom}`);
    const transcript2 = new TranscriptBN128(poseidonBN128, arity);

    // PIL compile
    const pil = await compile(F, pilFile, null, pilConfigFile);

    const fflonkInfo = fflonkInfoGen(pil);

    const ctx = {}
    ctx.F = F;

    const pool = workerpool.pool(__dirname + '/fflonk_gen_worker.js');

    ctx.nBits = fflonkInfo.power;
    ctx.N = 1 << fflonkInfo.power;
    ctx.fflonkInfo = fflonkInfo;
    ctx.tmp = [];
    ctx.challenges = [];
    let nCm = fflonkInfo.nCm1;

    ctx.cm1_n = new BigBuffer(fflonkInfo.mapSectionsN.cm1_n*ctx.N);
    cmPols.writeToBigBuffer(ctx.cm1_n, 0);
    ctx.cm2_n = new BigBuffer(fflonkInfo.mapSectionsN.cm2_n*ctx.N);
    ctx.cm3_n = new BigBuffer(fflonkInfo.mapSectionsN.cm3_n*ctx.N);
    ctx.cm4_n = new BigBuffer(fflonkInfo.mapSectionsN.cm3_n*ctx.N);
    ctx.tmpExp_n = new BigBuffer(fflonkInfo.mapSectionsN.tmpExp_n*ctx.N);
    ctx.q_n = new BigBuffer(fflonkInfo.qDim*ctx.N);
    ctx.f_n = new BigBuffer(3*ctx.N);
    ctx.x_n = new BigBuffer(N);

    let xx = F.one;
    for (let i=0; i<N; i++) {
        ctx.x_n.setElement(i, xx);
        xx = F.mul(xx, F.w[nBits])
    }

    // Build ZHInv
    const zhInv = buildZhInv(F, nBits, nBits);
    ctx.Zi = zhInv;

    ctx.const_n = new BigBuffer(fflonkInfo.nConstants*ctx.N);
    constPols.writeToBigBuffer(ctx.const_n, 0);

    ctx.publics = [];

    let proof = new Proof(curve, logger);

    // ROUND 1. Commits to the committed polynomials
    await round1(ctx, curve, pTau, cnstPols, cmmtPols, pil, proof, logger);

    // ROUND 2. Build h1 & h2 polynomials from the plookups
    await round2(ctx, pool, fflonkInfo, F, curve, proof, transcript, logger);

    // ROUND 3. Build the Z polynomial from each non-identity constraint
    await round3(ctx, pool, fflonkInfo, F, curve, proof, transcript2, logger);

    // ROUND 4. Build the constraint polynomial C
    await round4(ctx, pool, fflonkInfo, F, curve, proof, transcript2, logger);

    async function round1(ctx, curve, pTau, cmmtPols, logger) {
        //TODO blind polynomial??????
        for (let i = 0; i < cmmtPols.$$nPols; i++) {
            let name = cmmtPols.$$defArray[i].name.replace("Compressor.", "").replace("Global.", "");
            if(cmmtPols.$$defArray[i].idx >= 0) name += cmmtPols.$$defArray[i].idx;
            const cmmtPolBuffer = cmmtPols.$$array[i];
    
            if (logger) {
                logger.info(`Preparing ${name} polynomial`);
            }
    
            let polEvalBuff = new BigBuffer(cmmtPolBuffer.length * curve.Fr.n8);
            for (let i = 0; i < cmmtPolBuffer.length; i++) {
                polEvalBuff.set(curve.Fr.e(cmmtPolBuffer[i]), i * curve.Fr.n8);
            }
            ctx[name] = await Polynomial.fromEvaluations(polEvalBuff, curve, logger);
        }
        
        const commits = await commit(1, zkey, ctx, pTau, curve, logger);

        return 0;
    }

    async function round2(ctx, pool, fflonkInfo, F, curve, proof, transcript, logger) {
        for (const polName in polynomials) {
            transcript.appendPolCommitment(proof.polynomials[polName]);
        }
        ctx.challenges[CHALLENGE_U] = transcript.getChallenge(); // u
        ctx.challenges[CHALLENGE_DEFVAL] = transcript.getChallenge(); // defVal

        if (parallelExecution) {
            await calculateExpsParallel(pool, ctx, "step2prev", fflonkInfo);
        } else {
            calculateExps(ctx, fflonkInfo.step2prev, "n");
        }

        for (let i = 0; i < fflonkInfo.puCtx.length; i++) {
            const puCtx = fflonkInfo.puCtx[i];
            const fPol = getPol(ctx, fflonkInfo, fflonkInfo.exps_n[puCtx.fExpId]);
            const tPol = getPol(ctx, fflonkInfo, fflonkInfo.exps_n[puCtx.tExpId]);
            const [h1, h2] = calculateH1H2(F, fPol, tPol);
            ctx.h1 = h1;
            ctx.h2 = h2;
           
            //Commit H1 & H2
            const commits = await commit(2, zkey, ctx, PTau, curve, logger);
        }
    }

    async function round3(ctx, pool, starkInfo, F, curve, proof, transcript, logger) {
        //TODO appenmd H1 & H2 polynomials...
        ctx.challenges[CHALLENGE_BETA] = transcript.getField(); // gamma
        ctx.challenges[CHALLENGE_GAMMA] = transcript.getField(); // betta

        if (parallelExecution) {
            await calculateExpsParallel(pool, ctx, "step3prev", starkInfo);
        } else {
            calculateExps(ctx, starkInfo.step3prev, "n");
        }

        let c = 0;
        for (let i = 0; i < starkInfo.puCtx.length; i++) {
            console.log(`Calculating z for plookup ${i}`);
            const pu = starkInfo.puCtx[i];
            const pNum = getPol(ctx, starkInfo, starkInfo.exps_n[pu.numId]);
            const pDen = getPol(ctx, starkInfo, starkInfo.exps_n[pu.denId]);
            const z = calculateZ(F, pNum, pDen);
            ctx[`Z${c++}`] = z;
        }
        for (let i = 0; i < starkInfo.peCtx.length; i++) {
            console.log(`Calculating z for permutation check ${i}`);
            const pe = starkInfo.peCtx[i];
            const pNum = getPol(ctx, starkInfo, starkInfo.exps_n[pe.numId]);
            const pDen = getPol(ctx, starkInfo, starkInfo.exps_n[pe.denId]);
            const z = calculateZ(F, pNum, pDen);
            ctx[`Z${c++}`] = z;
        }
        for (let i = 0; i < starkInfo.ciCtx.length; i++) {
            console.log(`Calculating z for connection ${i}`);
            const ci = starkInfo.ciCtx[i];
            const pNum = getPol(ctx, starkInfo, starkInfo.exps_n[ci.numId]);
            const pDen = getPol(ctx, starkInfo, starkInfo.exps_n[ci.denId]);
            const z = calculateZ(F, pNum, pDen);
            ctx[`Z${c++}`] = z;
        }

        // TODO commit Zs
        const commits = await commit(3, zkey, ctx, PTau, curve, logger);

        return 0;
    }

    async function round4(ctx, pool, starkInfo, F, curve, proof, transcript, logger) {
        // Sample quotient challenge alpha ∈ F_p
        ctx.challenges[CHALLENGE_ALPHA] = transcript.getField();

        // Computes the quotient polynomials q(X) ∈ F(X)
        if (parallelExecution) {
            await calculateExpsParallel(pool, ctx, "step4", starkInfo);
        } else {
            calculateExps(ctx, starkInfo.step4, "n");
        }

        if (parallelExecution) {
            await calculateExpsParallel(pool, ctx, "step42ns", starkInfo);
        } else {
            calculateExps(ctx, starkInfo.step42ns, "2ns");
        }

        //TODO commit Q
    }

    async function calculateExpsParallel(pool, ctx, execPart, starkInfo) {

        let dom;
        let code = starkInfo[execPart];
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
            execInfo.inputSections.push({ name: "cm1_n" });
            execInfo.inputSections.push({ name: "cm2_n" });
            execInfo.inputSections.push({ name: "cm3_n" });
            execInfo.inputSections.push({ name: "const_n" });
            execInfo.inputSections.push({ name: "x_n" });
            execInfo.outputSections.push({ name: "q_n" });
            dom = "n";
        } else {
            throw new Error("Exec type not defined" + execPart);
        }
    
        function setWidth(section) {
            if ((section.name == "const_n") || (section.name == "const_2ns")) {
                section.width = starkInfo.nConstants;
            } else if (typeof starkInfo.mapSectionsN[section.name] != "undefined") {
                section.width = starkInfo.mapSectionsN[section.name];
            } else if (["x_n", "x_2ns"].indexOf(section.name) >= 0 ) {
                section.width = 1;
            } else if (["xDivXSubXi", "xDivXSubWXi","f_2ns"].indexOf(section.name) >= 0 ) {
                section.width = 3;
            } else if (["q_2ns"].indexOf(section.name) >= 0 ) {
                section.width = starkInfo.qDim;
            } else {
                throw new Error("Invalid section name "+ section.name);
            }
        }
        for (let i=0; i<execInfo.inputSections.length; i++) setWidth(execInfo.inputSections[i]);
        for (let i=0; i<execInfo.outputSections.length; i++) setWidth(execInfo.outputSections[i]);
    
    
        const cFirst = compileCode(ctx, code.first, dom);
        const cI = compileCode(ctx, code.i, dom);
        const cLast = compileCode(ctx, code.last, dom);
    
        const n = dom=="n" ? ctx.N : ctx.Next;
        const next = dom=="n" ? 1 : 1<< (ctx.nBitsExt - ctx.nBits);
        let nPerThread = Math.floor((n-1)/pool.maxWorkers)+1;
        if (nPerThread>maxNperThread) nPerThread = maxNperThread;
        if (nPerThread<minNperThread) nPerThread = minNperThread;
        const promises = [];
        let res = [];
        for (let i=0; i< n; i+=nPerThread) {
            const curN = Math.min(nPerThread, n-i);
            const ctxIn = {
                n: n,
                nBits: ctx.nBits,
                extendBits: (ctx.nBitsExt - ctx.nBits),
                next: next,
                evals: ctx.evals,
                publics: ctx.publics,
                challenges: ctx.challenges
            };
            for (let s =0; s<execInfo.inputSections.length; s++) {
                const si = execInfo.inputSections[s];
                ctxIn[si.name] = new BigUint64Array((curN+next)*si.width);
                const s1 = ctx[si.name].slice(i*si.width, (i + curN)*si.width);
                ctxIn[si.name].set(s1);
                const sNext = ctx[si.name].slice( ((i+curN)%n) *si.width, ((i+curN)%n) *si.width + si.width*next);
                ctxIn[si.name].set(sNext, curN*si.width);
            }
            if (useThreads) {
                promises.push(pool.exec("fflonkgen_execute", [ctxIn, cFirst, cI, cLast, curN, execInfo, execPart, i ,n]));
            } else {
                res.push(await fflonkgen_execute(ctxIn, cFirst, cI, cLast, curN, execInfo, execPart, i, n));
            }
        }
        if (useThreads) {
            res = await Promise.all(promises)
        }
        for (let i=0; i<res.length; i++) {
            for (let s =0; s<execInfo.outputSections.length; s++) {
                const si = execInfo.outputSections[s];
                const b = new BigUint64Array(res[i][si.name].buffer, res[i][si.name].byteOffset, res[i][si.name].length-si.width*next );
                ctx[si.name].set(b , i*nPerThread*si.width);
            }
        }
    
    }

    function getPrimePolynomials(exp) {
        if (Array.isArray(exp)) {
            let primePolynomials = [];
            for (let i = 0; i < exp.length; i++) {
                primePolynomials = primePolynomials.concat(getPrimePolynomials(exp[i]));
            }
            return primePolynomials;
        } else if (exp.hasOwnProperty("values")) {
            return getPrimePolynomials(exp.values);
        } else {
            if (exp.next && ("const" === exp.op || "cm" === exp.op)) {
                return [exp];
            }
            return [];
        }
    }
    
}
