const { createBinFile,
    endWriteSection,
    readBinFile,
    startWriteSection,
    writeBigInt,
    startReadUniqueSection,
    endReadSection } = require("@iden3/binfileutils");
const {
    ZKEY_PF_NSECTIONS,
    ZKEY_PF_HEADER_SECTION,
    ZKEY_PF_F_SECTION,
    ZKEY_PF_F_COMMITMENTS_SECTION,
    ZKEY_PF_POLSMAP_SECTION,
    ZKEY_PF_OMEGAS_SECTION,
} = require("./zkey_pilfflonk_constants.js");
const { HEADER_ZKEY_SECTION, PILFFLONK_PROTOCOL_ID } = require("./zkey_constants.js");
const { Scalar } = require("ffjavascript");


exports.writePilFflonkZkeyFile = async function (zkey, zkeyFilename, curve, options) {
    let logger = options.logger

    if (logger) logger.info("> Writing the Pil-Fflonk zkey file");
    const fdZKey = await createBinFile(zkeyFilename, "zkey", 1, ZKEY_PF_NSECTIONS, 1 << 22, 1 << 24);

    if (logger) logger.info(`··· Writing Section ${HEADER_ZKEY_SECTION}. Zkey Header`);
    await writeZkeyHeaderSection(fdZKey, zkey);
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info(`··· Writing Section ${ZKEY_PF_HEADER_SECTION}. Zkey Pil-Fflonk Header`);
    await writePilFflonkHeaderSection(fdZKey, zkey, curve);
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info(`··· Writing Section ${ZKEY_PF_F_SECTION}. F Section`);
    await writeFSection(fdZKey, zkey, curve);
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info(`··· Writing Section ${ZKEY_PF_F_COMMITMENTS_SECTION}. F commitments Section`);
    await writeFCommitmentsSection(fdZKey, zkey, curve);
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info(`··· Writing Section ${ZKEY_PF_POLSMAP_SECTION}. Polynomials map Section`);
    await writePolsMapSection(fdZKey, zkey, curve);
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info(`··· Writing Section ${ZKEY_PF_OMEGAS_SECTION}. Omegas Section`);
    await writeOmegasSection(fdZKey, zkey, curve);
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info("> Writing the zkey file finished");

    await fdZKey.close();
}

async function writeZkeyHeaderSection(fdZKey, zkey) {
    await startWriteSection(fdZKey, HEADER_ZKEY_SECTION);
    await fdZKey.writeULE32(PILFFLONK_PROTOCOL_ID);
    await endWriteSection(fdZKey);
}

async function writePilFflonkHeaderSection(fdZKey, zkey, curve) {
    await startWriteSection(fdZKey, ZKEY_PF_HEADER_SECTION);

    // const primeQ = curve.q;
    // const n8q = (Math.floor((Scalar.bitLength(primeQ) - 1) / 64) + 1) * 8;
    // await fdZKey.writeULE32(n8q);
    // await writeBigInt(fdZKey, primeQ, n8q);

    // const primeR = curve.r;
    // const n8r = (Math.floor((Scalar.bitLength(primeR) - 1) / 64) + 1) * 8;
    // await fdZKey.writeULE32(n8r);
    // await writeBigInt(fdZKey, primeR, n8r);

    await fdZKey.writeULE32(zkey.power);
    await fdZKey.writeULE32(zkey.nPublics);
    await fdZKey.write(zkey.X_2);

    await endWriteSection(fdZKey);
}
async function writeFSection(fdZKey, zkey, curve) {
    await startWriteSection(fdZKey, ZKEY_PF_F_SECTION);

    const len = zkey.f.length;
    //Write the length of the array
    await fdZKey.writeULE32(len);

    for (let i = 0; i < len; i++) {
        await writeF(fdZKey, i, zkey.f[i]);
    }

    await endWriteSection(fdZKey);

    async function writeF(fdZKey, index, f) {
        await fdZKey.writeULE32(index);
        await fdZKey.writeULE32(f.degree);

        // Write opening points
        const lenOpeningPoints = f.openingPoints.length;
        await fdZKey.writeULE32(lenOpeningPoints);

        for (let i = 0; i < lenOpeningPoints; i++) {
            await fdZKey.writeULE32(f.openingPoints[i]);
        }

        // Write pols
        const lenPols = f.pols.length;
        await fdZKey.writeULE32(lenPols);

        for (let i = 0; i < lenPols; i++) {
            await writeStringToFile(fdZKey, f.pols[i]);
        }

        // Write stages
        const lenStages = f.stages.length;
        await fdZKey.writeULE32(lenStages);

        for (let i = 0; i < lenStages; i++) {
            await writeStage(fdZKey, f.stages[i]);
        }
    }

    async function writeStage(fdZKey, stage) {
        await fdZKey.writeULE32(stage.stage);

        const lenPols = stage.pols.length;
        await fdZKey.writeULE32(lenPols);

        for (let i = 0; i < lenPols; i++) {
            await writePol(fdZKey, stage.pols[i]);
        }
    }

    async function writePol(fdZKey, pol) {
        await writeStringToFile(fdZKey, pol.name);
        await fdZKey.writeULE32(pol.degree);
    }
}

