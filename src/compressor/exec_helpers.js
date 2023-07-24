const fs = require("fs");
const BigArray = require("@iden3/bigarray");


module.exports.readExecFile = async function readExecFile(execFile, nCommittedPols) {

    const fd =await fs.promises.open(execFile, "r");
    const buffH = new BigUint64Array(2);
    await fd.read(buffH, 0, 2*8);
    const nAdds= Number(buffH[0]);
    const nSMap= Number(buffH[1]);


    const adds = new BigUint64Array(nAdds*4);
    await fd.read(adds, 0, nAdds*4*8);

    const sMap = new BigUint64Array(nSMap*nCommittedPols);
    await fd.read(sMap, 0, nSMap*nCommittedPols*8);

    await fd.close();

    return { nAdds, nSMap, adds, sMap };

}

module.exports.writeExecFile = async function writeExecFile(execFile, adds, sMap) {

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
    
    const fd =await fs.promises.open(execFile, "w+");
    await fd.write(buff);
    await fd.close();

}