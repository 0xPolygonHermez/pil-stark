const { pilCodeGen, buildCode, iterateCode } = require("../codegen");

module.exports.generatePublicsCode = function generatePublicsCode(res, pil, expressions) {
    res.publicsCode = [];
    for (let i=0; i<res.nPublics; i++) {
        const type = expressions[res.publics[i].polId];
        if(res.publics[i].polType == "imP" && type.op === "cm") {
            res.publics[i].polType = "cmP";
            res.publics[i].polId = type.id;
            if(type.next) res.publics[i].idx += 1;
        };
        if (res.publics[i].polType == "imP") {
            const ctx = {
                pil,
                calculated: {
                    exps: {},
                    expsPrime: {}
                },
                tmpUsed: 0,
                code: []
            };
            pilCodeGen(ctx, expressions, res.publics[i].polId, false);
            res.publicsCode[i] = buildCode(ctx, expressions);
            const ctxF = {};
            ctxF.expMap = [{}, {}];
            ctxF.code = res.publicsCode[i];
            iterateCode(res.publicsCode[i], function fixRef(r, ctx) {
                const p = r.prime ? 1 : 0;
                if (r.type === "exp") {
                    if (typeof ctx.expMap[p][r.id] === "undefined") {
                        ctx.expMap[p][r.id] = ctx.code.tmpUsed ++;
                    }
                    delete r.prime;
                    r.type= "tmp";
                    r.id= ctx.expMap[p][r.id];
                }
            }, ctxF);
            ctx.calculated =  { exps: {}, expsPrime: {} }  // Public inputs expressions are caculated at a single point, so they cannot be considered as calculated
        }
    }
}

module.exports.generateStagesCode = function generateStagesCode(res, pil, expressions) {
    const ctxStage2 = {
        pil,
        calculated: {exps: {}, expsPrime: {}},
        tmpUsed: 0,
        code: [],
        expMap: [],
        dom: "n"
    };

    for(let j = 0; j < expressions.length; ++j) {
        if(expressions[j].stage === 2) {
            pilCodeGen(ctxStage2, expressions, j);
        }
    }   
    res.step2prev = buildCode(ctxStage2, expressions);
    
    const ctxStage3 = {
        pil,
        calculated: {exps: {}, expsPrime: {}},
        tmpUsed: 0,
        code: [],
        expMap: [],
        dom: "n"
    };
    
    for(let j = 0; j < expressions.length; ++j) {
        if(expressions[j].stage === 3 || expressions[j].imPol) {
            pilCodeGen(ctxStage3, expressions, j);
        }
    }   
    res.step3prev = buildCode(ctxStage3, expressions);
}


module.exports.generateConstraintPolynomialCode = function generateConstraintPolynomialCode(res, pil, expressions) {
    const ctxExt = {
        pil,
        calculated: {exps: {}, expsPrime: {}},
        tmpUsed: 0,
        code: [],
        expMap: [],
        dom: "ext",
    };

    for(let i = 0; i < res.imExpsList.length; ++i) {
        ctxExt.calculated.exps[res.imExpsList[i]] = true;
        ctxExt.calculated.expsPrime[res.imExpsList[i]] = true;
    }

    pilCodeGen(ctxExt, expressions, res.cExpId);
    const code = ctxExt.code[ctxExt.code.length-1].code;
    code.push({
        op: "mul",
        dest: {
            type: "q",
            id: 0
        },
        src: [
           code[code.length-1].dest,
           {
                type: "Zi"
           }
        ]
    });

    res.step42ns = buildCode(ctxExt, expressions);
    res.nCm4 = res.qDeg;
}

module.exports.generateConstraintPolynomialVerifierCode = function generateConstraintPolynomialVerifierCode(res, pil, expressions) {       
    let ctx = {
        pil,
        calculated: {exps: {}, expsPrime: {}},
        tmpUsed: 0,
        code: [],
        evMap: [],
        expMap: [],
        dom: "n",
        addMul: false,
    };

    for(let i = 0; i < res.imExpsList.length; ++i) {
        ctx.calculated.exps[res.imExpsList[i]] = true;
        ctx.calculated.expsPrime[res.imExpsList[i]] = true;
    }

    pilCodeGen(ctx, expressions, res.cExpId);

    res.verifierCode = buildCode(ctx, expressions);

    res.evIdx = {
        cm: [{}, {}],
        const: [{}, {}],
    }

    res.evMap = [];

    const ctxF = {};
    ctxF.expMap = [{}, {}];
    ctxF.code = res.verifierCode;

    iterateCode(res.verifierCode, fixRef, ctxF);

    for (let i=0; i<res.qDeg; i++) {
        res.evIdx["cm"][0][res.qs[i]] = res.evMap.length;
        const rf = {
            type: "cm",
            id: res.qs[i],
            prime: false,
        };
        res.evMap.push(rf);
    }

    function fixRef(r, ctx) {
        const p = r.prime ? 1 : 0;
        switch (r.type) {
            case "exp":
                const idx = res.imExpsList.indexOf(r.id);
                if (idx >= 0) {
                    r.type = "cm";
                    r.id = res.imExp2cm[res.imExpsList[idx]];
                    // Treat it as a commit.
                } else {
                    const p = r.prime ? 1 : 0;
                    if (typeof ctx.expMap[p][r.id] === "undefined") {
                        ctx.expMap[p][r.id] = ctx.code.tmpUsed ++;
                    }
                    r.type= "tmp";
                    r.expId = r.id;
                    r.id= ctx.expMap[p][r.id];
                    break;
                }
            case "cm":
            case "const":
                if (typeof res.evIdx[r.type][p][r.id] === "undefined") {
                    res.evIdx[r.type][p][r.id] = res.evMap.length;
                    const rf = {
                        type: r.type,
                        id: r.id,
                        prime: r.prime ? true : false,
                    };
                    res.evMap.push(rf);
                }
                delete r.prime;
                r.id= res.evIdx[r.type][p][r.id];
                r.type= "eval";
                break;
            case "number":
            case "challenge":
            case "public":
            case "tmp":
            case "Z":
            case "x":
            case "eval":
                    break;
            default:
                throw new Error("Invalid reference type: "+r.type);
        }
    }
}


module.exports.generateFRICode = function generateFRICode(res, pil, expressions) {
    const ctxExt = {
        pil,
        calculated: {exps: {}, expsPrime: {}},
        tmpUsed: 0,
        code: [],
        expMap: [],
        dom: "ext",
    };

    pilCodeGen(ctxExt, expressions, res.friExpId, false);

    const code = ctxExt.code[ctxExt.code.length-1].code;

    code[code.length-1].dest = { type: "f", id: 0 };

    res.step52ns = buildCode(ctxExt, expressions);

    ctxExt.verifierQuery = true;
    ctxExt.addMul = false;

    const ctxExt2 = {
        pil,
        calculated: {exps: {}, expsPrime: {}},
        tmpUsed: 0,
        code: [],
        expMap: [],
        dom: "ext",
    };

    pilCodeGen(ctxExt2, expressions, res.friExpId);
    res.verifierQueryCode = buildCode(ctxExt2, expressions);
}
