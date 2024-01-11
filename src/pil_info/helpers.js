
module.exports.getExpDim = function getExpDim(expressions, cmDims, expId) {

    return _getExpDim(expressions[expId]);

    function _getExpDim(exp) {
        if(typeof(exp.dimMap) !== "undefined") return exp.dimMap; 
        switch (exp.op) {
            case "add":
            case "sub":
            case "mul":
            case "muladd":
            case "addc":
            case "mulc":
            case "neg":
                let md = 1;
                for (let i=0; i<exp.values.length; i++) {
                    const d = _getExpDim(exp.values[i]);
                    if (d>md) md=d;
                }
                return md;
            case "cm": return cmDims[exp.id];
            case "const": return 1;
            case "exp":
                exp.dimMap = _getExpDim(expressions[exp.id]);
                return exp.dimMap;
            case "number": return 1;
            case "public": return 1;
            case "challenge": return 3;
            case "eval": return 3;
            case "xDivXSubXi":  return 3;
            case "xDivXSubWXi": return 3;
            case "x": return 1;
            default: throw new Error("Exp op not defined: " + exp.op);
        }
    }
}
