const { iterateCode } = require("../codegen");

module.exports.addPol = function addPol(res, stage, name, dim, pos) {
    const polsStage = res.varPolMap.filter((p) => p.stage == stage);
    const polPos = polsStage.length;
    const stagePos = polsStage.reduce((acc, p) => acc + p.dim, 0);
    const polType = { stage, name, dim, stagePos, polPos };
    res.varPolMap[pos] = polType;
    res.mapSectionsN[stage] += dim;
}

module.exports.getExpDim = function getExpDim(res, pil, expId, stark) {

    return _getExpDim(pil.expressions[expId]);

    function _getExpDim(exp) {
        if(typeof(exp.dimMap) !== "undefined") return exp.dimMap; 
        switch (exp.op) {
            case "add":
            case "sub":
            case "mul":
            case "muladd":
            case "neg":
                let md = 1;
                for (let i=0; i<exp.values.length; i++) {
                    const d = _getExpDim(exp.values[i]);
                    if (d>md) md=d;
                }
                return md;
            case "cm": return res.varPolMap[exp.id].dim;
            case "exp":
                exp.dimMap = _getExpDim(pil.expressions[exp.id]);
                return exp.dimMap;
            case "q": return _getExpDim(pil.expressions[pil.q2exp[exp.id]]);
            case "const":
            case "number":
            case "public": 
            case "x": 
                return 1;
            case "challenge":
            case "eval":
                return stark ? 3 : 1;
            case "xDivXSubXi":
                if(stark) return 3;
                throw new Error("Exp op not defined: " + exp.op);
            default: throw new Error("Exp op not defined: " + exp.op);
        }
    }
}


module.exports.setCodeDimensions = function setCodeDimensions(code, pilInfo, stark) {
    const tmpDim = [];

    _setCodeDimensions(code.first);

    function _setCodeDimensions(code) {
        for (let i=0; i<code.length; i++) {
            let newDim;
            switch (code[i].op) {
                case 'add': newDim = Math.max(getDim(code[i].src[0]), getDim(code[i].src[1])); break;
                case 'sub': newDim = Math.max(getDim(code[i].src[0]), getDim(code[i].src[1])); break;
                case 'mul': newDim = Math.max(getDim(code[i].src[0]), getDim(code[i].src[1])); break;
                case 'muladd': newDim = Math.max(getDim(code[i].src[0]), getDim(code[i].src[1]), getDim(code[i].src[2])); break;
                case 'copy': newDim = getDim(code[i].src[0]); break;
                default: throw new Error("Invalid op:"+ code[i].op);
            }
            setDim(code[i].dest, newDim);
        }


        function getDim(r) {
            
            if (r.type.startsWith("tree") && stark) {
                return r.dim;
            }

            switch (r.type) {
                case "tmp": r.dim = tmpDim[r.id]; break;
                case "tmpExp": break;
                case "cm": r.dim = pilInfo.varPolMap[r.id].dim; break;
                case "const": 
                case "number": 
                case "public": 
                case "Zi":
                    r.dim = 1; break;
                case "eval": 
                case "challenge": 
                case "Z":
                case "xDivXSubXi": 
                case "x": 
                    r.dim= stark ? 3 : 1; break;
                default: throw new Error("Invalid reference type: " + r.type);
            }
            return r.dim;
        }

        function setDim(r, dim) {
            switch (r.type) {
                case "tmp": tmpDim[r.id] = dim; r.dim=dim; return;
                case "exp":
                case "cm":
                case "tmpExp":
                case "q": 
                    r.dim=dim; return;
                case "f": 
                    if(!stark) throw new Error("Invalid reference type set: " + r.type);
                    r.dim=dim; return;
                default: throw new Error("Invalid reference type set: " + r.type);
            }
        }
    }
}


module.exports.fixProverCode = function fixProverCode(res, code, imPols, dom, stark, verifierQuery = false) {
    const ctx = {};
    ctx.expMap = [];
    
    let openings = stark ? res.nFriOpenings : 2;
    for(let i = 0; i < openings; ++i) {
        ctx.expMap[i] = {};
    }
    ctx.code = code;
    ctx.dom = dom;

    iterateCode(code, fixRef, ctx)

    function fixRef(r, ctx) {
        switch (r.type) {
            case "cm":
                if (verifierQuery) {
                    const p1 = res.varPolMap[r.id];
                    let index = Number(p1.stage.substr(2));
                    if (p1.stage === "cmQ") {
                        r.type = "treeQ";
                        index = res.nLibStages + 2;
                    } else {
                        if(index < 1 || index > res.nLibStages + 1) throw new Error("Invalid cm stage");
                        r.type = "tree" + index;
                    }
                    
                    r.stageId = p1.polPos;
                    r.treePos = p1.stagePos;
                    r.dim = p1.dim;
                }
                break;
            case "exp":
                if (typeof imPols[r.id] != "undefined" && (imPols[r.id].imPol || ctx.dom === "n")) {
                    r.type = "cm";
                    r.id = imPols[r.id].id;
                } else {
                    const p = r.prime ? 1 : 0;
                    if (typeof ctx.expMap[p][r.id] === "undefined") {
                        ctx.expMap[p][r.id] = ctx.code.tmpUsed ++;
                    }
                    r.type= "tmp";
                    r.expId = r.id;
                    r.id= ctx.expMap[p][r.id];
                }
                break;
            case "const":
            case "number":
            case "challenge":
            case "public":
            case "tmp":
            case "Zi":
            case "eval":
            case "x":
            case "q":
            case "tmpExp":
                break;
            case "xDivXSubXi":
            case "f":
                if(!stark) throw new Error("Invalid reference type" + r.type);
                break;
            default:
                throw new Error("Invalid reference type " + r.type);
        }
    }
}
