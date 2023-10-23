
const assert = require("assert");
const buildMerklehashGL = require("../helpers/hash/merklehash/merklehash_p.js");
const buildMerkleHashBN128 = require("../helpers/hash/merklehash/merklehash_bn128_p.js");
const Transcript = require("../helpers/transcript/transcript");
const TranscriptBN128 = require("../helpers/transcript/transcript.bn128");
const F3g = require("../helpers/f3g.js");

const { buildZhInv, calculateH1H2, calculateZ } = require("../helpers/polutils.js");
const buildPoseidonGL = require("../helpers/hash/poseidon/poseidon");
const buildPoseidonBN128 = require("circomlibjs").buildPoseidon;
const FRI = require("./fri.js");
const _ = require("json-bigint");
const { interpolate, ifft, fft } = require("../helpers/fft/fft_p.js");
const workerpool = require("workerpool");
const {starkgen_execute} = require("./stark_gen_worker");
const {BigBuffer} = require("pilcom");

const parallelExec = true;
const useThreads = true;
const maxNperThread = 1<<18;
const minNperThread = 1<<12;


module.exports = async function starkGen(cmPols, constPols, constTree, starkInfo) {
    const starkStruct = starkInfo.starkStruct;
    const N = 1 << starkStruct.nBits;
    const extendBits = starkStruct.nBitsExt - starkStruct.nBits;
    const nBitsExt = starkStruct.nBitsExt;
    const nBits = starkStruct.nBits;
    assert(1 << nBits == N, "N must be a power of 2");

    const F = new F3g();

    let MH;
    let transcript;
    if (starkStruct.verificationHashType == "GL") {
        const poseidon = await buildPoseidonGL();
        MH = await buildMerklehashGL(starkStruct.splitLinearHash);
        transcript = new Transcript(poseidon);
    } else if (starkStruct.verificationHashType == "BN128") {
        const poseidonBN128 = await buildPoseidonBN128();
        console.log(`Merkle Tree Arity: ${starkInfo.merkleTreeArity}`);
        MH = await buildMerkleHashBN128(starkInfo.merkleTreeArity);
        transcript = new TranscriptBN128(poseidonBN128, 16);
    } else {
        throw new Error("Invalid Hash Type: "+ starkStruct.verificationHashType);
    }

    const fri = new FRI( starkStruct, MH );

    if (cmPols.$$nPols != starkInfo.nCm1) {
        throw new Error(`Number of Commited Polynomials: ${cmPols.length} do not match with the starkInfo definition: ${starkInfo.nCm1} `)
    };

    const ctx = {}
    ctx.F = F;

    const pool = workerpool.pool(__dirname + '/stark_gen_worker.js');

    ctx.nBits = starkInfo.starkStruct.nBits;
    ctx.nBitsExt = starkInfo.starkStruct.nBitsExt;
    ctx.N = 1 << starkInfo.starkStruct.nBits;
    ctx.Next = 1 << starkInfo.starkStruct.nBitsExt;
    ctx.starkInfo = starkInfo;
    ctx.tmp = [];
    ctx.challenges = [];
    let nCm = starkInfo.nCm1;

    ctx.cm1_n = new BigBuffer(starkInfo.mapSectionsN.cm1_n*ctx.N);
    cmPols.writeToBigBuffer(ctx.cm1_n, 0);
    ctx.cm2_n = new BigBuffer(starkInfo.mapSectionsN.cm2_n*ctx.N);
    ctx.cm3_n = new BigBuffer(starkInfo.mapSectionsN.cm3_n*ctx.N);
    ctx.tmpExp_n = new BigBuffer(starkInfo.mapSectionsN.tmpExp_n*ctx.N);
    ctx.cm1_2ns = new BigBuffer(starkInfo.mapSectionsN.cm1_n*ctx.Next);
    ctx.cm2_2ns = new BigBuffer(starkInfo.mapSectionsN.cm2_n*ctx.Next);
    ctx.cm3_2ns = new BigBuffer(starkInfo.mapSectionsN.cm3_n*ctx.Next);
    ctx.cm4_2ns = new BigBuffer(starkInfo.mapSectionsN.cm4_n*ctx.Next);
    ctx.q_2ns = new BigBuffer(starkInfo.qDim*ctx.Next);
    ctx.f_2ns = new BigBuffer(3*ctx.Next);

    ctx.x_n = new BigBuffer(N);
    let xx = F.one;
    for (let i=0; i<N; i++) {
        ctx.x_n.setElement(i, xx);
        xx = F.mul(xx, F.w[nBits])
    }

    ctx.x_2ns = new BigBuffer(N << extendBits);
    xx = F.shift;
    for (let i=0; i<(N << extendBits); i++) {
        ctx.x_2ns.setElement(i, xx);
        xx = F.mul(xx, F.w[nBits + extendBits]);
    }


    // Build ZHInv
    const zhInv = buildZhInv(F, nBits, extendBits);
    ctx.Zi = zhInv;


    ctx.const_n = new BigBuffer(starkInfo.nConstants*ctx.N);
    constPols.writeToBigBuffer(ctx.const_n, 0);

    ctx.const_2ns = constTree.elements;

// This will calculate all the Q polynomials and extend commits

//    calculateExps(F, pols, starkInfo.step1prev);

    ctx.publics = [];
    for (let i=0; i<starkInfo.publics.length; i++) {
        if (starkInfo.publics[i].polType == "cmP") {
            ctx.publics[i] = ctx.cm1_n.getElement( starkInfo.publics[i].idx * starkInfo.mapSectionsN.cm1_n + starkInfo.publics[i].polId   );
        } else if (starkInfo.publics[i].polType == "imP") {
            // EDU: Do not implement this in the firs version.
            //      we will not use it.
            ctx.publics[i] = calculateExpAtPoint(ctx, starkInfo.publicsCode[i], starkInfo.publics[i].idx);
        } else {
            throw new Error(`Invalid public type: ${polType.type}`);
        }
    }

    transcript.put(MH.root(constTree));
    for (let i=0; i<starkInfo.publics.length; i++) {
        transcript.put(ctx.publics[i]);
    }

    console.log("Merkelizing 1....");
    const tree1 = await extendAndMerkelize(MH, ctx.cm1_n, ctx.cm1_2ns, starkInfo.mapSectionsN.cm1_n, ctx.nBits, ctx.nBitsExt );
    transcript.put(MH.root(tree1));

///////////
// 2.- Caluculate plookups h1 and h2
///////////
    ctx.challenges[0] = transcript.getField(); // u
    ctx.challenges[1] = transcript.getField(); // defVal

    if (parallelExec) {
        await calculateExpsParallel(pool, ctx, "step2prev", starkInfo);
    } else {
        calculateExps(ctx, starkInfo.step2prev, "n");
    }


    for (let i=0; i<starkInfo.puCtx.length; i++) {
        const puCtx = starkInfo.puCtx[i];
        const fPol = getPol(ctx, starkInfo, starkInfo.exp2pol[puCtx.fExpId]);
        const tPol = getPol(ctx, starkInfo, starkInfo.exp2pol[puCtx.tExpId]);
        const [h1, h2] = calculateH1H2(F, fPol, tPol);
        setPol(ctx, starkInfo, starkInfo.cm_n[nCm++], h1);
        setPol(ctx, starkInfo, starkInfo.cm_n[nCm++], h2);
    }

    console.log("Merkelizing 2....");
    if (global.gc) {global.gc();}
    const tree2 = await extendAndMerkelize(MH, ctx.cm2_n, ctx.cm2_2ns, starkInfo.mapSectionsN.cm2_n, ctx.nBits, ctx.nBitsExt );
    transcript.put(MH.root(tree2));

///////////
// 3.- Compute Z polynomials
///////////
    ctx.challenges[2] = transcript.getField(); // gamma
    ctx.challenges[3] = transcript.getField(); // betta


    if (parallelExec) {
        await calculateExpsParallel(pool, ctx, "step3prev", starkInfo);
    } else {
        calculateExps(ctx, starkInfo.step3prev, "n");
    }

    for (let i=0; i<starkInfo.puCtx.length; i++) {
        console.log(`Calculating z for plookup ${i}`);
        const pu = starkInfo.puCtx[i];
        const pNum = getPol(ctx, starkInfo, starkInfo.exp2pol[pu.numId]);
        const pDen = getPol(ctx, starkInfo, starkInfo.exp2pol[pu.denId]);
        const z = calculateZ(F,pNum, pDen);
        setPol(ctx, starkInfo, starkInfo.cm_n[nCm++], z);
    }
    for (let i=0; i<starkInfo.peCtx.length; i++) {
        console.log(`Calculating z for permutation check ${i}`);
        const pe = starkInfo.peCtx[i];
        const pNum = getPol(ctx, starkInfo, starkInfo.exp2pol[pe.numId]);
        const pDen = getPol(ctx, starkInfo, starkInfo.exp2pol[pe.denId]);
        const z = calculateZ(F,pNum, pDen);
        setPol(ctx, starkInfo, starkInfo.cm_n[nCm++], z);
    }
    for (let i=0; i<starkInfo.ciCtx.length; i++) {
        console.log(`Calculating z for connection ${i}`);
        const ci = starkInfo.ciCtx[i];
        const pNum = getPol(ctx, starkInfo, starkInfo.exp2pol[ci.numId]);
        const pDen = getPol(ctx, starkInfo, starkInfo.exp2pol[ci.denId]);
        const z = calculateZ(F,pNum, pDen);
        setPol(ctx, starkInfo, starkInfo.cm_n[nCm++], z);
    }

    console.log("Merkelizing 3....");
    if (global.gc) {global.gc();}
    const tree3 = await extendAndMerkelize(MH, ctx.cm3_n, ctx.cm3_2ns, starkInfo.mapSectionsN.cm3_n, ctx.nBits, ctx.nBitsExt );
    transcript.put(MH.root(tree3));

///////////
// 4. Compute C Polynomial
///////////
    ctx.challenges[4] = transcript.getField(); // vc

    if (parallelExec) {
        await calculateExpsParallel(pool, ctx, "step42ns", starkInfo);
    } else {
        calculateExps(ctx, starkInfo.step42ns, "2ns");
    }

    const qq1 = new BigBuffer(starkInfo.qDim*ctx.Next);
    const qq2 = new BigBuffer(starkInfo.qDim*starkInfo.qDeg*ctx.Next);
    await ifft(ctx.q_2ns, starkInfo.qDim, ctx.nBitsExt, qq1);

    let curS = 1n;
    const shiftIn = F.exp(F.inv(F.shift), N);
    for (let p =0; p<starkInfo.qDeg; p++) {
        for (let i=0; i<N; i++) {
            for (let k=0; k<starkInfo.qDim; k++) {
                qq2.setElement(i*starkInfo.qDim*starkInfo.qDeg + starkInfo.qDim*p + k, F.mul(qq1.getElement(p*N*starkInfo.qDim + i*starkInfo.qDim + k), curS));
            }
        }
        curS = F.mul(curS, shiftIn);
    }

    await fft(qq2, starkInfo.qDim * starkInfo.qDeg, ctx.nBitsExt, ctx.cm4_2ns);

    console.log("Merkelizing 4....");
    if (global.gc) {global.gc();}
    tree4 = await merkelize(MH, ctx.cm4_2ns , starkInfo.mapSectionsN.cm4_2ns, ctx.nBitsExt);
    transcript.put(MH.root(tree4));


///////////
// 5. Compute FRI Polynomial
///////////
    ctx.challenges[7] = transcript.getField(); // xi

// Calculate Evals

    let LEv = new Array(N);
    let LpEv = new Array(N);
    LEv[0] = 1n;
    LpEv[0] = 1n;
    const xis = F.div(ctx.challenges[7], F.shift);
    const wxis = F.div(F.mul(ctx.challenges[7], F.w[nBits]), F.shift);
    for (let k=1; k<N; k++) {
        LEv[k] = F.mul(LEv[k-1], xis);
        LpEv[k] = F.mul(LpEv[k-1], wxis);
    }
    LEv = F.ifft(LEv);
    LpEv = F.ifft(LpEv);

    if (global.gc) {global.gc();}
    ctx.evals = [];
    for (let i=0; i<starkInfo.evMap.length; i++) {
        const ev = starkInfo.evMap[i];
        let p;
        if (ev.type == "const") {
            p = {
                buffer: ctx.const_2ns,
                deg: 1<<nBitsExt,
                offset: ev.id,
                size: starkInfo.nConstants,
                dim: 1
            };
        } else if (ev.type == "cm") {
            p = getPolRef(ctx, starkInfo, starkInfo.cm_2ns[ev.id]);
        } else {
            throw new Error("Invalid ev type: "+ ev.type);
        }
        l = ev.prime ? LpEv : LEv;
        let acc = 0n;
        for (let k=0; k<N; k++) {
            let v;
            if (p.dim==1) {
                v = p.buffer.getElement((k<<extendBits)*p.size + p.offset);
            } else {
                v = [
                    p.buffer.getElement((k<<extendBits)*p.size + p.offset),
                    p.buffer.getElement((k<<extendBits)*p.size + p.offset+1),
                    p.buffer.getElement((k<<extendBits)*p.size + p.offset+2)
                ];
            }
            acc = F.add(acc, F.mul(v, l[k]));
        }
        ctx.evals[i] = acc;
    }

    for (let i=0; i<ctx.evals.length; i++) {
        transcript.put(ctx.evals[i]);
    }

    ctx.challenges[5] = transcript.getField(); // v1
    ctx.challenges[6] = transcript.getField(); // v2


// Calculate xDivXSubXi, xDivX4SubWXi
    if (global.gc) {global.gc();}
    const xi = ctx.challenges[7];
    const wxi = F.mul(ctx.challenges[7], F.w[nBits]);

    ctx.xDivXSubXi = new BigBuffer((N << extendBits)*3);
    ctx.xDivXSubWXi = new BigBuffer((N << extendBits)*3);
    let tmp_den = new Array(N << extendBits);
    let tmp_denw = new Array(N << extendBits);
    let x = F.shift;
    for (let k=0; k< N<<extendBits; k++) {
        tmp_den[k] = F.sub(x, xi);
        tmp_denw[k] = F.sub(x, wxi);
        x = F.mul(x, F.w[nBits + extendBits])
    }
    tmp_den = F.batchInverse(tmp_den);
    tmp_denw = F.batchInverse(tmp_denw);
    x = F.shift;
    for (let k=0; k< N<<extendBits; k++) {
        const v = F.mul(tmp_den[k], x);
        ctx.xDivXSubXi.setElement(3*k , v[0]);
        ctx.xDivXSubXi.setElement(3*k +1 , v[1]);
        ctx.xDivXSubXi.setElement(3*k +2, v[2]);

        const vw = F.mul(tmp_denw[k], x);
        ctx.xDivXSubWXi.setElement(3*k , vw[0]);
        ctx.xDivXSubWXi.setElement(3*k +1, vw[1]);
        ctx.xDivXSubWXi.setElement(3*k +2, vw[2]);

        x = F.mul(x, F.w[nBits + extendBits])
    }

    if (global.gc) {global.gc();}
    if (parallelExec) {
        await calculateExpsParallel(pool, ctx, "step52ns", starkInfo);
    } else {
        calculateExps(ctx, starkInfo.step52ns, "2ns");
    }

    const friPol = new Array(N<<extendBits);

    for (let i=0; i<N<<extendBits; i++) {
        friPol[i] = [
            ctx.f_2ns.getElement(i*3),
            ctx.f_2ns.getElement(i*3 + 1),
            ctx.f_2ns.getElement(i*3 + 2)
        ];
    }

    const queryPol = (idx) => {
        return [
            MH.getGroupProof(tree1, idx),
            MH.getGroupProof(tree2, idx),
            MH.getGroupProof(tree3, idx),
            MH.getGroupProof(tree4, idx),
            MH.getGroupProof(constTree, idx),
        ];
    }

    if (global.gc) {global.gc();}
    const friProof = await fri.prove(transcript, friPol, queryPol);

    await pool.terminate();

    return {
        proof: {
            root1: MH.root(tree1),
            root2: MH.root(tree2),
            root3: MH.root(tree3),
            root4: MH.root(tree4),
            evals: ctx.evals,
            fri: friProof
        },
        publics: ctx.publics
    }

}


