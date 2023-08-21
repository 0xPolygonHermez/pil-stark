const { expressionError } = require("./helpers/quotientPolynomial/debug");


function pilCodeGen(ctx, expId, prime, addMul) {
    if (ctx.calculated[prime][expId]) return;

    calculateDeps(ctx, ctx.pil.expressions[expId], prime, expId);

    const codeCtx = {
        pil: ctx.pil,
        expId: expId,
        tmpUsed: ctx.tmpUsed,
        code: []
    }

    let e = ctx.pil.expressions[expId];
    if (addMul) e = findAddMul(e);
    
    const retRef = evalExp(codeCtx, e, prime);

    if (retRef.type == "tmp") {
        codeCtx.code[codeCtx.code.length-1].dest = {
            type: "exp",
            prime: prime,
            id: expId
        }
        codeCtx.tmpUsed --;
    } else {
        const dest =  {
            type: "exp",
            prime: prime,
            id: expId
        };
        codeCtx.code.push({
            op: "copy",
            dest: dest,
            src: [ retRef ]
        })
    }

    ctx.code.push({
        expId: expId,
        prime: prime,
        code: codeCtx.code,
    });

    ctx.calculated[prime][expId] = true;
    
    if (codeCtx.tmpUsed > ctx.tmpUsed) ctx.tmpUsed = codeCtx.tmpUsed;
}

function evalExp(codeCtx, exp, prime) {
    prime = prime || 0;
    if (["add", "sub", "mul", "muladd", "neg"].includes(exp.op)) {
        const values = exp.values.map(v => evalExp(codeCtx, v, prime));
        let op = exp.op;
        if(exp.op == "neg") {
            values.unshift({type: "number", value: "0"});
            op = "sub";
        }
        const r = { type: "tmp", id: codeCtx.tmpUsed++ };
        codeCtx.code.push({
            op: op,
            dest: r,
            src: values
        });
        return r;
    } else if (["cm", "const", "exp", "q"].includes(exp.op)) {
        if (exp.next && prime) expressionError(codeCtx.pil, "double Prime", codeCtx.expId);
        let p = exp.next || prime ? 1 : 0; 
        return { type: exp.op, id: exp.id, prime: p }
    } else if (["public", "challenge", "eval"].includes(exp.op)) {
        return { type: exp.op, id: exp.id }
    } else if (exp.op == "number") {
        return { type: "number", value: exp.value.toString() }
    } else if (exp.op == "xDivXSubXi") {
        return { type: "xDivXSubXi", opening: exp.opening }
    } else if (exp.op == "x") {
        return { type: "x" }
    } else {
        throw new Error(`Invalid op: ${exp.op}`);
    }
}


function calculateDeps(ctx, exp, prime, expIdErr, addMul) {
    if (exp.op == "exp") {
        if (prime && exp.next) expressionError(ctx.pil, `Double prime`, expIdErr, exp.id);
        let p = exp.next || prime ? 1 : 0;
        pilCodeGen(ctx, exp.id, p, addMul);
    } else if (exp.values) {
        for (let i=0; i<exp.values.length; i++) {
            calculateDeps(ctx, exp.values[i], prime, expIdErr, addMul);
        }
    }
}

function buildCode(ctx) {
    res = {};
    res.tmpUsed = ctx.tmpUsed;
    res.first = [];

    for (let i=0; i<ctx.code.length; i++) {
        for (let j=0; j< ctx.code[i].code.length; j++) {
            res.first.push(ctx.code[i].code[j]);
        }
    }

    // Expressions that are not saved, cannot be reused later on
    for (let i=0; i<ctx.pil.expressions.length; i++) {
        const e = ctx.pil.expressions[i];
        if (!e.keep) {
            ctx.calculated[0][i] = false;
            ctx.calculated[1][i] = false;
        }
    }
    ctx.code = [];
    return res;
}

function findAddMul(exp) {
    if (!exp.values) return exp;
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
        for (let i=0; i < r.values.length; i++) {
            r.values[i] = findAddMul(exp.values[i]);
        }
        return r;
    }
}

module.exports.pilCodeGen = pilCodeGen;
module.exports.buildCode  = buildCode;
