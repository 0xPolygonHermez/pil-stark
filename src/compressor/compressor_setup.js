const {readR1cs} = require("r1csfile");
const plonkSetupC18 = require("./compressor18_setup.js");
const plonkSetupC12 = require("./compressor12_setup.js");

module.exports.compressorSetup = async function compressorSetup(F, r1csFile, cols, options = {}) {
    const r1cs = await readR1cs(r1csFile, {F: F, logger:console });

    if(![12,18].includes(cols)) throw new Error("Invalid number of cols");

    let res;
    if(cols === 12) {
        res = await plonkSetupC12(F, r1cs, options);
    } else {
        res = await plonkSetupC18(F, r1cs, options);
    }

    const exec = await writeExecFile(res.plonkAdditions, res.sMap);

    return {exec, pilStr: res.pilStr, constPols: res.constPols};
}



async function writeExecFile(adds, sMap) {
    
    const size = 2 + adds.length*4 + sMap.length*sMap[0].length;
    const buff = new BigUint64Array(size);
    
    buff[0] = BigInt(adds.length);
    buff[1] = BigInt(sMap[0].length);
    
    for (let i=0; i< adds.length; i++) {
        buff[2 + i*4     ] = BigInt(adds[i][0]);
        buff[2 + i*4 + 1 ] = BigInt(adds[i][1]);
        buff[2 + i*4 + 2 ] = adds[i][2];
        buff[2 + i*4 + 3 ] = adds[i][3];
    }

    for (let i=0; i<sMap[0].length; i++) {
        for (let c=0; c<sMap.length; c++) {
            buff[2 + adds.length*4 + sMap.length*i + c] = BigInt(sMap[c][i]);
        }
    }
    
    return buff;
}