const {BigBuffer} = require("ffjavascript");
const { getPowersOfTau, Polynomial, commit, Keccak256Transcript } = require("shplonkjs");
const workerpool = require("workerpool");
const { fflonkgen_execute } = require("./fflonk_prover_worker");
const { calculateH1H2, calculateZ, buildZhInv } = require("../../helpers/polutils");
const { interpolate, ifft, fft } = require("../../helpers/fft/fft_p.js");
const { open } = require("shplonkjs/src/shplonk");

const parallelExec = true;
const useThreads = false;
const maxNperThread = 1<<18;
const minNperThread = 1<<12;

module.exports.fflonkProve = async function fflonkProve(cmPols, cnstPols, fflonkInfo, zkey, ptauFile, options) {
    const logger = options.logger;
   
    const {PTau, curve} = await getPowersOfTau(zkey.f, ptauFile, zkey.power, logger);

    const ctx = {};


    ctx.fflonkInfo = fflonkInfo;
    ctx.challenges = [];
    ctx.curve = curve;

    ctx.N = 1 << zkey.power;
    ctx.nBits = zkey.power;
    let nCm = fflonkInfo.nCm1;
    ctx.const_n = new BigBuffer(fflonkInfo.nConstants * ctx.N * curve.Fr.n8);
    ctx.cm1_n = new BigBuffer(fflonkInfo.mapSectionsN.cm1_n * ctx.N * curve.Fr.n8);
    ctx.cm2_n = new BigBuffer(fflonkInfo.mapSectionsN.cm2_n * ctx.N * curve.Fr.n8);
    ctx.cm3_n = new BigBuffer(fflonkInfo.mapSectionsN.cm3_n * ctx.N * curve.Fr.n8);
    ctx.cm4_n = new BigBuffer(fflonkInfo.mapSectionsN.cm4_n*ctx.N * curve.Fr.n8);
    ctx.tmpExp_n = new BigBuffer(fflonkInfo.mapSectionsN.tmpExp_n * ctx.N * curve.Fr.n8);
    ctx.q_n = new BigBuffer(ctx.N * curve.Fr.n8);
    ctx.x_n = new BigBuffer(ctx.N * curve.Fr.n8);
    let xx = curve.Fr.one;
    for (let i=0; i<ctx.N; i++) {
        ctx.x_n.set(xx, i * curve.Fr.n8);
        xx = curve.Fr.mul(xx, curve.Fr.w[zkey.power])
    }

    // Build ZHInv
    ctx.Zi = buildZhInv(ctx.curve.Fr, zkey.power, 0);
    
    const committedPols = {};

    const transcript = new Keccak256Transcript(curve);

    const cnstCommitPols = Object.keys(zkey).filter(k => k.match(/^f\d/));
    for(let i = 0; i < cnstCommitPols.length; ++i) {
        transcript.addPolCommitment(zkey[cnstCommitPols[i]]);
        committedPols[`${cnstCommitPols[i]}`] = {commit: zkey[cnstCommitPols[i]]};
    }

    for (let i = 0; i < cnstPols.$$nPols; i++) {
        let name = cnstPols.$$defArray[i].name;
        if(cnstPols.$$defArray[i].idx >= 0) name += cnstPols.$$defArray[i].idx;
        const cnstPolBuffer = cnstPols.$$array[i];

        if (logger) {
            logger.info(`Preparing ${name} polynomial`);
        }

        for (let j = 0; j < cnstPolBuffer.length; j++) {
            ctx.const_n.set(curve.Fr.e(cnstPolBuffer[j]), (j + i * ctx.N) * curve.Fr.n8)
        }
        ctx[name] = await Polynomial.fromEvaluations(ctx.const_n.slice(i*ctx.N*curve.Fr.n8, (i+1)*ctx.N*curve.Fr.n8), curve, logger);
    }

   
    const commitsConstants = await commit(0, zkey, ctx, PTau, true, curve, logger);
 
    for(let j = 0; j < commitsConstants.length; ++j) {
        committedPols[`${commitsConstants[j].index}`].pol = commitsConstants[j].pol;
    }

    const pool = workerpool.pool(__dirname + '/fflonk_prover_worker.js');

    // Generate random blinding scalars (b_1, ..., b9) ∈ F
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
    for (let i = 0; i <= totalBlindings; i++) {
        // ctx.challenges.b[i] = ctx.curve.Fr.random();
        ctx.challenges.b[i] = ctx.curve.Fr.one;
    }

    let bIndex = 0;

    for (let i = 0; i < cmPols.$$nPols; i++) {
        let name = cmPols.$$defArray[i].name;
        if(cmPols.$$defArray[i].idx >= 0) name += cmPols.$$defArray[i].idx;
        const cmPolBuffer = cmPols.$$array[i];

        if (logger) {
            logger.info(`Preparing ${name} polynomial`);
        }

        for (let j = 0; j < cmPolBuffer.length; j++) {
            ctx.cm1_n.set(curve.Fr.e(cmPolBuffer[j]), (j + i * ctx.N) * curve.Fr.n8)
        }
        ctx[name] = await Polynomial.fromEvaluations(ctx.cm1_n.slice(i*ctx.N*curve.Fr.n8, (i+1)*ctx.N*curve.Fr.n8), curve, logger);
        if(randomBlinding[name] > 0) {
            const blindingCoefs = [];
            for(let l = 0; l < randomBlinding[name]; ++l) blindingCoefs.push(ctx.challenges.b[bIndex++]); 
                ctx[name].blindCoefficients(blindingCoefs);
            }
        }
        

    const commits1 = await commit(1, zkey, ctx, PTau, true, curve, logger);
    for(let j = 0; j < commits1.length; ++j) {
        committedPols[`${commits1[j].index}`] = {commit: commits1[j].commit, pol: commits1[j].pol}
    }

    ctx.publics = [];
    for (let i=0; i<fflonkInfo.publics.length; i++) {
        if (fflonkInfo.publics[i].polType == "cmP") {
            ctx.publics[i] = ctx.cm1_n.slice((fflonkInfo.publics[i].polId*ctx.N + fflonkInfo.publics[i].idx)*curve.Fr.n8, (fflonkInfo.publics[i].polId*ctx.N + fflonkInfo.publics[i].idx + 1)*curve.Fr.n8);
        } else if (fflonkInfo.publics[i].polType == "imP") {
            ctx.publics[i] = calculateExpAtPoint(ctx, fflonkInfo.publicsCode[i], fflonkInfo.publics[i].idx);
        } else {
            throw new Error(`Invalid public type: ${polType.type}`);
        }
    }
    
    for (let i=0; i<fflonkInfo.publics.length; i++) {
        transcript.addScalar(ctx.publics[i]);
    }

    ctx.challenges[0] = transcript.getChallenge(); // u
    transcript.reset();

    transcript.addScalar(ctx.challenges[0]);
    ctx.challenges[1] = transcript.getChallenge(); // defVal
    transcript.reset();

    if (parallelExec) {
        await calculateExpsParallel(pool, ctx, "step2prev", fflonkInfo);
    } else {
        calculateExps(ctx, fflonkInfo.step2prev, "n");
    } 

    for (let i = 0; i < fflonkInfo.puCtx.length; i++) {
        const puCtx = fflonkInfo.puCtx[i];
        const fPol = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[puCtx.fExpId]);
        const tPol = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[puCtx.tExpId]);
        const [h1, h2] = calculateH1H2(curve.Fr, fPol, tPol);
        for(let i = 0; i < ctx.N; ++i) {
            ctx[`Plookup.H1_${i}`] 
        }
        setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm++], h1);
        setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm++], h2);
    
        ctx[`Plookup.H1_${i}`] = await Polynomial.fromEvaluations(ctx.cm2_n.slice((2*i)*ctx.N*curve.Fr.n8, (2*i + 1)*ctx.N*curve.Fr.n8), curve, logger);
        ctx[`Plookup.H2_${i}`] = await Polynomial.fromEvaluations(ctx.cm2_n.slice((2*i + 1)*ctx.N*curve.Fr.n8, (2*i + 2)*ctx.N*curve.Fr.n8), curve, logger);
        if(randomBlinding[`Plookup.H1_${i}`] > 0) {
            const blindingCoefs = [];
            for(let l = 0; l < randomBlinding[`Plookup.H1_${i}`]; ++l) blindingCoefs.push(ctx.challenges.b[bIndex++]); 
            ctx[`Plookup.H1_${i}`].blindCoefficients(blindingCoefs);
        }
        
        if(randomBlinding[`Plookup.H2_${i}`] > 0) {
            const blindingCoefs = [];
            for(let l = 0; l < randomBlinding[`Plookup.H2_${i}`]; ++l) blindingCoefs.push(ctx.challenges.b[bIndex++]); 
            ctx[`Plookup.H2_${i}`].blindCoefficients(blindingCoefs);
        }
    }
    const commits2 = await commit(2, zkey, ctx, PTau, true, curve, logger);
    for(let j = 0; j < commits2.length; ++j) {
        committedPols[`${commits2[j].index}`] = {commit: commits2[j].commit, pol: commits2[j].pol}
    }

    transcript.addScalar(ctx.challenges[1]);
    ctx.challenges[2] = transcript.getChallenge(); // beta
    transcript.reset();

    transcript.addScalar(ctx.challenges[2]);
    ctx.challenges[3] = transcript.getChallenge(); // gamma
    transcript.reset();

    if (parallelExec) {
        await calculateExpsParallel(pool, ctx, "step3prev", fflonkInfo);
    } else {
        calculateExps(ctx, fflonkInfo.step3prev, "n");
    }

    const nPlookups = fflonkInfo.puCtx.length;
    for (let i=0; i<nPlookups; i++) {
        console.log(`Calculating z for plookup ${i}`);
        const pu = fflonkInfo.puCtx[i];
        const pNum = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[pu.numId]);
        const pDen = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[pu.denId]);
        const z = await calculateZ(curve.Fr,pNum, pDen);
        setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm++], z);
        ctx[`Plookup.Z${i}`] = await Polynomial.fromEvaluations(ctx.cm3_n.slice(i*ctx.N*curve.Fr.n8, (i + 1)*ctx.N*curve.Fr.n8), curve, logger);
        if(randomBlinding[`Plookup.Z${i}`] > 0) {
            const blindingCoefs = [];
            for(let l = 0; l < randomBlinding[`Plookup.Z${i}`]; ++l) blindingCoefs.push(ctx.challenges.b[bIndex++]); 
            ctx[`Plookup.Z${i}`].blindCoefficients(blindingCoefs);
        }
    }


    const nPermutations = fflonkInfo.peCtx.length;
    for (let i=0; i<nPermutations; i++) {
        console.log(`Calculating z for permutation check ${i}`);
        const pe = fflonkInfo.peCtx[i];
        const pNum = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[pe.numId]);
        const pDen = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[pe.denId]);
        const z = await calculateZ(curve.Fr,pNum, pDen);
        setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm++], z);
        ctx[`Permutation.Z${i}`] = await Polynomial.fromEvaluations(ctx.cm3_n.slice((i + nPlookups)*ctx.N*curve.Fr.n8, (i + nPlookups + 1)*ctx.N*curve.Fr.n8), curve, logger);
        if(randomBlinding[`Permutation.Z${i}`] > 0) {
            const blindingCoefs = [];
            for(let l = 0; l < randomBlinding[`Permutation.Z${i}`]; ++l) blindingCoefs.push(ctx.challenges.b[bIndex++]); 
            ctx[`Permutation.Z${i}`].blindCoefficients(blindingCoefs);
        }
    }

    const nConnections = fflonkInfo.ciCtx.length;
    for (let i=0; i<nConnections; i++) {
        console.log(`Calculating z for connection ${i}`);
        const ci = fflonkInfo.ciCtx[i];
        const pNum = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[ci.numId]);
        const pDen = getPol(ctx, fflonkInfo, fflonkInfo.exp2pol[ci.denId]);
        const z = await calculateZ(curve.Fr,pNum, pDen);
        setPol(ctx, fflonkInfo, fflonkInfo.cm_n[nCm++], z);
        ctx[`Connection.Z${i}`] = await Polynomial.fromEvaluations(ctx.cm3_n.slice((i + nPlookups + nPermutations)*ctx.N*curve.Fr.n8, (i + nPlookups + nPermutations + 1)*ctx.N*curve.Fr.n8), curve, logger);
        if(randomBlinding[`Connection.Z${i}`] > 0) {
            const blindingCoefs = [];
            for(let l = 0; l < randomBlinding[`Connection.Z${i}`]; ++l) blindingCoefs.push(ctx.challenges.b[bIndex++]); 
            ctx[`Connection.Z${i}`].blindCoefficients(blindingCoefs);
        }
    }

    const commits3 = await commit(3, zkey, ctx, PTau, true, curve, logger);
    for(let j = 0; j < commits3.length; ++j) {
        committedPols[`${commits3[j].index}`] = {commit: commits3[j].commit, pol: commits3[j].pol}

    }

    if (parallelExec) {
        await calculateExpsParallel(pool, ctx, "step3", fflonkInfo);
    } else {
        calculateExps(ctx, fflonkInfo.step3, "n");
    }


    transcript.addScalar(ctx.challenges[3]);
    ctx.challenges[4] = transcript.getChallenge(); // vc
    transcript.reset();

    if (parallelExec) {
        await calculateExpsParallel(pool, ctx, "step42ns", fflonkInfo);
    } else {
        calculateExps(ctx, fflonkInfo.step42ns, "n");
    }

    //TODO: CONTINUE

    const [cmts, evaluations] = await open(zkey, PTau, ctx, committedPols, curve, logger);

    await pool.terminate();

    return {
        commits: cmts,
        evaluations,
        publics: ctx.publics,
    };    
}


