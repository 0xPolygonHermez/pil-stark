const { proofgen_execute } = require("./prover_worker");
const workerpool = require("workerpool");

const maxNperThread = 1<<18;
const minNperThread = 1<<12;

module.exports.callCalculateExps = async function callCalculateExps(step, dom, ctx, parallelExec, useThreads) {
    if (parallelExec) {
        await module.exports.calculateExpsParallel(ctx, step, useThreads);
    } else {
        module.exports.calculateExps(ctx, ctx.pilInfo[step], dom);
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
                } else if (dom === "2ns") {
                    return `ctx.const_2ns[${r.id} + ${index} * ${ctx.pilInfo.nConstants}]`;
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "cm": {
                if (dom=="n") {
                    return evalMap(ctx.pilInfo.cm_n[r.id], r.prime)
                } else if (dom=="2ns") {
                    return evalMap(ctx.pilInfo.cm_2ns[r.id], r.prime)
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "tmpExp": {
                if (dom=="n") {
                    return evalMap(ctx.pilInfo.tmpExp_n[r.id], r.prime)
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "number": return `ctx.F.e(${r.value}n)`;
            case "public": return `ctx.publics[${r.id}]`;
            case "challenge": return `ctx.challenges[${r.id}]`;
            case "eval": return `ctx.evals[${r.id}]`;
            case "xDivXSubXi": return `[ctx.xDivXSubXi_2ns[3*i], ctx.xDivXSubXi_2ns[3*i+1], ctx.xDivXSubXi_2ns[3*i+2]]`;
            case "xDivXSubWXi": return `[ctx.xDivXSubWXi_2ns[3*i], ctx.xDivXSubWXi_2ns[3*i+1], ctx.xDivXSubWXi_2ns[3*i+2]]`;
            case "x": {
                if (dom=="n") {
                    return `ctx.x_n[i]`;
                } else if (dom === "2ns") {
                    return `ctx.x_2ns[i]`;
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "Zi": return `ctx.Zi_2ns[i]`;
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
                    if (ctx.pilInfo.qDim == 3) {
                        body.push(` [ ctx.q_2ns[i*3], ctx.q_2ns[i*3+1], ctx.q_2ns[i*3+2]] = ${val}; `);
                    } else if (ctx.pilInfo.qDim == 1) {
                        body.push(`ctx.q_2ns[i] = ${val}`);
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
                    body.push(`[ ctx.f_2ns[i*3], ctx.f_2ns[i*3+1], ctx.f_2ns[i*3+2]] = ${val};`);
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            case "cm":
                if (dom=="n") {
                    body.push(` ${evalMap( ctx.pilInfo.cm_n[r.id], r.prime, val)};`);
                } else if (dom=="2ns") {
                    body.push(` ${evalMap( ctx.pilInfo.cm_2ns[r.id], r.prime, val)};`);
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            case "tmpExp":
                if (dom=="n") {
                    body.push(`  ${evalMap(ctx.pilInfo.tmpExp_n[r.id], r.prime, val)};`);
                } else if (dom=="2ns") {
                    throw new Error("Invalid dom");
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            default: throw new Error("Invalid reference type set: " + r.type);
        }
    }

    function evalMap(polId, prime, val) {
        let p = ctx.pilInfo.varPolMap[polId];
        offset = p.sectionPos;
        let index = prime ? `((i + ${next})%${N})` : "i";
        let size = ctx.pilInfo.mapSectionsN[p.section];
        let pos = `${offset} + ${index} * ${size}`;
        if(val) {
            if (p.dim == 1) {
                return `ctx.${p.section}[${pos}] = ${val};`;
            } else if (p.dim == 3) {
                return `[` +
                    ` ctx.${p.section}[${pos}] ,`+
                    ` ctx.${p.section}[${pos} + 1],`+
                    ` ctx.${p.section}[${pos} + 2] `+
                    `] = ${val};`;
            } else {
                throw new Error("invalid dim");
            }
        } else {
            if (p.dim == 1) {
                return `ctx.${p.section}[${pos}]`;
            } else if (p.dim == 3) {
                return `[` +
                    ` ctx.${p.section}[${pos}] ,`+
                    ` ctx.${p.section}[${pos} + 1],`+
                    ` ctx.${p.section}[${pos} + 2] `+
                    `]`;
            } else {
                throw new Error("invalid dim");
            }
        }
    }
}

module.exports.setPol = function setPol(ctx, idPol, pol) {
    const p = module.exports.getPolRef(ctx, idPol);

    if (p.dim == 1) {
        let buildPol = new Function("ctx", "i", "pol", [`ctx.${p.section}[${p.offset} + i * ${p.size}] = pol;`]);
        for (let i=0; i<p.deg; i++) {
            buildPol(ctx, i, pol[i]);
        }
    } else if (p.dim == 3) {
        const buildPolCode = [];
        buildPolCode.push(`ctx.${p.section}[${p.offset} + i * ${p.size}] = pol[0];`);
        buildPolCode.push(`ctx.${p.section}[${p.offset} + i * ${p.size} + 1] = pol[1];`);
        buildPolCode.push(`ctx.${p.section}[${p.offset} + i * ${p.size} + 2] = pol[2];`);
    
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

module.exports.getPolRef = function getPolRef(ctx, idPol) {
    let p = ctx.pilInfo.varPolMap[idPol];
    let polRef = {
        section: p.section,
        buffer: ctx[p.section],
        deg: ctx.pilInfo.mapDeg[p.section],
        offset: p.sectionPos,
        size: ctx.pilInfo.mapSectionsN[p.section],
        dim: p.dim
    };
    return polRef;
}

module.exports.getPol = function getPol(ctx, idPol) {
    const p = module.exports.getPolRef(ctx, idPol);
    const res = new Array(p.deg);
    if (p.dim == 1) {
        let buildPol = new Function("ctx", "i", "res", [`res[i] = ctx.${p.section}[${p.offset} + i * ${p.size}];`]);
        for (let i=0; i<p.deg; i++) {
            buildPol(ctx, i, res);
        }
    } else if (p.dim == 3) {
        const buildPolCode = [];
        buildPolCode.push(`res[i] = [ctx.${p.section}[${p.offset} + i * ${p.size}], ctx.${p.section}[${p.offset} + i * ${p.size} + 1],ctx.${p.section}[${p.offset} + i * ${p.size} + 2]];`);
    
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
    let code = ctx.pilInfo[execPart];
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
        execInfo.inputSections.push({ name: "Zi_2ns" });
        execInfo.outputSections.push({ name: "q_2ns" });
        dom = "2ns";
    } else if (execPart == "step52ns") {
        execInfo.inputSections.push({ name: "cm1_2ns" });
        execInfo.inputSections.push({ name: "cm2_2ns" });
        execInfo.inputSections.push({ name: "cm3_2ns" });
        execInfo.inputSections.push({ name: "cm4_2ns" });
        execInfo.inputSections.push({ name: "const_2ns" });
        execInfo.inputSections.push({ name: "xDivXSubXi_2ns" });
        execInfo.inputSections.push({ name: "xDivXSubWXi_2ns" });
        execInfo.outputSections.push({ name: "f_2ns" });
        dom = "2ns";
    } else {
        throw new Error("Exec type not defined" + execPart);
    }

    function setWidth(section) {
        if ((section.name == "const_n") || (section.name == "const_2ns")) {
            section.width = ctx.pilInfo.nConstants;
        } else if (typeof ctx.pilInfo.mapSectionsN[section.name] != "undefined") {
            section.width = ctx.pilInfo.mapSectionsN[section.name];
        } else if (["x_n", "x_2ns", "Zi_2ns"].indexOf(section.name) >= 0) {
            section.width = 1;
        } else if (["xDivXSubXi_2ns", "xDivXSubWXi_2ns","f_2ns"].indexOf(section.name) >= 0) {
            section.width = 3;
        } else if (["q_2ns"].indexOf(section.name) >= 0) {
            section.width = ctx.pilInfo.qDim;
        } else {
            throw new Error("Invalid section name " + section.name);
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
                promises.push(pool.exec("fflonkgen_execute", [ctxIn, false, cFirst, curN, execInfo, execPart, i, n]));
            } else {
                res.push(await fflonkgen_execute(ctxIn, false, cFirst, curN, execInfo, execPart, i, n));
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