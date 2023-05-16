const fs = require("fs");
const BigArray = require("@iden3/bigarray");


module.exports.readExecFile = async function readExecFile(F, execFile, nCommittedPols) {

    const fd =await fs.promises.open(execFile, "r");

    const buffH = new Uint8Array(2*F.n8);
    await fd.read({buffer: buffH, offset: 0, length: 2*F.n8});
        
    const nAdds = Number(F.fromRprLE(buffH, 0));
    const nSMap = Number(F.fromRprLE(buffH, F.n8));

    const size = (nAdds*4 + nCommittedPols*nSMap)*F.n8;
    const buff = new Uint8Array(size);

    await fd.read({buffer: buff, offset: 0, length: size });

    let p = 0;
    const adds = new BigArray(nAdds);
    for (let i=0; i < nAdds; ++i) {
        adds[i] = [];
        for(let j = 0; j < 4; ++j) {
            adds[i][j] = F.fromRprLE(buff, p);
            p += F.n8;
        }
    }
    
    const sMap = new BigArray(nCommittedPols);

    for(let c = 0; c < nCommittedPols; c++) {
        sMap[c] = [];
    }

    for (let i=0; i<nSMap; i++) {
        for (let j=0; j<nCommittedPols; j++) {
            sMap[j][i] = F.fromRprLE(buff, p);
            p += F.n8;
        }
    }

    await fd.close();

    return { nAdds, nSMap, adds, sMap };

}

module.exports.writeExecFile = async function writeExecFile(F, execFile, adds, sMap) {

    const size = (2 + adds.length*4 + sMap.length*sMap[0].length)*F.n8;
    const buff = new Uint8Array(size);
    
    F.toRprLE(buff, 0, adds.length);
    F.toRprLE(buff, F.n8, sMap[0].length);
    
    let p = 2*F.n8;
    for (let i=0; i< adds.length; i++) {
        for(let j = 0; j < 4; j++)  {
            F.toRprLE(buff, p, adds[i][j]);
            p += F.n8;
        }
    }

    for (let i=0; i<sMap[0].length; i++) {
        for (let j=0; j<sMap.length; j++) {
            F.toRprLE(buff, p, sMap[j][i]);
            p += F.n8;
        }
    }
    
    const fd =await fs.promises.open(execFile, "w+");
    await fd.write(buff);
    await fd.close();

}