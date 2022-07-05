const starkInfoGen = require("./starkinfo.js");
const ejs = require("ejs");
const F1Field = require("./f3g");
const fs = require("fs");


module.exports = async function pil2circom(pil, constRoot, starkStruct) {

    const starkInfo = starkInfoGen(pil, starkStruct);

    const F = new F1Field();

    setDimensions(starkInfo.verifierCode.first);
    setDimensions(starkInfo.verifierQueryCode.first);

    let template;
    if (starkStruct.verificationHashType == "GL") {
        template = await fs.promises.readFile("./circuits.gl/stark_verifier.circom.ejs", "utf8");
    } else if (starkStruct.verificationHashType == "BN128") {
        template = await fs.promises.readFile("./circuits.bn128/stark_verifier.circom.ejs", "utf8");
    } else {
        throw new Error("Invalid Hash Type: "+ starkStruct.verificationHashType);
    }


    const obj = {
        F: F,
        starkInfo: starkInfo,
        starkStruct: starkStruct,
        constRoot: constRoot,
        pil: pil
    };

    return ejs.render(template ,  obj);

}


function setDimensions(code) {
    const tmpDim = [];

    for (let i=0; i<code.length; i++) {
        let newDim;
        switch (code[i].op) {
            case 'add': newDim = Math.max(getDim(code[i].src[0]), getDim(code[i].src[1])); break;
            case 'sub': newDim = Math.max(getDim(code[i].src[0]), getDim(code[i].src[1])); break;
            case 'mul': newDim = Math.max(getDim(code[i].src[0]), getDim(code[i].src[1])); break;
            case 'copy': newDim = getDim(code[i].src[0]); break;
            default: throw new Error("Invalid op:"+ code[i].op);
        }
        setDim(code[i].dest, newDim);
    }


    function getDim(r) {
        let d;
        switch (r.type) {
            case "tmp": d=tmpDim[r.id]; break;
            case "tree1": d=r.dim; break;
            case "tree2": d=r.dim; break;
            case "tree3": d=r.dim; break;
            case "tree4": d=r.dim; break;
            case "const": d=1; break;
            case "eval": d=3; break;
            case "number": d=1; break;
            case "public": d=1; break;
            case "challenge": d=3; break;
            case "xDivXSubXi": d=3; break;
            case "xDivXSubWXi": d=3; break;
            case "x": d=3; break;
            case "Z": d=3; break;
            default: throw new Error("Invalid reference type get: " + r.type);
        }
        r.dim = d;
        return d;
    }

    function setDim(r, dim) {
        switch (r.type) {
            case "tmp": tmpDim[r.id] = dim; r.dim=dim; return;
            default: throw new Error("Invalid reference type set: " + r.type);
        }
    }

}
