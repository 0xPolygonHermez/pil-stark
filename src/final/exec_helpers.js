const { createBinFile,
    endWriteSection,
    readBinFile,
    startWriteSection,
    startReadUniqueSection,
    endReadSection } = require("@iden3/binfileutils");

const EXEC_NSECTIONS = 3;
const ADDS_SECTION = 2;
const SMAP_SECTION = 3;

module.exports.readExecFile = async function readExecFile(F, execFile, nCommittedPols, logger) {

    const { fd, sections } = await readBinFile(execFile, "exec", 1, 1 << 25, 1 << 23);

    if (logger) logger.info(`··· Reading Section ${ADDS_SECTION}. Adds section`);
    const {nAdds, adds} = await readAddsSection(fd, sections, F);
    if (globalThis.gc) globalThis.gc();
    
    
    if (logger) logger.info(`··· Reading Section ${SMAP_SECTION}. SMap section`);
    const {nSMap, sMap} = await readSMapSection(fd, sections, nCommittedPols, F);
    if (globalThis.gc) globalThis.gc();

    await fd.close();

    return {nAdds, nSMap, adds, sMap};
}

async function readAddsSection(fd, sections, F) {
    await startReadUniqueSection(fd, sections, ADDS_SECTION);
    const nAdds = await fd.readULE64();
    const lenAdds = nAdds*4*F.n8;

    const buffAdds = await fd.read(lenAdds);
    let p = 0;
    const adds = new Array(nAdds*4);
    for (let i=0; i < nAdds*4; ++i) {
        adds[i] = BigInt(F.toString(buffAdds.slice(p, p+F.n8)));
        p += F.n8;
    }
    await endReadSection(fd);

    return {nAdds, adds};
}

async function readSMapSection(fd, sections, nCommittedPols, F) {
    await startReadUniqueSection(fd, sections, SMAP_SECTION);
    const nSMap = await fd.readULE64();
    const lenSMap = nSMap*nCommittedPols*F.n8;

    const sMap = new Array(nCommittedPols * nSMap);
    const buffSMap = await fd.read(lenSMap);
    let p = 0;
    for (let i=0; i<nSMap * nCommittedPols; i++) {
        sMap[i] = BigInt(F.toString(buffSMap.slice(p, p+F.n8)));
        p += F.n8;
    }
    await endReadSection(fd);

    return {sMap, nSMap};
}


module.exports.writeExecFile = async function writeExecFile(F, execFile, adds, sMap, logger) {

    const fd = await createBinFile(execFile, "exec", 1, EXEC_NSECTIONS, 1 << 22, 1 << 24);

    if (logger) logger.info(`··· Writing Section ${ADDS_SECTION}. Adds section`);
    await writeAddsSection(fd, adds, F);
    if (globalThis.gc) globalThis.gc();
    
    
    if (logger) logger.info(`··· Writing Section ${SMAP_SECTION}. SMap section`);
    await writeSMapSection(fd, sMap, F);
    if (globalThis.gc) globalThis.gc();

    await fd.close();
}

async function writeAddsSection(fd, adds, F) {
    await startWriteSection(fd, ADDS_SECTION);
    fd.writeULE64(adds.length);
    const lenAdds = adds.length*4* F.n8;
    const buffAdds = new Uint8Array(lenAdds);
    let p = 0;
    for (let i = 0; i < adds.length; i++) {
        for(let j = 0; j < 4; j++)  {
            buffAdds.set(F.e(adds[i][j]), p);
            p +=  F.n8;
        }
    }

    await fd.write(buffAdds);
    await endWriteSection(fd);

}

async function writeSMapSection(fd, sMap, F) {
    await startWriteSection(fd, SMAP_SECTION);
    fd.writeULE64(sMap[0].length);

    const lenSMap = sMap.length*sMap[0].length*F.n8;
    const buffSMap = new Uint8Array(lenSMap);
    let p = 0;
    for (let i=0; i<sMap[0].length; i++) {
        for (let j=0; j<sMap.length; j++) {
            buffSMap.set(F.e(sMap[j][i]), p);
            p += F.n8;
        }
    }
    await fd.write(buffSMap);
    await endWriteSection(fd);
}
