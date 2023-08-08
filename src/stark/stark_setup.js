
const {BigBuffer} = require("pilcom");
const buildMerklehashGL = require("../helpers/hash/merklehash/merklehash_p.js");
const pilInfo = require("../pil_info/pil_info.js");

const { interpolate } = require("../helpers/fft/fft_p");

module.exports = async function starkSetup(constPols, pil, starkStruct, options) {

    const F = options.F;
    const nBits = starkStruct.nBits;
    const nBitsExt = starkStruct.nBitsExt;
    const nExt= 1 << nBitsExt;
    const constPolsArrayE = new BigBuffer(nExt*pil.nConstants);

    const constBuff  = constPols.writeToBuff();
    await interpolate(constBuff, pil.nConstants, nBits, constPolsArrayE, nBitsExt );

    let arity = options.arity || 16;
    let custom = options.custom || false;    
    let MH;
    if (starkStruct.verificationHashType == "GL") {
        MH = await buildMerklehashGL();
    } else if (starkStruct.verificationHashType == "BN128") {
        MH = await buildMerkleHashBN128(arity, custom);
    } else {
        throw new Error("Invalid Hash Type: "+ starkStruct.verificationHashType);
    }

    const constTree = await MH.merkelize(constPolsArrayE, pil.nConstants, nExt);

    return {
        constTree: constTree,
        constRoot: MH.root(constTree),
        starkInfo: pilInfo(F, pil, true, starkStruct)
    }
}
