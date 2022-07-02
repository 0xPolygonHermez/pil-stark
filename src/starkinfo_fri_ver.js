
const {pilCodeGen, buildCode, fixCode, iterateCode} = require("./starkinfo_codegen.js");

module.exports = function generateVerifierQuery(res, pil) {

    const ctxFri = {
        pil: pil,
        calculated: {
            exps: {},
            expsPrime: {}
        },
        tmpUsed: 0,
        code: []
    };

    pilCodeGen(ctxFri, res.friExpId);
    res.verifierQueryCode = buildCode(ctxFri);
    res.nExps = pil.expressions.length;

    const ctxF = {};
    ctxF.expMap = [{}, {}];
    ctxF.code = res.verifierQueryCode;

    iterateCode(res.verifierQueryCode, fixRef2, ctxF);

    function fixRef2(r, ctx) {
        switch (r.type) {
            case "cm":
            case "q":
            case "const":
                const [k, id] = getTreePos(res, r.type, r.id);
                r.type = k;
                r.id = id;
                delete r.prime;
                break;
            case "exp":
                const p = r.prime ? 1 : 0;
                if (typeof ctx.expMap[p][r.id] === "undefined") {
                    ctx.expMap[p][r.id] = ctx.code.tmpUsed ++;
                }
                delete r.prime;
                r.type= "tmp";
                r.id= ctx.expMap[p][r.id];
                break;
            case "number":
            case "challange":
            case "public":
            case "tmp":
            case "xDivXSubXi":
            case "xDivXSubWXi":
            case "x":
            case "eval":
            case "tree1":
            case "tree2":
            case "tree3":
            case "tree4":
                break;
            default:
                throw new Error("Invalid reference type: "+r.type);
        }
    }
}


function getTreePos(res, type, id) {
    if (type == "cm") {
        if (id < res.nCm1) {
            return ["tree1", id];
        } else if (id < res.nCm1 + res.nCm2) {
            return ["tree2", id - res.nCm1];
        } else if (id < res.nCm1 + res.nCm2 + res.nCm3) {
            return ["tree3", id - res.nCm1 - res.nCm2];
        } else {
            throw new Error("Invalid tree pos: "+type+ " " + id);
        }
    } else if (type == "q") {
        return ["tree4", id];
    } else if (type = "const") {
        if (id < res.nConstants) {
            return ["const", id];
        } else {
            throw new Error("Invalid tree pos: "+type+ " " + id);
        }
    } else {
        throw new Error("Invalid tree pos");
    }
}
