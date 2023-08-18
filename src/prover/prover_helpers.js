const { proofgen_execute } = require("./prover_worker");
const workerpool = require("workerpool");
const {BigBuffer} = require("ffjavascript");
const { BigBufferHandler } = require("../fflonk/helpers/fflonk_prover_helpers");
const { calculateZ, calculateH1H2 } = require("../helpers/polutils");

const maxNperThread = 1<<18;
const minNperThread = 1<<12;

module.exports.calculatePublics = async function calculatePublics(ctx) {
    // Calculate publics
    ctx.publics = [];
    for (let i=0; i<ctx.pilInfo.publics.length; i++) {
        const publicPol = ctx.pilInfo.publics[i];

        if ("cmP" === publicPol.polType) {
            const offset = (ctx.pilInfo.publics[i].idx * ctx.pilInfo.mapSectionsN.cm1 + ctx.pilInfo.publics[i].polId);
            ctx.publics[i] = ctx.cm1_n[offset];
        } else if ("imP" === publicPol.polType) {
            ctx.publics[i] = module.exports.calculateExpAtPoint(ctx, ctx.pilInfo.publicsCode[i], publicPol.idx);
        } else {
            throw new Error(`Invalid public type: ${polType.type}`);
        }
    }
}

module.exports.callCalculateExps = async function callCalculateExps(step, dom, ctx, parallelExec, useThreads) {
    if (parallelExec) {
        await module.exports.calculateExpsParallel(ctx, step, useThreads);
    } else {
        module.exports.calculateExps(ctx, ctx.pilInfo.code[step], dom);
    }
}

module.exports.calculateExps = function calculateExps(ctx, code, dom) {
    ctx.tmp = new Array(code.tmpUsed);

    cFirst = new Function("ctx", "i", module.exports.compileCode(ctx, code.first, dom));

    const N = dom=="n" ? ctx.N : ctx.Next;

    for (let i=0; i<N; i++) {
        cFirst(ctx, i);
    }
}

module.exports.calculateExpAtPoint = function calculateExpAtPoint(ctx, code, i) {
    ctx.tmp = new Array(code.tmpUsed);
    cFirst = new Function("ctx", "i", module.exports.compileCode(ctx, code.first, "n", true));

    return cFirst(ctx, i);
}


