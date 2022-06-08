const starkInfoGen = require("./starkinfo_gen.js");
const ejs = require("ejs");
const F1Field = require("./src/f3g");


module.exports = async function pil2circom(template, pil, constRoot, starkStruct) {

    const starkInfo = starkInfoGen(pil, starkStruct);

    const F = new F1Field();

    const obj = {
        F: F,
        starkInfo: starkInfo,
        starkStruct: starkStruct,
        constRoot: constRoot,
        pil: pil
    };

    return ejs.render(template ,  obj);

}