function calculateExps(ctx, code, dom) {
    ctx.tmp = new Array(code.tmpUsed);

    cFirst = new Function("ctx", "i", compileCode(ctx, code.first, dom));

    const N = ctx.N;

    const pCtx = ctxProxy(ctx);

    for (let i=0; i<N; i++) {
        if ((i%1000) == 0) console.log(`Calculating expression.. ${i}/${N}`);
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
async function calculateExpsParallel(pool, ctx, execPart, fflonkInfo) {

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
        execInfo.inputSections.push({ name: "cm1_n" });
        execInfo.inputSections.push({ name: "cm2_n" });
        execInfo.inputSections.push({ name: "cm3_n" });
        execInfo.inputSections.push({ name: "const_n" });
        execInfo.inputSections.push({ name: "x_n" });
        execInfo.outputSections.push({ name: "q_n" });
        execInfo.outputSections.push({ name: "tmpExp_n" });
        dom = "n";
    } else {
        throw new Error("Exec type not defined" + execPart);
    }

    function setWidth(section) {
        if ((section.name == "const_n")) {
            section.width = fflonkInfo.nConstants;
        } else if (typeof fflonkInfo.mapSectionsN[section.name] != "undefined") {
            section.width = fflonkInfo.mapSectionsN[section.name];
        } else if (["x_n"].indexOf(section.name) >= 0 ) {
            section.width = 1;
        }  else if (["q_n"].indexOf(section.name) >= 0 ) {
            section.width = fflonkInfo.qDim;
        } else {
            throw new Error("Invalid section name "+ section.name);
        }
    }
    for (let i=0; i<execInfo.inputSections.length; i++) setWidth(execInfo.inputSections[i]);
    for (let i=0; i<execInfo.outputSections.length; i++) setWidth(execInfo.outputSections[i]);

    const cFirst = compileCode(ctx, code.first, dom);

    const n = ctx.N;
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
            next: next,
            evals: ctx.evals,
            publics: ctx.publics,
            challenges: ctx.challenges
        };
        for (let s =0; s<execInfo.inputSections.length; s++) {
            const si = execInfo.inputSections[s];
            ctxIn[si.name] = new BigBuffer((curN+next)*si.width*ctx.curve.Fr.n8);
            const s1 = si.width > 0 ? ctx[si.name].slice(i*si.width*ctx.curve.Fr.n8, (i + curN)*si.width*ctx.curve.Fr.n8) : ctx[si.name];
            for(let j = 0; j < curN*si.width; ++j) {
                ctxIn[si.name].set(s1.slice(j*ctx.curve.Fr.n8, (j+1)*ctx.curve.Fr.n8), j*ctx.curve.Fr.n8);
            }
            const sNext = si.width > 0 ? ctx[si.name].slice( (((i+curN)%n) *si.width)*ctx.curve.Fr.n8, (((i+curN)%n) *si.width + si.width*next)*ctx.curve.Fr.n8) : ctx[si.name];
            for(let j = 0; j < si.width*next; ++j) {
                ctxIn[si.name].set(sNext.slice(j*ctx.curve.Fr.n8, (j+1)*ctx.curve.Fr.n8), (curN*si.width + j)*ctx.curve.Fr.n8);
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
            for(let j = 0; j < res[i][si.name].byteLength/ctx.curve.Fr.n8 - si.width*next; ++j) {
                ctx[si.name].set(res[i][si.name].slice(j*ctx.curve.Fr.n8, (j+1)*ctx.curve.Fr.n8), (i*nPerThread*si.width + j)*ctx.curve.Fr.n8);
            }
        }
    }

}

