const { createBinFile,
    endWriteSection,
    readBinFile,
    startWriteSection,
    startReadUniqueSection,
    endReadSection } = require("@iden3/binfileutils");

const EXEC_NSECTIONS = 5;
const EXEC_INFO_SECTION = 2;
const ADDS_BIGINT_SECTION = 3;
const ADDS_FR_SECTION = 4;
const SMAP_SECTION = 5;

module.exports.readExecFile = async function readExecFile(F, execFile, nCommittedPols, logger) {

    const { fd, sections } = await readBinFile(execFile, "exec", 1, 1 << 25, 1 << 23);

    if (logger) logger.info(`··· Reading Section ${EXEC_INFO_SECTION}. Exec Info section`);
    const {nAdds, nSMap} = await readExecInfoSection(fd, sections);
    if (globalThis.gc) globalThis.gc();
    

    if (logger) logger.info(`··· Reading Section ${ADDS_BIGINT_SECTION}. Adds bigInt section`);
    const addsBigInt = await readAddsBigIntSection(fd, sections, nAdds);
    if (globalThis.gc) globalThis.gc();
    
    if (logger) logger.info(`··· Reading Section ${ADDS_BIGINT_SECTION}. Adds Fr section`);
    const addsFr = await readAddsFrSection(fd, sections, nAdds, F);
    if (globalThis.gc) globalThis.gc();

    
    if (logger) logger.info(`··· Reading Section ${SMAP_SECTION}. SMap section`);
    const sMap = await readSMapSection(fd, sections, nSMap, nCommittedPols, F);
    if (globalThis.gc) globalThis.gc();

    await fd.close();

    return {nAdds, nSMap, addsBigInt, addsFr, sMap};
}

async function readExecInfoSection(fd, sections) {
    await startReadUniqueSection(fd, sections, EXEC_INFO_SECTION);

    const nAdds = await fd.readULE64();
    const nSMap = await fd.readULE64();

    await endReadSection(fd);

    return {nAdds, nSMap};
}


async function readAddsBigIntSection(fd, sections, nAdds) {
    await startReadUniqueSection(fd, sections, ADDS_BIGINT_SECTION);
    const adds = new Array(nAdds*2);
    for (let i=0; i < nAdds*2; ++i) {
        adds[i] = await fd.readULE64();
    }
    await endReadSection(fd);

    return adds;
}

async function readAddsFrSection(fd, sections, nAdds, F) {
    await startReadUniqueSection(fd, sections, ADDS_FR_SECTION);
    const lenAdds = nAdds*2*F.n8;

    const buffAdds = await fd.read(lenAdds);
    let p = 0;
    const adds = new Array(nAdds*2);
    for (let i=0; i < nAdds*2; ++i) {
        adds[i] = BigInt(F.toString(buffAdds.slice(p, p+F.n8)));
        p += F.n8;
    }
    await endReadSection(fd);

    return adds;
}

async function readSMapSection(fd, sections, nSMap, nCommittedPols) {
    await startReadUniqueSection(fd, sections, SMAP_SECTION);

    const sMap = new Array(nCommittedPols * nSMap);
    for (let i=0; i<nSMap * nCommittedPols; i++) {
        sMap[i] = await fd.readULE64();
    }
    await endReadSection(fd);

    return sMap;
}


module.exports.writeExecFile = async function writeExecFile(F, execFile, adds, sMap, logger) {

    const fd = await createBinFile(execFile, "exec", 1, EXEC_NSECTIONS, 1 << 22, 1 << 24);

    if (logger) logger.info(`··· Writing Section ${EXEC_INFO_SECTION}. Exec info section`);
    await writeExecInfoSection(fd, adds, sMap);
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info(`··· Writing Section ${ADDS_BIGINT_SECTION}. Adds Big Int section`);
    await writeAddsBigIntSection(fd, adds);
    if (globalThis.gc) globalThis.gc();


    if (logger) logger.info(`··· Writing Section ${ADDS_FR_SECTION}. Adds Fr section`);
    await writeAddsFrSection(fd, adds, F);
    if (globalThis.gc) globalThis.gc();
    
    
    if (logger) logger.info(`··· Writing Section ${SMAP_SECTION}. SMap section`);
    await writeSMapSection(fd, sMap);
    if (globalThis.gc) globalThis.gc();

    await fd.close();
}

async function writeExecInfoSection(fd, adds, sMap) {
    await startWriteSection(fd, EXEC_INFO_SECTION);

    await fd.writeULE64(adds.length);
    await fd.writeULE64(sMap[0].length);

    await endWriteSection(fd);
}

async function writeAddsBigIntSection(fd, adds) {
    await startWriteSection(fd, ADDS_BIGINT_SECTION);

    const tmpBuff64 = new Uint8Array(8);
    const tmpBuff64v = new DataView(tmpBuff64.buffer);

    const buffer = new Uint8Array(adds.length*2*8);
    let p = 0;
    for (let i = 0; i < adds.length; i++) {
        for(let j = 0; j < 2; j++)  {
            tmpBuff64v.setUint32(0, adds[i][j] & 0xFFFFFFFF, true);
            tmpBuff64v.setUint32(4, Math.floor(adds[i][j] / 0x100000000) , true);
            buffer.set(tmpBuff64, p);
            p += 8;
        }
    }

    await fd.write(buffer);

    await endWriteSection(fd);

}

async function writeAddsFrSection(fd, adds, F) {
    await startWriteSection(fd, ADDS_FR_SECTION);
    const lenAdds = adds.length*2*F.n8;
    const buffAdds = new Uint8Array(lenAdds);
    let p = 0;
    for (let i = 0; i < adds.length; i++) {
        for(let j = 0; j < 2; j++)  {
            buffAdds.set(F.e(adds[i][j+2]), p);
            p +=  F.n8;
        }
    }

    await fd.write(buffAdds);
    await endWriteSection(fd);

}


async function writeSMapSection(fd, sMap) {
    await startWriteSection(fd, SMAP_SECTION);

    const tmpBuff64 = new Uint8Array(8);
    const tmpBuff64v = new DataView(tmpBuff64.buffer);

    const buffer = new Uint8Array(sMap[0].length*sMap.length*8);
    let p = 0;
    for (let i=0; i<sMap[0].length; i++) {
        for (let j=0; j<sMap.length; j++) {
            tmpBuff64v.setUint32(0, sMap[j][i] & 0xFFFFFFFF, true);
            tmpBuff64v.setUint32(4, Math.floor(sMap[j][i] / 0x100000000) , true);
            buffer.set(tmpBuff64, p);
            p += 8;
        }
    }

    await fd.write(buffer);
    await endWriteSection(fd);
}
