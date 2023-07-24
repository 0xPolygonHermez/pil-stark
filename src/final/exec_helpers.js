const fs = require("fs");
const BigArray = require("@iden3/bigarray");
const fastFile = require("fastfile");

module.exports.readExecFile = async function readExecFile(F, execFile, nCommittedPols) {

    const fd = await fastFile.readExisting(execFile);
    
    const nAdds = await fd.readULE64();
    const nSMap = await fd.readULE64();

    const n8r = F.n8;

    const lenAdds = nAdds*4*n8r;
    const lenSMap = nSMap*nCommittedPols*n8r;

    const buffAdds = await fd.read(lenAdds, 2*n8r);
    let p = 0;
    const adds = new BigArray(nAdds*4);
    for (let i=0; i < nAdds*4; ++i) {
        adds[i] = BigInt(F.toString(buffAdds.slice(p, p+n8r)));
        p += n8r;
    }

    const sMap = new BigArray(nCommittedPols * nSMap);
    const buffSMap = await fd.read(lenSMap, 2*n8r + lenAdds);
    p = 0;
    for (let i=0; i<nSMap * nCommittedPols; i++) {
        sMap[i] = BigInt(F.toString(buffSMap.slice(p, p+n8r)));
        p += n8r;
    }

    return { nAdds, nSMap, adds, sMap };

}

module.exports.writeExecFile = async function writeExecFile(F, execFile, adds, sMap) {

    const fd = await fastFile.createOverride(execFile);

    fd.writeULE64(adds.length);
    fd.writeULE64(sMap[0].length);
    
    const n8r = F.n8;

    const lenAdds = adds.length*4*n8r;
    const buffAdds = new Uint8Array(lenAdds);
    let p = 0;
    for (let i = 0; i < adds.length; i++) {
        for(let j = 0; j < 4; j++)  {
            buffAdds.set(F.e(adds[i][j]), p);
            p += n8r;
        }
    }

    await fd.write(buffAdds, 2*n8r);

    const lenSMap = sMap.length*sMap[0].length*n8r;
    const buffSMap = new Uint8Array(lenSMap);
    p = 0;
    for (let i=0; i<sMap[0].length; i++) {
        for (let j=0; j<sMap.length; j++) {
            buffSMap.set(F.e(sMap[j][i]), p);
            p += n8r;
        }
    }

    await fd.write(buffSMap, 2*n8r + lenAdds);

    await fd.close();
}