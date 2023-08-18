const ejs = require("ejs");
const F3g = require("./helpers/f3g.js");
const fs = require("fs");
const path = require("path");
const { log2 } = require("pilcom/src/utils.js");


module.exports = async function pil2circom(pil, constRoot, starkInfo, options) {

    options = options || {};
    starkStruct = starkInfo.starkStruct;

    const F = new F3g();

    let template;
    if (starkStruct.verificationHashType == "GL") {
        template = await fs.promises.readFile(path.join(__dirname, "..", "circuits.gl", "stark_verifier.circom.ejs"), "utf8");
    } else if (starkStruct.verificationHashType == "BN128") {
        if(options.custom) {
            template = await fs.promises.readFile(path.join(__dirname, "..", "circuits.bn128.custom", "stark_verifier.circom.ejs"), "utf8");
        } else {
            template = await fs.promises.readFile(path.join(__dirname, "..", "circuits.bn128", "stark_verifier.circom.ejs"), "utf8");   
        }
    } else {
        throw new Error("Invalid Hash Type: "+ starkStruct.verificationHashType);
    }


    const obj = {
        F: F,
        starkInfo: starkInfo,
        starkStruct: starkStruct,
        constRoot: constRoot,
        pil: pil,
        options: options,
        arity: Number(options.arity),
        transcriptArity: Number(options.transcriptArity),
        nBitsArity: log2(options.arity),
    };

    return ejs.render(template ,  obj);

}