async function writeFCommitmentsSection(fdZKey, zkey, curve) {
    await startWriteSection(fdZKey, ZKEY_PF_F_COMMITMENTS_SECTION);

    const commitments = Object.keys(zkey).filter(k => k.match(/^f\d/));

    const len = commitments.length;
    //Write the length of the array
    await fdZKey.writeULE32(len);

    for (let i = 0; i < len; i++) {
        await writeStringToFile(fdZKey, commitments[i]);
        await fdZKey.write(zkey[commitments[i]]);
    }

    await endWriteSection(fdZKey);
}

async function writePolsMapSection(fdZKey, zkey, curve) {
    await startWriteSection(fdZKey, ZKEY_PF_POLSMAP_SECTION);

    const keys = Object.keys(zkey.polsMap);

    const len = keys.length;
    //Write the length of the array
    await fdZKey.writeULE32(len);

    for (let i = 0; i < len; i++) {
        await writeStringToFile(fdZKey, keys[i]);

        const subkeys = Object.keys(zkey.polsMap[keys[i]]);

        const lenSubkeys = subkeys.length;
        await fdZKey.writeULE32(lenSubkeys);

        for (let j = 0; j < lenSubkeys; j++) {
            /// TO CHECK els indexos de les subkeys son inters sempre????
            await fdZKey.writeULE32(parseInt(subkeys[j]));
            await writeStringToFile(fdZKey, zkey.polsMap[keys[i]][subkeys[j]]);
        }
    }

    await endWriteSection(fdZKey);
}

async function writeOmegasSection(fdZKey, zkey, curve) {
    await startWriteSection(fdZKey, ZKEY_PF_OMEGAS_SECTION);

    const omegas = Object.keys(zkey).filter(k => k.match(/^w\d/));

    const len = omegas.length;
    //Write the length of the array
    await fdZKey.writeULE32(len);

    for (let i = 0; i < len; i++) {
        await writeStringToFile(fdZKey, omegas[i]);
        await fdZKey.write(zkey[omegas[i]]);
    }

    await endWriteSection(fdZKey);
}

exports.readPilFflonkZkeyFile = async function (zkeyFilename, curve, options) {
    let logger;
    if (options && options.logger) logger = options.logger;

    if (logger) logger.info("> Reading the Pil-Fflonk zkey file");

    // TODO change to version 2
    const { fd: fdZKey, sections } = await readBinFile(zkeyFilename, "zkey", 1, 1 << 25, 1 << 23);

    const zkey = {};

    await startReadUniqueSection(fdZKey, sections, HEADER_ZKEY_SECTION);
    const protocolId = await fdZKey.readULE32();
    if (protocolId !== PILFFLONK_PROTOCOL_ID) throw new Error(`Invalid protocol id ${protocolId} in zkey file`);
    await endReadSection(fdZKey);

    zkey.protocol = "pil-fflonk";
    zkey.protocolId = PILFFLONK_PROTOCOL_ID;

    if (logger) logger.info(`··· Reading Section ${ZKEY_PF_HEADER_SECTION}. Zkey Pil-Fflonk Header`);
    await readPilFflonkHeaderSection(fdZKey, sections, zkey);
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info(`··· Reading Section ${ZKEY_PF_F_SECTION}. F Section`);
    await readFSection(fdZKey, sections, zkey);
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info(`··· Reading Section ${ZKEY_PF_F_COMMITMENTS_SECTION}. F commitments Section`);
    await readFCommitmentsSection(fdZKey, sections, zkey);
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info(`··· Reading Section ${ZKEY_PF_POLSMAP_SECTION}. Polynomials map Section`);
    await readPolsMapSection(fdZKey, sections, zkey);
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info(`··· Reading Section ${ZKEY_PF_OMEGAS_SECTION}. Omegas Section`);
    await readOmegasSection(fdZKey, sections, zkey);
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info("> Reading the zkey file finished");

    await fdZKey.close();

    return zkey;
}

