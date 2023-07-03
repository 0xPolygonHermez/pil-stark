const { createBinFile,
    endWriteSection,
    readBinFile,
    startWriteSection,
    writeBigInt,
    readBigInt,
    startReadUniqueSection,
    endReadSection } = require("@iden3/binfileutils");


const CONST_POLS_NSECTIONS = 3;
const CONST_POLS_FILE_COEFS_SECTION = 1;
const CONST_POLS_FILE_EVALS_EXT_SECTION = 2;

const { BigBuffer, Scalar, getCurveFromQ } = require("ffjavascript");


exports.writeConstPolsFile = async function (constPolsFilename, constPolsCoefs, constPolsEvalsExt, Fr, options) {
    let logger = options.logger

    if (logger) logger.info("> Writing const pols file");
    const fd = await createBinFile(constPolsFilename, "pols", 1, CONST_POLS_NSECTIONS, 1 << 22, 1 << 24);

    if (logger) logger.info(`··· Writing Section ${CONST_POLS_FILE_COEFS_SECTION}. Const Pols Coefs`);
    await writeConstPolsCoefsSection(constPolsCoefs, fd, Fr, options);
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info(`··· Writing Section ${CONST_POLS_FILE_EVALS_EXT_SECTION}. Const Pols Extended Evaluations`);
    await writeConstPolsEvalsExtSection(constPolsEvalsExt, fd, Fr, options);
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info("> Writing const pols finished");

    await fd.close();
}

async function writeConstPolsCoefsSection(constPolsCoefs, fd, Fr, options) {
    await startWriteSection(fd, CONST_POLS_FILE_COEFS_SECTION);
    await writeBuffer(constPolsCoefs, fd, Fr, options);
    await endWriteSection(fd);
}

async function writeConstPolsEvalsExtSection(constPolsEvalsExt, fd, Fr, options) {
    await startWriteSection(fd, CONST_POLS_FILE_EVALS_EXT_SECTION);
    await writeBuffer(constPolsEvalsExt, fd, Fr, options);
    await endWriteSection(fd);
}

async function writeBuffer(buffer, fd, Fr, options) {
    const MaxBuffSize = 1024 * 1024 * 256;  //  256Mb
    const totalSize = buffer.byteLength;

    const partialBuffer = new Uint8Array(Math.min(totalSize, MaxBuffSize));

    const nElements = totalSize / Fr.n8;

    let p = 0;
    for (let i = 0; i < nElements; i++) {
        const element = buffer.slice(i * Fr.n8, (i + 1) * Fr.n8);
        //partialBuffer.set(Fr.toRprLE(element), p);
        Fr.toRprLE(partialBuffer, p, element);
        p += Fr.n8;

        if (p == partialBuffer.length) {
            await fd.write(partialBuffer);
            p = 0;
        }
    }

    if (p) {
        const buff8 = new Uint8Array(partialBuffer.buffer, 0, p);
        await fd.write(buff8);
    }
}

exports.readConstPolsFile = async function (constPolsFilename, Fr, options) {
    let logger;
    if (options && options.logger) logger = options.logger;

    if (logger) logger.info("> Reading const pols file");

    // TODO change to version 2
    const { fd, sections } = await readBinFile(constPolsFilename, "pols", 1, 1 << 25, 1 << 23);

    const pols = {};

    if (logger) logger.info(`··· Reading Section ${CONST_POLS_FILE_COEFS_SECTION}. Const Pols Coefs`);
    await readConstPolsCoefsSection(fd, sections, pols, Fr, options);
    if (globalThis.gc) globalThis.gc();

    if (logger) logger.info(`··· Reading Section ${CONST_POLS_FILE_EVALS_EXT_SECTION}. Const Pols Extended Evaluations`);
    await readConstPolsEvalsExtSection(fd, sections, pols, Fr, options);
    if (globalThis.gc) globalThis.gc();

    await fd.close();

    return pols;
}

async function readConstPolsCoefsSection(fd, sections, pols, Fr, options) {
    await startReadUniqueSection(fd, sections, CONST_POLS_FILE_COEFS_SECTION);
    pols.coefs = await readBuffer(fd, sections[CONST_POLS_FILE_COEFS_SECTION], Fr);
    await endReadSection(fd);
}

async function readConstPolsEvalsExtSection(fd, sections, pols, Fr, options) {
    await startReadUniqueSection(fd, sections, CONST_POLS_FILE_EVALS_EXT_SECTION);
    pols.evalsExt = await readBuffer(fd, sections[CONST_POLS_FILE_EVALS_EXT_SECTION], Fr);
    await endReadSection(fd);
}

async function readBuffer(fd, section, Fr) {
    const size = section[0].size;
    const partialBuffer = new BigBuffer(size);
    const nElements = size / Fr.n8;

    partialBuffer.set(await fd.read(size), 0);

    let p=0;
    for (let i = 0; i < nElements; i++) {
        const element = partialBuffer.slice(i * Fr.n8, (i + 1) * Fr.n8);
        
        partialBuffer.set(Fr.fromRprLE(element), i * Fr.n8);
        p += Fr.n8;
    }

    return partialBuffer;
}