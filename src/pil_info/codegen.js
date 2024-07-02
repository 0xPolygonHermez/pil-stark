

function pilCodeGen(ctx, expressions, expId, prime) {
    prime = prime || false;

    const primeIdx = prime ? "expsPrime" : "exps";

    if (ctx.calculated[primeIdx][expId]) return;

    calculateDeps(ctx, expressions, expressions[expId], prime);

    const codeCtx = {
        pil: ctx.pil,
        expId: expId,
        tmpUsed: ctx.tmpUsed,
        code: []
    }

    let e = expressions[expId];
    const retRef = evalExp(codeCtx, e, prime);

    if (retRef.type == "tmp") {
        codeCtx.code[codeCtx.code.length-1].dest = {
            type: "exp",
            prime: prime,
            id: expId
        }
        codeCtx.tmpUsed --;
    } else {
        codeCtx.code.push({
            op: "copy",
            dest: {
                type: "exp",
                prime: prime,
                id: expId
            },
            src: [ retRef ]
        })
    }

    ctx.code.push({
        expId: expId,
        prime: prime,
        code: codeCtx.code,
    });

    ctx.calculated[primeIdx][expId] = true;

    if (codeCtx.tmpUsed > ctx.tmpUsed) ctx.tmpUsed = codeCtx.tmpUsed;
}

function evalExp(codeCtx, exp, prime) {
    prime = prime || false;
    let a = [];
    let b = [];
    let c;
    let r = [];
    if (exp.op == "add") {
        const a = evalExp(codeCtx, exp.values[0], prime);
        const b = evalExp(codeCtx, exp.values[1], prime);
        const r = {
            type: "tmp",
            id: codeCtx.tmpUsed++
        };
        codeCtx.code.push({
            op: "add",
            dest: r,
            src: [a, b]
        });
        return r;
    } else if (exp.op == "sub") {
        const a = evalExp(codeCtx, exp.values[0], prime);
        const b = evalExp(codeCtx, exp.values[1], prime);
        const r = {
            type: "tmp",
            id: codeCtx.tmpUsed++
        };
        codeCtx.code.push({
            op: "sub",
            dest: r,
            src: [a, b]
        });
        return r;
    } else if (exp.op == "mul") {
        const a = evalExp(codeCtx, exp.values[0], prime);
        const b = evalExp(codeCtx, exp.values[1], prime);
        const r = {
            type: "tmp",
            id: codeCtx.tmpUsed++
        };
        codeCtx.code.push({
            op: "mul",
            dest: r,
            src: [a, b]
        });
        return r;
    } else if (exp.op == "muladd") {
        const a = evalExp(codeCtx, exp.values[0], prime);
        const b = evalExp(codeCtx, exp.values[1], prime);
        const c = evalExp(codeCtx, exp.values[2], prime);
        const r = {
            type: "tmp",
            id: codeCtx.tmpUsed++
        };
        codeCtx.code.push({
            op: "muladd",
            dest: r,
            src: [a, b, c]
        });
        return r;
    } else if (exp.op == "addc") {
        const a = evalExp(codeCtx, exp.values[0], prime);
        const b = {
            type: "number",
            value: exp.const
        }
        const r = {
            type: "tmp",
            id: codeCtx.tmpUsed++
        };
        codeCtx.code.push({
            op: "add",
            dest: r,
            src: [a, b]
        });
        return r;
    } else if (exp.op == "mulc") {
        const a = evalExp(codeCtx, exp.values[0], prime);
        const b = {
            type: "number",
            value: exp.const.toString()
        }
        const r = {
            type: "tmp",
            id: codeCtx.tmpUsed++
        };
        codeCtx.code.push({
            op: "mul",
            dest: r,
            src: [a, b]
        });
        return r;
    } else if (exp.op == "neg") {
        const a = {
            type: "number",
            value: "0"
        };
        const b = evalExp(codeCtx, exp.values[0], prime);
        const r = {
            type: "tmp",
            id: codeCtx.tmpUsed++
        };
        codeCtx.code.push({
            op: "sub",
            dest: r,
            src: [a, b]
        });
        return r;
    } else if (exp.op == "cm") {
        if (exp.next && prime) expressionError(codeCtx.pil, "double Prime", codeCtx.expId);
        return {
            type: "cm",
            id: exp.id,
            prime: exp.next || prime
        }
    } else if (exp.op == "const") {
        if (exp.next && prime) expressionError(ctxCode.pil, "double Prime", ctxCode.expId);
        return {
            type: "const",
            id: exp.id,
            prime: exp.next || prime
        }
    } else if (exp.op == "exp") {
        if (exp.next && prime) expressionError(ctxCode.pil, "double Prime", ctxCode.expId);
        return {
            type: "exp",
            id: exp.id,
            prime: exp.next || prime
        }
    } else if (exp.op == "q") {
        if (exp.next && prime) expressionError(ctxCode.pil, "double Prime", ctxCode.expId);
        return {
            type: "q",
            id: exp.id,
            prime: exp.next || prime
        }
    } else if (exp.op == "number") {
        return {
            type: "number",
            value: exp.value.toString()
        }
    } else if (exp.op == "public") {
        return {
            type: "public",
            id: exp.id
        }
    } else if (exp.op == "challenge") {
        return {
            type: "challenge",
            id: exp.id,
        }
    } else if (exp.op == "eval") {
        return {
            type: "eval",
            id: exp.id,
        }
    } else if (exp.op == "xDivXSubXi") {
        return {
            type: "xDivXSubXi"
        }
    } else if (exp.op == "xDivXSubWXi") {
        return {
            type: "xDivXSubWXi"
        }
    } else if (exp.op == "x") {
        return {
            type: "x"
        }
    } else {
        throw new Error(`Invalid op: ${exp.op}`);
    }
}