function compileCode(ctx, code, dom, ret) {
    const body = [];

    const next = (dom=="n" ? 1 : (1<<ctx.nBitsExt - ctx.nBits)).toString();
    const N = (dom=="n" ? (1 << ctx.nBits) : (1<<ctx.nBitsExt)).toString();

    for (let j=0;j<code.length; j++) {
        const src = [];
        for (k=0; k<code[j].src.length; k++) {
            src.push(getRef(code[j].src[k]));
        }
        let exp;
        switch (code[j].op) {
            case 'add': exp = `ctx.F.add(${src[0]}, ${src[1]})`;  break;
            case 'sub': exp = `ctx.F.sub(${src[0]}, ${src[1]})`;  break;
            case 'mul': exp = `ctx.F.mul(${src[0]}, ${src[1]})`;  break;
            case 'copy': exp = `${src[0]}`;  break;
            default: throw new Error("Invalid op:"+ c[j].op);
        }
        setRef(code[j].dest, exp);
    }

    if (ret) {
        body.push(`  return ${getRef(code[code.length-1].dest)};`);
    }

    return body.join("\n");

    function getRef(r) {
        switch (r.type) {
            case "tmp": return `ctx.tmp[${r.id}]`;
            case "const": {
                if (dom=="n") {
                    if (r.prime) {
                        return `ctx.const_n[${r.id} + ((i+1)%${N})*${ctx.starkInfo.nConstants} ]`;
                    } else {
                        return `ctx.const_n[${r.id} + i*${ctx.starkInfo.nConstants}]`;
                    }
                } else if (dom=="2ns") {
                    if (r.prime) {
                        return `ctx.const_2ns[${r.id} + ((i+${next})%${N})*${ctx.starkInfo.nConstants}]`;
                    } else {
                        return `ctx.const_2ns[${r.id} + i*${ctx.starkInfo.nConstants}]`;
                    }
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "cm": {
                if (dom=="n") {
                    return evalMap( ctx.starkInfo.cm_n[r.id], r.prime)
                } else if (dom=="2ns") {
                    return evalMap( ctx.starkInfo.cm_2ns[r.id], r.prime)
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "tmpExp": {
                if (dom=="n") {
                    return evalMap( ctx.starkInfo.tmpExp_n[r.id], r.prime)
                } else if (dom=="2ns") {
                    throw new Error("Invalid dom");
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "number": return `${r.value.toString()}n`;
            case "public": return `ctx.publics[${r.id}]`;
            case "challenge": return `ctx.challenges[${r.id}]`;
            case "eval": return `ctx.evals[${r.id}]`;
            case "xDivXSubXi": return `[ctx.xDivXSubXi[3*i], ctx.xDivXSubXi[3*i+1], ctx.xDivXSubXi[3*i+2]]`;
            case "xDivXSubWXi": return `[ctx.xDivXSubWXi[3*i], ctx.xDivXSubWXi[3*i+1], ctx.xDivXSubWXi[3*i+2]]`;
            case "x": {
                if (dom=="n") {
                    return `ctx.x_n[i]`;
                } else if (dom=="2ns") {
                    return `ctx.x_2ns[i]`;
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "Zi": return `ctx.Zi(i)`;
            default: throw new Error("Invalid reference type get: " + r.type);
        }
    }

    function setRef(r, val) {
        let eDst;
        switch (r.type) {
            case "tmp": eDst = `ctx.tmp[${r.id}]`; break;
            case "q":
                if (dom=="n") {
                    throw new Error("Accessing q in domain n");
                } else if (dom=="2ns") {
                    if (ctx.starkInfo.qDim == 3) {
                        eDst = `[ ctx.q_2ns[i*3], ctx.q_2ns[i*3+1], ctx.q_2ns[i*3+2]] `;
                    } else if (ctx.starkInfo.qDim == 1) {
                        eDst = `ctx.q_2ns[i] `;
                    } else {
                        throw new Error("qDim not defined");
                    }
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            case "f":
                if (dom=="n") {
                    throw new Error("Accessing q in domain n");
                } else if (dom=="2ns") {
                    eDst = `[ ctx.f_2ns[i*3], ctx.f_2ns[i*3+1], ctx.f_2ns[i*3+2]] `;
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            case "cm":
                if (dom=="n") {
                    eDst = evalMap( ctx.starkInfo.cm_n[r.id], r.prime)
                } else if (dom=="2ns") {
                    eDst = evalMap( ctx.starkInfo.cm_2ns[r.id], r.prime)
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            case "tmpExp":
                if (dom=="n") {
                    eDst = evalMap( ctx.starkInfo.tmpExp_n[r.id], r.prime)
                } else if (dom=="2ns") {
                    throw new Error("Invalid dom");
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            default: throw new Error("Invalid reference type set: " + r.type);
        }
        body.push(`  ${eDst} = ${val};`);
    }

    function evalMap(polId, prime) {
        let p = ctx.starkInfo.varPolMap[polId];
        offset = p.sectionPos;
        let size = ctx.starkInfo.mapSectionsN[p.section];
        if (p.dim == 1) {
            if (prime) {
                return `ctx.${p.section}[${offset} + ((i + ${next})%${N})*${size}]`;
            } else {
                return `ctx.${p.section}[${offset} + i*${size}]`;
            }
        } else if (p.dim == 3) {
            if (prime) {
                return `[` +
                    ` ctx.${p.section}[${offset} + ((i + ${next})%${N})*${size}] ,`+
                    ` ctx.${p.section}[${offset} + ((i + ${next})%${N})*${size} + 1],`+
                    ` ctx.${p.section}[${offset} + ((i + ${next})%${N})*${size} + 2] `+
                    `]`;
            } else {
                return `[` +
                    ` ctx.${p.section}[${offset} + i*${size}] ,`+
                    ` ctx.${p.section}[${offset} + i*${size} + 1] ,`+
                    ` ctx.${p.section}[${offset} + i*${size} + 2] `+
                    `]`;
            }
        } else {
            throw new Error("invalid dim");
        }
    }

}

function calculateExps(ctx, code, dom) {
    ctx.tmp = new Array(code.tmpUsed);

    const compiledCode = compileCode(ctx, code.code, dom)
    const cCode = new Function("ctx", "i", `"use strict"; ${compiledCode}`);

    const N = dom=="n" ? ctx.N : ctx.Next;

    const pCtx = ctxProxy(ctx);

    for (let i=0; i<N; i++) {
        if ((i%1000) == 0) console.log(`Calculating expression.. ${i}/${N}`);
        cCode(pCtx, i);
    }
}

function calculateExpAtPoint(ctx = {}, code = {}, i = 0) {
    ctx.tmp = new Array(code.tmpUsed);
    const compiledCode = compileCode(ctx, code, "n", true);
    const cCode = new Function("ctx", "i", `"use strict"; ${compiledCode}`);

    const pCtx = ctxProxy(ctx);
    return cCode(pCtx, i);
}


function setPol(ctx, starkInfo, idPol, pol) {
    const p = getPolRef(ctx, starkInfo, idPol);
    if (p.dim == 1) {
        for (let i=0; i<p.deg; i++) {
            p.buffer.setElement(p.offset + i*p.size, pol[i]);
        }
    } else if (p.dim == 3) {
        for (let i=0; i<p.deg; i++) {
            if (Array.isArray(pol[i])) {
                p.buffer.setElement(p.offset + i*p.size, pol[i][0]);
                p.buffer.setElement(p.offset + i*p.size + 1, pol[i][1]);
                p.buffer.setElement(p.offset + i*p.size + 2,pol[i][2]);
            } else {
                p.buffer.setElement(p.offset + i*p.size, pol[i]);
                p.buffer.setElement(p.offset + i*p.size + 1, 0n);
                p.buffer.setElement(p.offset + i*p.size + 2, 0n);
            }
        }
    } else {
        throw new Error("invalid dim" + p.dim)
    }
}

function getPolRef(ctx, starkInfo, idPol) {
    let p = starkInfo.varPolMap[idPol];
    let polRef = {
        buffer: ctx[p.section],
        deg: starkInfo.mapDeg[p.section],
        offset: p.sectionPos,
        size: starkInfo.mapSectionsN[p.section],
        dim: p.dim
    };
    return polRef;
}

function getPol(ctx, starkInfo, idPol) {
    const p = getPolRef(ctx, starkInfo, idPol);
    const res = new Array(p.deg);
    if (p.dim == 1) {
        for (let i=0; i<p.deg; i++) {
            res[i] = p.buffer.getElement(p.offset + i*p.size);
        }
    } else if (p.dim == 3) {
        for (let i=0; i<p.deg; i++) {
            res[i] = [
                p.buffer.getElement(p.offset + i*p.size),
                p.buffer.getElement(p.offset + i*p.size + 1),
                p.buffer.getElement(p.offset + i*p.size + 2)
            ];
        }
    } else {
        throw new Error("invalid dim" + p.dim)
    }
    return res;
}

async function  extendAndMerkelize(MH, buffFrom, buffTo, nPols, nBits, nBitsExt) {

    await extend(buffFrom, buffTo, nPols, nBits, nBitsExt);
    return await merkelize(MH, buffTo, nPols, nBitsExt);
}

async function  extend(buffFrom, buffTo, nPols, nBits, nBitsExt ) {
    await interpolate(buffFrom, nPols, nBits, buffTo, nBitsExt);
}

async function  merkelize(MH, buff, width, nBitsExt ) {
    const nExt = 1 << nBitsExt;
    return await MH.merkelize(buff, width, nExt);
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
        execInfo.inputSections.push({ name: "cm1_2ns" });
        execInfo.inputSections.push({ name: "cm2_2ns" });
        execInfo.inputSections.push({ name: "cm3_2ns" });
        execInfo.inputSections.push({ name: "const_2ns" });
        execInfo.inputSections.push({ name: "x_2ns" });
        execInfo.outputSections.push({ name: "q_2ns" });
        dom = "2ns";
    } else if (execPart == "step52ns") {
        execInfo.inputSections.push({ name: "cm1_2ns" });
        execInfo.inputSections.push({ name: "cm2_2ns" });
        execInfo.inputSections.push({ name: "cm3_2ns" });
        execInfo.inputSections.push({ name: "cm4_2ns" });
        execInfo.inputSections.push({ name: "const_2ns" });
        execInfo.inputSections.push({ name: "xDivXSubXi" });
        execInfo.inputSections.push({ name: "xDivXSubWXi" });
        execInfo.outputSections.push({ name: "f_2ns" });
        dom = "2ns";
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


    const cCode = compileCode(ctx, code.code, dom);

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
            promises.push(pool.exec("starkgen_execute", [ctxIn, cCode, curN, execInfo, execPart, i ,n]));
        } else {
            res.push(await starkgen_execute(ctxIn, cCode, curN, execInfo, execPart, i, n));
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
    createProxy("cm1_2ns");
    createProxy("cm2_2ns");
    createProxy("cm3_2ns");
    createProxy("cm4_2ns");
    createProxy("q_2ns");
    createProxy("f_2ns");
    createProxy("const_n");
    createProxy("const_2ns");
    createProxy("x_n");
    createProxy("x_2ns");
    createProxy("xDivXSubXi");
    createProxy("xDivXSubWXi");

    pCtx.F = ctx.F;
    pCtx.Zi = ctx.Zi;
    pCtx.publics = ctx.publics;
    pCtx.challenges = ctx.challenges;

    pCtx.nBits = ctx.nBits;
    pCtx.nBitsExt = ctx.nBitsExt;
    pCtx.N = ctx.N;
    pCtx.Next = ctx.Next;
    pCtx.starkInfo = ctx.starkInfo;
    pCtx.tmp = ctx.tmp;

    pCtx.evals = ctx.evals;

    return pCtx;

    function createProxy(section) {
        if (ctx[section]) {
            pCtx[section] = new Proxy(ctx[section], BigBufferHandler);
        }
    }
}