async function readPilFflonkHeaderSection(fdZKey, sections, zkey) {
    await startReadUniqueSection(fdZKey, sections, ZKEY_PF_HEADER_SECTION);

    zkey.power = await fdZKey.readULE32();
    zkey.nPublics = await fdZKey.readULE32();
    zkey.X_2 = await fdZKey.read(128);

    await endReadSection(fdZKey);
}
async function readFSection(fdZKey, sections, zkey) {
    await startReadUniqueSection(fdZKey, sections, ZKEY_PF_F_SECTION);

    const len = await fdZKey.readULE32();

    if (len > 0) zkey.f = [];
    for (let i = 0; i < len; i++) {
        await readF(fdZKey, zkey.f);
    }

    await endReadSection(fdZKey);

    async function readF(fdZKey, f) {
        const index = await fdZKey.readULE32();
        f[index] = {};

        f[index].index = index;
        f[index].degree = await fdZKey.readULE32();

        // Read opening points
        const lenOpeningPoints = await fdZKey.readULE32();

        if (lenOpeningPoints > 0) f[index].openingPoints = [];
        for (let i = 0; i < lenOpeningPoints; i++) {
            f[index].openingPoints[i] = await fdZKey.readULE32();
        }

        // Read pols
        const lenPols = await fdZKey.readULE32();

        if (lenPols > 0) f[index].pols = [];
        for (let i = 0; i < lenPols; i++) {
            f[index].pols[i] = await fdZKey.readString()
        }

        // Read stages
        const lenStages = await fdZKey.readULE32();

        if (lenStages > 0) f[index].stages = [];
        for (let i = 0; i < lenStages; i++) {
            await readStage(fdZKey, f[index].stages);
        }
    }

    async function readStage(fdZKey, stages) {
        let stage = {};
        stage.stage = await fdZKey.readULE32();

        const lenPols = await fdZKey.readULE32();

        if (lenPols > 0) stage.pols = [];
        for (let i = 0; i < lenPols; i++) {
            await readPol(fdZKey, stage.pols);
        }
        stages.push(stage);
    }

    async function readPol(fdZKey, pols) {
        let pol = {};
        pol.name = await fdZKey.readString();
        pol.degree = await fdZKey.readULE32();
        pols.push(pol);
    }
}
async function readFCommitmentsSection(fdZKey, sections, zkey) {
    await startReadUniqueSection(fdZKey, sections, ZKEY_PF_F_COMMITMENTS_SECTION);

    const len = await fdZKey.readULE32();

    for (let i = 0; i < len; i++) {
        const name = await fdZKey.readString();
        zkey[name] = await fdZKey.read(64);
    }

    await endReadSection(fdZKey);
}

async function readPolsMapSection(fdZKey, sections, zkey) {
    await startReadUniqueSection(fdZKey, sections, ZKEY_PF_POLSMAP_SECTION);

    // const keys = Object.keys(zkey.polsMap);

    const len = await fdZKey.readULE32();

    if (len > 0) zkey.polsMap = {};
    for (let i = 0; i < len; i++) {
        const name = await fdZKey.readString();

        zkey.polsMap[name] = {};

        const lenSubkeys = await fdZKey.readULE32();

        for (let j = 0; j < lenSubkeys; j++) {
            const index = await fdZKey.readULE32();
            zkey.polsMap[name][index.toString()] = await fdZKey.readString();
        }
    }

    await endReadSection(fdZKey);
}

async function readOmegasSection(fdZKey, sections, zkey) {
    await startReadUniqueSection(fdZKey, sections, ZKEY_PF_OMEGAS_SECTION);

    const len = await fdZKey.readULE32();

    for (let i = 0; i < len; i++) {
        const name = await fdZKey.readString();
        zkey[name] = await fdZKey.read(32);
    }

    await endReadSection(fdZKey);
}


// TODO add this method to fastfile?
async function writeStringToFile(fd, str) {
    let buff = new Uint8Array(str.length + 1);
    for (let i = 0; i < str.length; i++) {
        buff[i] = str.charCodeAt(i);
    }
    buff[str.length] = 0;

    await fd.write(buff);
}