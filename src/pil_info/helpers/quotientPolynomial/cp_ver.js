const {pilCodeGen, buildCode, iterateCode} = require("../../codegen.js");

module.exports  = function generateConstraintPolynomialVerifier(res, imPolsMap, pil, stark) {
    const ctxC = {
        pil: pil,
        calculated: {
            exps: Object.assign({}, imPolsMap),
            expsPrime: Object.assign({}, imPolsMap)
        },
        tmpUsed: 0,
        code: []
    };

    pilCodeGen(ctxC, res.cExp, false, null, null, true);

    res.verifierCode = buildCode(ctxC);

    res.evIdx = {
        cm: [{}, {}],
        const: [{}, {}],
    }

    res.evMap = [];

    const ctxF = {};
    ctxF.expMap = [{}, {}];
    ctxF.code = res.verifierCode;

    iterateCode(res.verifierCode, fixRef, ctxF);

    if (stark) {
        for (let i = 0; i < res.qDeg; i++) {
            res.evIdx["cm"][0][res.qs[i]] = res.evMap.length;
            const rf = {
                type: "cm",
                id: res.qs[i],
                prime: 0,
            };
            res.evMap.push(rf);
        }
    }

    function fixRef(r, ctx) {
        const p = r.prime ? 1 : 0;
        switch (r.type) {
            // Check the expressions ids. If it is an intermediate polynomial
            // modify the type and set it as a commit;
            case "exp":
                if (imPolsMap[r.id]) {
                    r.type = "cm";
                    r.id = imPolsMap[r.id];
                } else {
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
                        prime: p
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
