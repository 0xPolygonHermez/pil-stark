const { newCommitPolsArray } = require("pilcom");
const { WitnessCalculatorBuilder } = require("circom_runtime");
const fs = require("fs");

module.exports.compressorExec = async function compressorExec(F, pil, wasm, input, exec) {
    const cmPols = newCommitPolsArray(pil);

    const nCols = cmPols.Compressor.a.length;
    
    const { nAdds, nSMap, addsBuff, sMapBuff } = exec;
    
    const wc = await WitnessCalculatorBuilder(wasm);
    const w = await wc.calculateWitness(input);

    for (let i=0; i<nAdds; i++) {
        w.push( F.add( F.mul( w[addsBuff[i*4]], addsBuff[i*4 + 2]), F.mul( w[addsBuff[i*4+1]],  addsBuff[i*4+3]  )));
    }

    for (let i=0; i<nSMap; i++) {
        for (let j=0; j<nCols; j++) {
            if (sMapBuff[nCols*i+j] != 0) {
                cmPols.Compressor.a[j][i] = w[sMapBuff[nCols*i+j]];
            } else {
                cmPols.Compressor.a[j][i] = 0n;
            }
        }
    }

    return cmPols;
}


module.exports.readExecFile = async function readExecFile(execFile, nCols) {

    const fd =await fs.promises.open(execFile, "r");
    const buffH = new BigUint64Array(2);
    await fd.read(buffH, 0, 2*8);
    const nAdds= Number(buffH[0]);
    const nSMap= Number(buffH[1]);


    const addsBuff = new BigUint64Array(nAdds*4);
    await fd.read(addsBuff, 0, nAdds*4*8);

    const sMapBuff = new BigUint64Array(nSMap*nCols);
    await fd.read(sMapBuff, 0, nSMap*nCols*8);

    await fd.close();

    return { nAdds, nSMap, addsBuff, sMapBuff };

}
