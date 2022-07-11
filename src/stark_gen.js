
const assert = require("assert");
const MerkleHashGL = require("./merklehash_p.js");
const MerkleHashBN128 = require("./merklehash.bn128.js");
const Transcript = require("./transcript");
const TranscriptBN128 = require("./transcript.bn128");
const { useCommitPolsArray } = require("pilcom");

const { extendPol, buildZhInv, calculateH1H2, calculateZ } = require("./polutils.js");
const buildPoseidonGL = require("./poseidon");
const buildPoseidonBN128 = require("circomlibjs").buildPoseidon;
const FRI = require(".//fri.js");
const _ = require("json-bigint");
const { interpolate } = require("./fft_p.js");

module.exports.starkGen_allocate = function starkGen(pil, starkInfo) {
    const buffBuff = new SharedArrayBuffer(starkInfo.mapTotalN*8);
    const buffer = new BigUint64Array(buffBuff);
    const cmPols = useCommitPolsArray(pil, buffer, 0);
    cmPols.$$fullBuffer = buffer;
    return cmPols;
}

module.exports.starkGen = async function starkGen(cmPols, constPols, constTree, pil, starkInfo) {
    const starkStruct = starkInfo.starkStruct;
    const N = 1 << starkStruct.nBits;
    const extendBits = starkStruct.nBitsExt - starkStruct.nBits;
    const nBitsExt = starkStruct.nBitsExt;
    const nBits = starkStruct.nBits;
    assert(1 << nBits == N, "N must be a power of 2");

    const poseidon = await buildPoseidonGL();
    const F = poseidon.F;

    let MH;
    let MHS;
    let transcript;
    if (starkStruct.verificationHashType == "GL") {
        MH = new MerkleHashGL(poseidon);
        transcript = new Transcript(poseidon);
    } else if (starkStruct.verificationHashType == "BN128") {
        const poseidonBN128 = await buildPoseidonBN128();
        MH = new MerkleHashBN128(poseidonBN128);
        transcript = new TranscriptBN128(poseidonBN128);
    } else {
        throw new Error("Invalid Hash Type: "+ starkStruct.verificationHashType);
    }

    const fri = new FRI( poseidon, starkStruct, MH );

    if (cmPols.$$nPols != pil.nCommitments) {
        throw new Error(`Number of Commited Polynomials: ${cmPols.length} do not match with the pil definition: ${pil.nCommitments} `)
    };
    if (!cmPols.$$fullBuffer) {
        throw new Error("invalid cmPolsBuffer:, use starkgen_alloc to allocate the buffer");
    }

    const ctx = {}
    ctx.F = F;
    ctx.pols = cmPols.$$fullBuffer;
    ctx.nBits = starkInfo.starkStruct.nBits;
    ctx.nBitsExt = starkInfo.starkStruct.nBitsExt;
    ctx.N = 1 << starkInfo.starkStruct.nBits;
    ctx.Next = 1 << starkInfo.starkStruct.nBitsExt;
    ctx.starkInfo = starkInfo;
    ctx.tmp = [];
    ctx.challenges = [];
    let nCm = starkInfo.nCm1;


    ctx.x_n = [];
    let xx = F.one;
    for (let i=0; i<N; i++) {
        ctx.x_n[i] = xx;
        xx = F.mul(xx, F.w[nBits])
    }

    ctx.x_2ns = [];
    xx = F.shift;
    for (let i=0; i<N << extendBits; i++) {
        ctx.x_2ns[i] = xx;
        xx = F.mul(xx, F.w[nBits + extendBits]);
    }


    // Build ZHInv
    const zhInv = buildZhInv(F, nBits, extendBits);
    ctx.Zi = zhInv;

    ctx.const_n = constPols.$$buffer;
    ctx.const_2ns = constTree.elements;

// This will calculate all the Q polynomials and extend commits

//    calculateExps(F, pols, starkInfo.step1prev);

    ctx.publics = [];
    for (let i=0; i<pil.publics.length; i++) {
        if (pil.publics[i].polType == "cmP") {
            ctx.publics[i] = ctx.pols[ pil.publics[i].idx * starkInfo.mapSectionsN.cm1_n + pil.publics[i].polId   ];
        } else if (pil.publics[i].polType == "imP") {
            // EDU: Do not implement this in the firs version.
            //      we will not use it.
            ctx.publics[i] = calculateExpAtPoint(ctx, starkInfo.publicsCode[i], pil.publics[i].idx);
//            ctx.publics[i] = ctx.exps[pil.publics[i].polId][pil.publics[i].idx];
        } else {
            throw new Error(`Invalid public type: ${polType.type}`);
        }
    }

    console.log("Merkelizing 1....");
    const tree1 = await extendAndMerkelize(MH, F, ctx.pols, starkInfo.mapOffsets.cm1_n, starkInfo.mapSectionsN1.cm1_n, starkInfo.mapSectionsN3.cm1_n, starkInfo.mapOffsets.cm1_2ns, ctx.nBits, ctx.nBitsExt );
    transcript.put(MH.root(tree1));

///////////
// 2.- Caluculate plookups h1 and h2
///////////
    ctx.challenges[0] = transcript.getField(); // u
    ctx.challenges[1] = transcript.getField(); // defVal

    calculateExps(ctx, starkInfo.step2prev, "n");

    for (let i=0; i<starkInfo.puCtx.length; i++) {
        const puCtx = starkInfo.puCtx[i];
        const fPol = getPol(ctx.pols, starkInfo, starkInfo.exps_n[puCtx.fExpId]);
        const tPol = getPol(ctx.pols, starkInfo, starkInfo.exps_n[puCtx.tExpId]);
        const [h1, h2] = calculateH1H2(F, fPol, tPol);
        setPol(ctx.pols, starkInfo, starkInfo.cm_n[nCm++], h1);
        setPol(ctx.pols, starkInfo, starkInfo.cm_n[nCm++], h2);
    }

    console.log("Merkelizing 2....");
    const tree2 = await extendAndMerkelize(MH, F, ctx.pols, starkInfo.mapOffsets.cm2_n, starkInfo.mapSectionsN1.cm2_n, starkInfo.mapSectionsN3.cm2_n, starkInfo.mapOffsets.cm2_2ns, ctx.nBits, ctx.nBitsExt );
    transcript.put(MH.root(tree2));


///////////
// 3.- Compute Z polynomials
///////////
    ctx.challenges[2] = transcript.getField(); // gamma
    ctx.challenges[3] = transcript.getField(); // betta


    calculateExps(ctx, starkInfo.step3prev, "n");
    for (let i=0; i<starkInfo.puCtx.length; i++) {
        const pu = starkInfo.puCtx[i];
        const pNum = getPol(ctx.pols, starkInfo, starkInfo.exps_n[pu.numId]);
        const pDen = getPol(ctx.pols, starkInfo, starkInfo.exps_n[pu.denId]);
        const z = calculateZ(F,pNum, pDen);
        setPol(ctx.pols, starkInfo, starkInfo.cm_n[nCm++], z);
    }
    for (let i=0; i<starkInfo.peCtx.length; i++) {
        const pe = starkInfo.peCtx[i];
        const pNum = getPol(ctx.pols, starkInfo, starkInfo.exps_n[pe.numId]);
        const pDen = getPol(ctx.pols, starkInfo, starkInfo.exps_n[pe.denId]);
        const z = calculateZ(F,pNum, pDen);
        setPol(ctx.pols, starkInfo, starkInfo.cm_n[nCm++], z);
    }
    for (let i=0; i<starkInfo.ciCtx.length; i++) {
        const ci = starkInfo.ciCtx[i];
        const pNum = getPol(ctx.pols, starkInfo, starkInfo.exps_n[ci.numId]);
        const pDen = getPol(ctx.pols, starkInfo, starkInfo.exps_n[ci.denId]);
        const z = calculateZ(F,pNum, pDen);
        setPol(ctx.pols, starkInfo, starkInfo.cm_n[nCm++], z);
    }

    console.log("Merkelizing 3....");
    const tree3 = await extendAndMerkelize(MH, F, ctx.pols, starkInfo.mapOffsets.cm3_n, starkInfo.mapSectionsN1.cm3_n, starkInfo.mapSectionsN3.cm3_n, starkInfo.mapOffsets.cm3_2ns , ctx.nBits, ctx.nBitsExt);
    transcript.put(MH.root(tree3));


///////////
// 4. Compute C Polynomial
///////////
    ctx.challenges[4] = transcript.getField(); // vc

    calculateExps(ctx, starkInfo.step4, "n");
    await extend(F, ctx.pols, starkInfo.mapOffsets.exps_withq_n, starkInfo.mapSectionsN1.exps_withq_n, starkInfo.mapSectionsN3.exps_withq_n, starkInfo.mapOffsets.exps_withq_2ns , ctx.nBits, ctx.nBitsExt);
    calculateExps(ctx, starkInfo.step42ns, "2ns");

    console.log("Merkelizing 4....");
    tree4 = await merkelize(MH, ctx. pols,starkInfo.mapOffsets.q_2ns, starkInfo.mapSectionsN.q_2ns, nBitsExt);

    transcript.put(MH.root(tree4));


///////////
// 5. Compute FRI Polynomial
///////////
    ctx.challenges[5] = transcript.getField(); // v1
    ctx.challenges[6] = transcript.getField(); // v2
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

    ctx.evals = [];
    for (let i=0; i<starkInfo.evMap.length; i++) {
        const ev = starkInfo.evMap[i];
        let p;
        if (ev.type == "const") {
            p = new Proxy({
                buffer: ctx.const_2ns,
                deg: 1<<nBitsExt,
                offset: ev.id,
                size: starkInfo.nConstants,
                dim: 1
            }, polHandle);
        } else if (ev.type == "cm") {
            p = getPol(ctx.pols, starkInfo, starkInfo.cm_2ns[ev.id]);
        } else if (ev.type == "q") {
            p = getPol(ctx.pols, starkInfo, starkInfo.qs[ev.id]);
        } else {
            throw new Error("Invalid ev type: "+ ev.type);
        }
        l = ev.prime ? LpEv : LEv;
        let acc = 0n;
        for (let k=0; k<N; k++) {
            acc = F.add(acc, F.mul(p[k<<extendBits], l[k]));
        }
        ctx.evals[i] = acc;
    }

// Calculate xDivXSubXi, xDivXSubWXi

    const xi = ctx.challenges[7];
    const wxi = F.mul(ctx.challenges[7], F.w[nBits]);

    ctx.xDivXSubXi = new Array(N << extendBits);
    ctx.xDivXSubWXi = new Array(N << extendBits);
    let x = F.shift;
    for (let k=0; k< N<<extendBits; k++) {
        ctx.xDivXSubXi[k] = F.sub(x, xi);
        ctx.xDivXSubWXi[k] = F.sub(x, wxi);
        x = F.mul(x, F.w[nBits + extendBits])
    }
    ctx.xDivXSubXi = F.batchInverse(ctx.xDivXSubXi);
    ctx.xDivXSubWXi = F.batchInverse(ctx.xDivXSubWXi);
    x = F.shift;
    for (let k=0; k< N<<extendBits; k++) {
        ctx.xDivXSubXi[k] = F.mul(ctx.xDivXSubXi[k], x);
        ctx.xDivXSubWXi[k] = F.mul(ctx.xDivXSubWXi[k], x);
        x = F.mul(x, F.w[nBits + extendBits])
    }

    calculateExps(ctx, starkInfo.step52ns, "2ns");

    const friPol = getPol(ctx.pols, starkInfo, starkInfo.exps_2ns[starkInfo.friExpId]);

    const queryPol = (idx) => {
        return [
            MH.getGroupProof(tree1, idx),
            MH.getGroupProof(tree2, idx),
            MH.getGroupProof(tree3, idx),
            MH.getGroupProof(tree4, idx),
            MH.getGroupProof(constTree, idx),
        ];
    }

    const friProof = await fri.prove(transcript, friPol, queryPol);

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

    return new Function("ctx", "i", body.join("\n"));

    function getRef(r) {
        switch (r.type) {
            case "tmp": return `ctx.tmp[${r.id}]`;
            case "const": {
                if (dom=="n") {
                    if (r.prime) {
                        return `ctx.const_n[${r.id} + ((i+1)%${N})*${ctx.starkInfo.nConstants}]`;
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
            case "q": {
                if (dom=="n") {
                    throw new Error("Accessing q in domain n");
                } else if (dom=="2ns") {
                    return evalMap( ctx.starkInfo.qs[r.id], r.prime)
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "exp": {
                if (dom=="n") {
                    return evalMap( ctx.starkInfo.exps_n[r.id], r.prime)
                } else if (dom=="2ns") {
                    return evalMap( ctx.starkInfo.exps_2ns[r.id], r.prime)
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "number": return `${r.value.toString()}n`;
            case "public": return `ctx.publics[${r.id}]`;
            case "challenge": return `ctx.challenges[${r.id}]`;
            case "eval": return `ctx.evals[${r.id}]`;
            case "xDivXSubXi": return `ctx.xDivXSubXi[i]`;
            case "xDivXSubWXi": return `ctx.xDivXSubWXi[i]`;
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
            case "exp": {
                if (dom=="n") {
                    eDst = evalMap( ctx.starkInfo.exps_n[r.id], r.prime)
                } else if (dom=="2ns") {
                    eDst = evalMap( ctx.starkInfo.exps_2ns[r.id], r.prime)
                } else {
                    throw new Error("Invalid dom");
                }
            }
            break;
            case "q": {
                if (dom=="n") {
                    throw new Error("Accessing q in domain n");
                } else if (dom=="2ns") {
                    eDst = evalMap( ctx.starkInfo.qs[r.id], r.prime)
                } else {
                    throw new Error("Invalid dom");
                }
            }
            break;
            default: throw new Error("Invalid reference type set: " + r.type);
        }
        body.push(`  ${eDst} = ${val};`);
    }

    function evalMap(polId, prime) {
        let p = ctx.starkInfo.varPolMap[polId];
        let offset = ctx.starkInfo.mapOffsets[p.section];
        offset += p.sectionPos;
        let size = ctx.starkInfo.mapSectionsN[p.section];
        if (p.dim == 1) {
            if (prime) {
                return `ctx.pols[${offset} + ((i + ${next})%${N})*${size}]`;
            } else {
                return `ctx.pols[${offset} + i*${size}]`;
            }
        } else if (p.dim == 3) {
            if (prime) {
                return `[` +
                    ` ctx.pols[${offset} + ((i + ${next})%${N})*${size}] ,`+
                    ` ctx.pols[${offset} + ((i + ${next})%${N})*${size} + 1],`+
                    ` ctx.pols[${offset} + ((i + ${next})%${N})*${size} + 2] `+
                    `]`;
            } else {
                return `[` +
                    ` ctx.pols[${offset} + i*${size}] ,`+
                    ` ctx.pols[${offset} + i*${size} + 1] ,`+
                    ` ctx.pols[${offset} + i*${size} + 2] `+
                    `]`;
            }
        } else {
            throw new Error("invalid dim");
        }
    }

}

function calculateExps(ctx, code, dom) {
    ctx.tmp = new Array(code.tmpUsed);
    cFirst = compileCode(ctx, code.first, dom);
    cI = compileCode(ctx, code.i, dom);
    cLast = compileCode(ctx, code.last, dom);

    const next = dom=="n" ? 1 : 1<< (ctx.nBitsExt - ctx.nBits);
    const N = dom=="n" ? ctx.N : ctx.Next;
    for (let i=0; i<next; i++) {
        cFirst(ctx, i);
    }
    for (let i=next; i<N-next; i++) {
        if ((i%1000) == 0) console.log(`Calculating expression.. ${i}/${N}`);
        cI(ctx, i);
    }
    for (let i=N-next; i<N; i++) {
        cLast(ctx, i);
    }
}

function calculateExpAtPoint(ctx, code, i) {
    ctx.tmp = new Array(code.tmpUsed);
    cFirst = compileCode(ctx, code.first, "n", true);

    return cFirst(ctx, i);
}


function setPol(pols, starkInfo, idPol, pol) {
    let p = starkInfo.varPolMap[idPol];
    let N = starkInfo.mapDeg[p.section];
    let offset = starkInfo.mapOffsets[p.section];
    offset += p.sectionPos;
    let size = starkInfo.mapSectionsN[p.section];
    if (p.dim == 1) {
        for (let i=0; i<N; i++) {
            pols[offset + i*size] = pol[i];
        }
    } else if (p.dim == 3) {
        for (let i=0; i<N; i++) {
            if (Array.isArray(pol[i])) {
                for (let e =0; e<3; e++) {
                    pols[offset + i*size + e] = pol[i][e];
                }
            } else {
                pols[offset + i*size] = pol[i];
                pols[offset + i*size+1] = 0n;
                pols[offset + i*size+2] = 0n;
            }
        }
    } else {
        throw new Error("invalid dim" + p.dim)
    }
}

/*
function getPol(pols, starkInfo, idPol) {
    const res = [];
    let p = starkInfo.varPolMap[idPol];
    let N = starkInfo.mapDeg[p.section];
    let offset = starkInfo.mapOffsets[p.section];
    offset += p.sectionPos;
    let size = starkInfo.mapSectionsN[p.section];
    if (p.dim==1) {
        for (let i=0; i<N; i++) {
            res.push(pols[offset + i*size]);
        }
    } else if (p.dim == 3) {
        for (let i=0; i<N; i++) {
            res.push([
                pols[offset + i*size],
                pols[offset + i*size+1],
                pols[offset + i*size+2]
            ]);
        }
    }
    return res;
}
*/

const polHandle = {
    get( obj, prop) {
        if (!isNaN(prop)) {
            prop = Number(prop);
            assert(prop<obj.deg, "Out of range");
            if (obj.dim == 1) {
                return obj.buffer[obj.offset + obj.size*prop];
            } else {
                return [
                    obj.buffer[obj.offset + obj.size*prop],
                    obj.buffer[obj.offset + obj.size*prop+1],
                    obj.buffer[obj.offset + obj.size*prop+2]
                ];
            }
        } else if (prop == "length") {
            return obj.deg;
        }
    },
    set( obj, prop, v) {
        if (!isNaN(prop)) {
            prop = Number(prop);
            assert(prop<obj.deg, "Out of range");
            if (obj.dim == 1) {
                obj.buffer[obj.offset + obj.size*prop] = v;
            } else {
                if (Array.isArray(v)) {
                    [
                        obj.buffer[obj.offset + obj.size*prop],
                        obj.buffer[obj.offset + obj.size*prop+1],
                        obj.buffer[obj.offset + obj.size*prop+2]
                    ] = v;
                } else {
                    [
                        obj.buffer[obj.offset + obj.size*prop],
                        obj.buffer[obj.offset + obj.size*prop+1],
                        obj.buffer[obj.offset + obj.size*prop+2]
                    ] = [ v, 0n, 0n];
                }
            }
            return true;
        }
    }
}

function getPol(pols, starkInfo, idPol) {
    let p = starkInfo.varPolMap[idPol];
    let polRef = {
        buffer: pols,
        deg: starkInfo.mapDeg[p.section],
        offset: starkInfo.mapOffsets[p.section] + p.sectionPos,
        size: starkInfo.mapSectionsN[p.section],
        dim: p.dim
    };
    return new Proxy(polRef, polHandle);
}


async function  extendAndMerkelize(MH, F, buff, src, nPols1, nPols3, dst, nBits, nBitsExt) {
    await extend(F, buff, src, nPols1, nPols3, dst, nBits, nBitsExt);
    return await merkelize(MH, buff, dst, nPols1 + nPols3*3, nBitsExt);
}

async function  extend(F, buff, src, nPols1, nPols3,  dst, nBits, nBitsExt ) {
    await interpolate(buff, src*8, nPols1 + 3*nPols3, nBits, buff, dst*8, nBitsExt);
}

async function  merkelize(MH, buff, src, width, nBitsExt ) {
    const nExt = 1 << nBitsExt;
    return await MH.merkelize(buff, src*8, width, nExt);
}