module.exports.compileCode = function compileCode(ctx, code, dom, ret) {
    const body = [];

    const next = dom === "n" ? 1 : (1 << ctx.extendBits);
    const N = dom === "n" ? ctx.N : ctx.Next;

    for (let j=0;j<code.length; j++) {
        const src = [];
        for (k=0; k<code[j].src.length; k++) {
            src.push(getRef(code[j].src[k]));
        }
        let exp;
        switch (code[j].op) {
            case 'add': exp = `ctx.F.add(${src[0]}, ${src[1]})`; break;
            case 'sub': exp = `ctx.F.sub(${src[0]}, ${src[1]})`; break;
            case 'mul': exp = `ctx.F.mul(${src[0]}, ${src[1]})`; break;
            case 'copy': exp = `${src[0]}`; break;
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
                const index = r.prime ? `((i + ${next})%${N})` : "i"
                if (dom === "n") {
                    return `ctx.const_n[${r.id} + ${index} * ${ctx.pilInfo.nConstants}]`;
                } else if (dom === "ext") {
                    return `ctx.const_ext[${r.id} + ${index} * ${ctx.pilInfo.nConstants}]`;
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "cm": {
                if (dom=="n") {
                    return evalMap(r.id, r.prime, false)
                } else if (dom=="ext") {
                    return evalMap(r.id, r.prime, true)
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "number": return `ctx.F.e(${r.value}n)`;
            case "public": return `ctx.publics[${r.id}]`;
            case "challenge": return `ctx.challenges[${r.id}]`;
            case "eval": return `ctx.evals[${r.id}]`;
            case "xDivXSubXi": return `[
                    ctx.xDivXSubXi_ext[3*(${ctx.pilInfo.fri2Id[r.opening]} + ${ctx.pilInfo.nFriOpenings}*i)], 
                    ctx.xDivXSubXi_ext[3*(${ctx.pilInfo.fri2Id[r.opening]} + ${ctx.pilInfo.nFriOpenings}*i) + 1], 
                    ctx.xDivXSubXi_ext[3*(${ctx.pilInfo.fri2Id[r.opening]} + ${ctx.pilInfo.nFriOpenings}*i) + 2]
                ]`;
            case "x": {
                if (dom=="n") {
                    return `ctx.x_n[i]`;
                } else if (dom === "ext") {
                    return `ctx.x_ext[i]`;
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "Zi": return `ctx.Zi_ext[i]`;
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
                } else if (dom=="ext") {
                    if (r.dim == 3) {
                        body.push(` [ ctx.q_ext[i*3], ctx.q_ext[i*3+1], ctx.q_ext[i*3+2]] = ${val}; `);
                    } else if (r.dim == 1) {
                        body.push(`ctx.q_ext[i] = ${val}`);
                    } else {
                        throw new Error("Invalid dom");
                    }
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            case "f":
                if (dom=="n") {
                    throw new Error("Accessing q in domain n");
                } else if (dom=="ext") {
                    body.push(`[ ctx.f_ext[i*3], ctx.f_ext[i*3+1], ctx.f_ext[i*3+2]] = ${val};`);
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            case "cm":
                if (dom=="n") {
                    body.push(` ${evalMap( r.id, r.prime, false, val)};`);
                } else if (dom=="ext") {
                    body.push(` ${evalMap( r.id, r.prime, true, val)};`);
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            default: throw new Error("Invalid reference type set: " + r.type);
        }
    }

    function evalMap(polId, prime, extended, val) {
        let p = ctx.pilInfo.cmPolsMap[polId];
        offset = p.stagePos;
        let index = prime ? `((i + ${next})%${N})` : "i";
        let size = ctx.pilInfo.mapSectionsN[p.stage];
        let stage = extended ? p.stage + "_ext" : p.stage + "_n";
        let pos = `${offset} + ${index} * ${size}`;
        if(val) {
            if (p.dim == 1) {
                return `ctx.${stage}[${pos}] = ${val};`;
            } else if (p.dim == 3) {
                return `[` +
                    ` ctx.${stage}[${pos}],`+
                    ` ctx.${stage}[${pos} + 1],`+
                    ` ctx.${stage}[${pos} + 2] `+
                    `] = ${val};`;
            } else {
                throw new Error("invalid dim");
            }
        } else {
            if (p.dim == 1) {
                return `ctx.${stage}[${pos}]`;
            } else if (p.dim == 3) {
                return `[` +
                    ` ctx.${stage}[${pos}] ,`+
                    ` ctx.${stage}[${pos} + 1],`+
                    ` ctx.${stage}[${pos} + 2] `+
                    `]`;
            } else {
                throw new Error("invalid dim");
            }
        }
    }
}

module.exports.setPol = function setPol(ctx, idPol, pol, dom) {
    const p = module.exports.getPolRef(ctx, idPol, dom);

    if (p.dim == 1) {
        let buildPol = new Function("ctx", "i", "pol", [`ctx.${p.stage}[${p.offset} + i * ${p.size}] = pol;`]);
        for (let i=0; i<p.deg; i++) {
            buildPol(ctx, i, pol[i]);
        }
    } else if (p.dim == 3) {
        const buildPolCode = [];
        buildPolCode.push(`ctx.${p.stage}[${p.offset} + i * ${p.size}] = pol[0];`);
        buildPolCode.push(`ctx.${p.stage}[${p.offset} + i * ${p.size} + 1] = pol[1];`);
        buildPolCode.push(`ctx.${p.stage}[${p.offset} + i * ${p.size} + 2] = pol[2];`);
    
        let buildPol = new Function("ctx", "i", "pol", buildPolCode.join("\n"));
    
        for (let i=0; i<p.deg; i++) {
            if (Array.isArray(pol[i])) {
                buildPol(ctx, i, pol[i]);
            } else {
                buildPol(ctx, i, [pol[i], 0n, 0n]);
            }
        }
    } else {
        throw new Error("invalid dim" + p.dim)
    }
}

module.exports.getPolRef = function getPolRef(ctx, idPol, dom) {
    if(!["n", "ext"].includes(dom)) throw new Error("invalid stage");
    const deg = dom === "ext" ? ctx.Next : ctx.N;
    let p = ctx.pilInfo.cmPolsMap[idPol];
    let stage = p.stage + "_" + dom;
    let polRef = {
        stage: stage,
        buffer: ctx[stage],
        deg: deg,
        offset: p.stagePos,
        size: ctx.pilInfo.mapSectionsN[p.stage],
        dim: p.dim
    };
    return polRef;
}

module.exports.getPol = function getPol(ctx, idPol, dom) {
    const p = module.exports.getPolRef(ctx, idPol, dom);
    const res = new Array(p.deg);
    if (p.dim == 1) {
        let buildPol = new Function("ctx", "i", "res", [`res[i] = ctx.${p.stage}[${p.offset} + i * ${p.size}];`]);
        for (let i=0; i<p.deg; i++) {
            buildPol(ctx, i, res);
        }
    } else if (p.dim == 3) {
        const buildPolCode = [];
        buildPolCode.push(`res[i] = [ctx.${p.stage}[${p.offset} + i * ${p.size}], ctx.${p.stage}[${p.offset} + i * ${p.size} + 1],ctx.${p.stage}[${p.offset} + i * ${p.size} + 2]];`);
    
        let buildPol = new Function("ctx", "i", "res", buildPolCode.join("\n"));

        for (let i=0; i<p.deg; i++) {
            buildPol(ctx, i, res);
        }
    } else {
        throw new Error("invalid dim" + p.dim)
    }
    return res;
}


module.exports.calculateExpsParallel = async function calculateExpsParallel(ctx, execPart, useThreads) {

    const pool = workerpool.pool(__dirname + '/prover_worker.js');

    let dom;
    let code = ctx.pilInfo.code[execPart];
    let execInfo = {
        inputSections: [],
        outputSections: []
    };

    const execStages = [];
    for(let i = 0; i < ctx.pilInfo.nLibStages; ++i) {
        const stage = 2 + i;
        execStages.push(`stage${stage}`);
    }
    
    if (execStages.includes(execPart)) {
        execInfo.inputSections.push({ name: "const_n" });
        execInfo.inputSections.push({ name: "cm1_n" });
        execInfo.inputSections.push({ name: "x_n" });
        for(let j = 0; j < ctx.pilInfo.nLibStages; j++) {
            const stage = j + 2;
            execInfo.inputSections.push({ name: `cm${stage}_n` });
            execInfo.outputSections.push({ name: `cm${stage}_n` });
        }
        execInfo.outputSections.push({ name: "tmpExp_n" });
        dom = "n";
    } else if (execPart == "imPols") {
        execInfo.inputSections.push({ name: "const_n" });
        execInfo.inputSections.push({ name: "cm1_n" });
        for(let i = 0; i < ctx.pilInfo.nLibStages; i++) {
            const stage = i + 2;
            execInfo.inputSections.push({ name: `cm${stage}_n` });
        }
        execInfo.inputSections.push({ name: "x_n" });
        execInfo.outputSections.push({ name: `cm${ctx.pilInfo.nLibStages + 1}_n` });
        execInfo.outputSections.push({ name: "tmpExp_n" });
        dom = "n";
    } else if (execPart == "Q") {
        execInfo.inputSections.push({ name: "const_ext" });
        execInfo.inputSections.push({ name: "cm1_ext" });
        for(let i = 0; i < ctx.pilInfo.nLibStages; i++) {
            const stage = i + 2;
            execInfo.inputSections.push({ name: `cm${stage}_ext` });
        }
        execInfo.inputSections.push({ name: "x_ext" });
        execInfo.outputSections.push({ name: "q_ext" });
        if(ctx.prover === "stark") {
            execInfo.inputSections.push({ name: "Zi_ext" });
        }
        dom = "ext";
    } else if (execPart == "fri") {
        execInfo.inputSections.push({ name: "const_ext" });
        execInfo.inputSections.push({ name: "cm1_ext" });
        for(let i = 0; i < ctx.pilInfo.nLibStages; i++) {
            const stage = i + 2;
            execInfo.inputSections.push({ name: `cm${stage}_ext` });
        }
        execInfo.inputSections.push({ name: "cmQ_ext" });
        execInfo.inputSections.push({ name: "xDivXSubXi_ext" });
        execInfo.outputSections.push({ name: "f_ext" });
        dom = "ext";
    } else {
        throw new Error("Exec type not defined" + execPart);
    }

    function setWidth(stage) {
        if ((stage.name == "const_n") || (stage.name == "const_ext")) {
            stage.width = ctx.pilInfo.nConstants;
        } else if (typeof ctx.pilInfo.mapSectionsN[stage.name.split("_")[0]] != "undefined") {
            stage.width = ctx.pilInfo.mapSectionsN[stage.name.split("_")[0]];
        } else if (["x_n", "x_ext", "Zi_ext"].indexOf(stage.name) >= 0) {
            stage.width = 1;
        } else if (["xDivXSubXi_ext"].indexOf(stage.name) >= 0) {
            stage.width = 3*ctx.pilInfo.nFriOpenings;
        } else if (["f_ext"].indexOf(stage.name) >= 0) {
            stage.width = 3;
        } else if (["q_ext"].indexOf(stage.name) >= 0) {
            stage.width = ctx.pilInfo.qDim;
        } else {
            throw new Error("Invalid stage name " + stage.name);
        }
    }

    for (let i = 0; i < execInfo.inputSections.length; i++) setWidth(execInfo.inputSections[i]);
    for (let i = 0; i < execInfo.outputSections.length; i++) setWidth(execInfo.outputSections[i]);

    const cFirst = module.exports.compileCode(ctx, code.first, dom, false);

    const n = dom === "n" ? ctx.N : ctx.Next;
    const next = dom === "n" ? 1 : (1 << ctx.extendBits);

    let nPerThread = Math.floor((n - 1) / pool.maxWorkers) + 1;
    if (nPerThread > maxNperThread) nPerThread = maxNperThread;
    if (nPerThread < minNperThread) nPerThread = minNperThread;
    const promises = [];
    let res = [];
    const stark = ctx.prover === "stark" ? true : false;
    if(stark) {
        for (let i = 0; i < n; i += nPerThread) {
            const curN = Math.min(nPerThread, n - i);
            const ctxIn = {
                n: n,
                nBits: ctx.nBits,
                next: next,
                evals: ctx.evals,
                publics: ctx.publics,
                challenges: ctx.challenges
            };
            for (let s = 0; s < execInfo.inputSections.length; s++) {
                const si = execInfo.inputSections[s];
                ctxIn[si.name] = new BigUint64Array((curN + next) * si.width);
                const s1 = ctx[si.name].slice(i * si.width, (i + curN) * si.width);
                ctxIn[si.name].set(s1);
                const sNext = ctx[si.name].slice(((i + curN)%n) *si.width, ((i + curN)%n) * si.width + si.width*next);
                ctxIn[si.name].set(sNext, curN*si.width);
            }
    
            for (let s=0; s<execInfo.outputSections.length; s++) {
                const si = execInfo.outputSections[s];
                if (typeof ctxIn[si.name] == "undefined") {
                    ctxIn[si.name] = new BigUint64Array((curN + next) * si.width);
                }
            }
    
            if (useThreads) {
                promises.push(pool.exec("proofgen_execute", [ctxIn, true, cFirst, curN, execInfo, execPart, i, n]));
            } else {
                res.push(await proofgen_execute(ctxIn, true, cFirst, curN, execInfo, execPart, i, n));
            }
        }
        if (useThreads) {
            res = await Promise.all(promises)
        }
        for (let i = 0; i < res.length; i++) {
            for (let s = 0; s < execInfo.outputSections.length; s++) {
                const si = execInfo.outputSections[s];
                const b = new BigUint64Array(res[i][si.name].buffer, res[i][si.name].byteOffset, res[i][si.name].length - si.width*next);
                ctx[si.name].set(b, i * nPerThread * si.width);
            }
        }
    } else {
        for (let i = 0; i < n; i += nPerThread) {
            const curN = Math.min(nPerThread, n - i);
            const ctxIn = {
                F: ctx.F,
                n: n,
                nBits: ctx.nBits,
                next: next,
                evals: ctx.evals,
                publics: ctx.publics,
                challenges: ctx.challenges
            };
            for (let s = 0; s < execInfo.inputSections.length; s++) {
                const si = execInfo.inputSections[s];
                ctxIn[si.name] = new BigBuffer((curN + next) * si.width * ctx.F.n8);
                const s1 = si.width > 0 ? ctx[si.name].slice(i * si.width * ctx.F.n8, (i + curN) * si.width * ctx.F.n8) : ctx[si.name];
                ctxIn[si.name].set(s1, 0);
                const sNext = si.width > 0 ? ctx[si.name].slice((((i + curN) % n) * si.width) * ctx.F.n8, (((i + curN) % n) * si.width + si.width * next) * ctx.F.n8) : ctx[si.name];
                ctxIn[si.name].set(sNext, curN * si.width * ctx.F.n8);
                ctxIn[si.name] = new Proxy(ctxIn[si.name], BigBufferHandler);
            }
    
            for (let s=0; s<execInfo.outputSections.length; s++) {
                const si = execInfo.outputSections[s];
                if (typeof ctxIn[si.name] == "undefined") {
                    ctxIn[si.name] = new BigBuffer((curN + next) * si.width * ctx.F.n8);
                }
                ctxIn[si.name] = new Proxy(ctxIn[si.name], BigBufferHandler);
            }
    
            if (useThreads) {
                promises.push(pool.exec("proofgen_execute", [ctxIn, false, cFirst, curN, execInfo, execPart, i, n]));
            } else {
                res.push(await proofgen_execute(ctxIn, false, cFirst, curN, execInfo, execPart, i, n));
            }
        }
        if (useThreads) {
            res = await Promise.all(promises)
        }
        for (let i = 0; i < res.length; i++) {
            for (let s = 0; s < execInfo.outputSections.length; s++) {
                const si = execInfo.outputSections[s];
                const b = si.width > 0 ? res[i][si.name].slice(0, res[i][si.name].byteLength - si.width * next * ctx.F.n8) : res[i][si.name];
                ctx[si.name].set(b, i * nPerThread * si.width * ctx.F.n8);
            }
        }
    }

    await pool.terminate();
}

module.exports.hintFunctions = async function hintFunctions(functionName, F, inputs) {
    if(functionName === "calculateZ") {
        return calculateZ(F, ...inputs);
    } else if(functionName === "calculateH1H2") {
        return calculateH1H2(F,...inputs);
    } else {
        throw new Error("Invalid function name: " + functionName);
    }

}