function compileCode(ctx, code, dom, ret) {
    const body = [];

    const next = 1;
    const N = ctx.N;

    for (let j=0;j<code.length; j++) {
        const src = [];
        for (k=0; k<code[j].src.length; k++) {
            src.push(getRef(code[j].src[k]));
        }
        let exp;
        // body.push(`console.log("${src[0]} ->",ctx.curve.Fr.toString(${src[1]}))`)
        // body.push(`console.log("${src[1]} ->",ctx.curve.Fr.toString(${src[1]}))`)

        switch (code[j].op) {
            case 'add': exp = `ctx.curve.Fr.add(${src[0]}, ${src[1]})`;  break;
            case 'sub': exp = `ctx.curve.Fr.sub(${src[0]}, ${src[1]})`;  break;
            case 'mul': exp = `ctx.curve.Fr.mul(${src[0]}, ${src[1]})`;  break;
            case 'copy': exp = `${src[0]}`;  break;
            default: throw new Error("Invalid op:"+ c[j].op);
        }
        setRef(code[j].dest, exp);
    }

    // console.log(body);
    // body.push(`console.log("---------------------------")`);
    if (ret) {
        body.push(`  return ${getRef(code[code.length-1].dest)};`);
    }

    return body.join("\n");

    function getRef(r) {
        switch (r.type) {
            case "tmp": return `ctx.tmp[${r.id}]`;
            case "const": {
                const index = r.prime ? `(i + ${next})%${N}` : "i"
                return `ctx.const_n.slice((${r.id}*${N} + ${index})*${ctx.curve.Fr.n8},(${r.id}*${N} + ${index} + 1)*${ctx.curve.Fr.n8})`;
            }
            case "cm": {
                return evalMap(ctx.fflonkInfo.cm_n[r.id], r.prime)
            }
            case "tmpExp": {
                return evalMap(ctx.fflonkInfo.tmpExp_n[r.id], r.prime)
            }
            case "number": {
                return `ctx.curve.Fr.e(${r.value}n)`;
            }
            case "public": return `ctx.publics[${r.id}]`;
            case "challenge": return `ctx.challenges[${r.id}]`;
            case "eval": return `ctx.evals[${r.id}]`;
            case "x": return `ctx.x_n.slice(i*ctx.curve.Fr.n8, (i+1)*ctx.curve.Fr.n8)`;
            case "Zi": return `ctx.Zi(i)`;
            default: throw new Error("Invalid reference type get: " + r.type);
        }
    }

    function setRef(r, val) {
        switch (r.type) {
            case "tmp": {
                body.push(`  ctx.tmp[${r.id}] = ${val};`);
                // body.push(`console.log("tmp ${r.id} ->", ctx.curve.Fr.toString(${val}))`);
                break;
            }
            case "q":
                body.push(`  ctx.q_n.set(${val}, i*${ctx.curve.Fr.n8})`);
                break;
            case "cm":
                body.push(`  ${evalMap(ctx.fflonkInfo.cm_n[r.id], r.prime, val)};`);
                // body.push(`console.log("cm ${r.id} ->", ctx.curve.Fr.toString(${val}))`);
                break;
            case "tmpExp":
                body.push(`  ${evalMap(ctx.fflonkInfo.tmpExp_n[r.id], r.prime, val)};`);
                // body.push(`console.log("tmpExp ${r.id} ->", ctx.curve.Fr.toString(${val}))`);
                break;
            default: throw new Error("Invalid reference type set: " + r.type);
        }
    }

    function evalMap(polId, prime, setValue) {
        let p = ctx.fflonkInfo.varPolMap[polId];
        offset = p.sectionPos;
        let index = prime ? `(i + ${next})%${N}` : "i";
        if(setValue) {
            return `ctx.${p.section}.set(${setValue},(${offset}*${N} + ${index})*${ctx.curve.Fr.n8})`;
        } else {
            return `ctx.${p.section}.slice((${offset}*${N} + ${index})*${ctx.curve.Fr.n8},(${offset}*${N} + ${index} + 1)*${ctx.curve.Fr.n8})`;
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
    createProxy("tmpExp_n");
    createProxy("const_n");
    createProxy("q_n");
    createProxy("x_n");

    pCtx.curve = ctx.curve;
    pCtx.Zi = ctx.Zi;
    pCtx.publics = ctx.publics;
    pCtx.challenges = ctx.challenges;

    pCtx.nBits = ctx.nBits;
    pCtx.N = ctx.N;
    pCtx.fflonkInfo = ctx.fflonkInfo;
    pCtx.tmp = ctx.tmp;

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
    for (let i=0; i<p.deg; i++) {
        p.buffer.set(pol[i], (p.offset * ctx.N + i) * ctx.curve.Fr.n8);
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
    res[i] = p.buffer.slice((p.offset * ctx.N + i) * ctx.curve.Fr.n8, (p.offset * ctx.N + i + 1) * ctx.curve.Fr.n8)
    }
    return res;
}