function calculateDeps(ctx, expressions, exp, prime) {
    if (exp.op == "exp") {
        if (prime && exp.next) expressionError(ctx.pil, `Double prime`, expIdErr, exp.id);
        pilCodeGen(ctx, expressions, exp.id, prime || exp.next);
    }
    if (exp.values) {
        for (let i=0; i<exp.values.length; i++) {
            calculateDeps(ctx, expressions, exp.values[i], prime);
        }
    }
}


function expressionError(pil, strErr, e1, e2) {
    let str  = strErr;
    if (typeof e1 !== "undefined")  {
        str = str + "\n" + getExpressionInfo(pil, e1);
    }
    if (typeof e2 !== "undefined") {
        str = str + "\n" + getExpressionInfo(pil, e2);
    }
    throw new Error(str);
}

function expressionWarning(pil, strErr, e1, e2) {
    let str  = strErr;
    if (typeof e1 !== "undefined")  {
        str = str + "\n" + getExpressionInfo(pil, e1);
    }
    if (typeof e2 !== "undefined") {
        str = str + "\n" + getExpressionInfo(pil, e2);
    }
    console.log("WARNING: " + str);
}

function getExpressionInfo(pil, expId) {
    for (let i=0; i<pil.polIdentities.length; i++) {
        const pi = pil.polIdentities[i];
        if (pi.e == expId) {
            return `${pi.fileName}:${pi.line}`;
        }
    }
    for (let i=0; i<pil.plookupIdentities.length; i++) {
        const pi = pil.plookupIdentities[i];
        let isThis = false;
        let prefix
        for (j=0; j<pi.f.length; j++) {
            if (pi.f[j] == expId) {
                isThis = true;
                prefix = "f="+j;
            }
        }
        for (j=0; j<pi.t.length; j++) {
            if (pi.t[j] == expId) {
                isThis = true;
                prefix = "t="+j;
            }
        }
        if (pi.selfF === expId) {
            isThis = true;
            prefix = "selF"+j;
        }
        if (pi.selfT === expId) {
            isThis = true;
            prefix = "selF"+j;
        }
        if (isThis) {
            return `${pi.fileName}:${pi.line} ${prefix}`;
        }
    }
    for (let i=0; i<pil.permutationIdentities.length; i++) {
        const pi = pil.permutationIdentities[i];
        let isThis = false;
        let prefix
        for (j=0; j<pi.f.length; j++) {
            if (pi.f[j] == expId) {
                isThis = true;
                prefix = "f="+j;
            }
        }
        for (j=0; j<pi.t.length; j++) {
            if (pi.t[j] == expId) {
                isThis = true;
                prefix = "t="+j;
            }
        }
        if (pi.selfF === expId) {
            isThis = true;
            prefix = "selF"+j;
        }
        if (pi.selfT === expId) {
            isThis = true;
            prefix = "selF"+j;
        }
        if (isThis) {
            return `${pi.fileName}:${pi.line} ${prefix}`;
        }
    }
    for (let i=0; i<pil.connectionIdentities.length; i++) {
        const ci = pil.connectionIdentities[i];
        let isThis = false;
        let prefix
        for (j=0; j<ci.pols.length; j++) {
            if (ci.pols[j] == expId) {
                isThis = true;
                prefix = "pols="+j;
            }
        }
        for (j=0; j<ci.connections.length; j++) {
            if (ci.connections[j] == expId) {
                isThis = true;
                prefix = "connections="+j;
            }
        }
        if (isThis) {
            return `${pi.fileName}:${pi.line} ${prefix}`;
        }
    }
    return "Orphaned Expression: "+ expId;
}

function buildLinearCode(ctx) {    
    const res = [];
    for (let i=0; i<ctx.code.length; i++) {
        for (let j=0; j< ctx.code[i].code.length; j++) {
            const code = ctx.code[i].code[j];
            res.push(code);
        }
    }

    return res;
}


function buildCode(ctx, expressions) {
    res = {};
    res.code = buildLinearCode(ctx);
    res.tmpUsed = ctx.tmpUsed;

    // Expressions that are not saved, cannot be reused later on
    for (let i=0; i< expressions.length; i++) {
        const e = expressions[i];
        if ((!e.imPol)) {
            ctx.calculated.exps[i] = false;
            ctx.calculated.expsPrime[i] = false;
        }
    }
    ctx.code = [];
    return res;
}

function iterateCode(code, f, ctx) {
    _iterate(code.code, f);

    function _iterate(subCode, f) {
        for (let i=0; i<subCode.length; i++) {
            for (let j=0; j<subCode[i].src.length; j++) {
                f(subCode[i].src[j], ctx);
            }
            f(subCode[i].dest, ctx);
        }
    }
}

function findAddMul(exp) {
    if ((exp.op == "add") && (exp.values[0].op == "mul")) {
        return {
            op: "muladd",
            values: [
                findAddMul(exp.values[0].values[0]),
                findAddMul(exp.values[0].values[1]),
                findAddMul(exp.values[1]),
            ]
        }
    } else if ((exp.op == "add") && (exp.values[1].op == "mul")) {
        return {
            op: "muladd",
            values: [
                findAddMul(exp.values[1].values[0]),
                findAddMul(exp.values[1].values[1]),
                findAddMul(exp.values[0]),
            ]
        }
    } else {
        const r = Object.assign({}, exp);
        if (r.values) {
            for (let i=0; i<exp.values.length; i++) {
                r.values[i] = findAddMul(exp.values[i]);
            }
        }
        return r;
    }
}

module.exports.pilCodeGen = pilCodeGen;
module.exports.expressionError = expressionError;
module.exports.expressionWarning = expressionWarning;
module.exports.buildCode  = buildCode;
module.exports.iterateCode = iterateCode;
