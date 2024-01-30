const { createBinFile,
    endWriteSection,
    readBinFile,
    startWriteSection,
    startReadUniqueSection,
    endReadSection } = require("@iden3/binfileutils");

const CHELPERS_NSECTIONS = 2;

const CHELPERS_STAGES_SECTION = 2;

exports.writeCHelpersFile = async function (cHelpersFilename, cHelpersInfo) {
    console.log("> Writing the chelpers file");

    const cHelpersBin = await createBinFile(cHelpersFilename, "chps", 1, CHELPERS_NSECTIONS, 1 << 22, 1 << 24);
    
    console.log(`··· Writing Section ${CHELPERS_STAGES_SECTION}. CHelpers stages section`);
    await startWriteSection(cHelpersBin, CHELPERS_STAGES_SECTION);

    const nStages = cHelpersInfo.length;

    //Write the number of stages
    await cHelpersBin.writeULE32(nStages);

    for(let i = 0; i < nStages; i++) {
        const stageInfo = cHelpersInfo[i];

        await cHelpersBin.writeULE32(stageInfo.stage);
        await cHelpersBin.writeULE32(stageInfo.executeBefore);
        await cHelpersBin.writeULE32(stageInfo.domainSize);
        await cHelpersBin.writeULE32(stageInfo.domainExtended);
        await cHelpersBin.writeULE32(stageInfo.nTemp1);
        await cHelpersBin.writeULE32(stageInfo.nTemp3);
        await cHelpersBin.writeULE32(stageInfo.nOps);
        for(let j = 0; j < stageInfo.nOps; j++) {
            await cHelpersBin.writeULE32(stageInfo.ops[j]);
        }
        await cHelpersBin.writeULE32(stageInfo.nArgs);
        for(let j = 0; j < stageInfo.nArgs; j++) {
            await cHelpersBin.writeULE64(stageInfo.args[j]);
        }
    }

    await endWriteSection(cHelpersBin);

    console.log("> Writing the chelpers file finished");

    await cHelpersBin.close();
}

exports.readCHelpersFile = async function (cHelpersFilename) {
    console.log("> Reading the chelpers file");

    const { fd: cHelpersBin, sections } = await readBinFile(cHelpersFilename, "chps", 1, 1 << 25, 1 << 23);

    const chelpers = [];

    console.log(`··· Reading Section ${CHELPERS_STAGES_SECTION}. CHelpers stages section`);
    await startReadUniqueSection(cHelpersBin, sections, CHELPERS_STAGES_SECTION);

    const nStages = await cHelpersBin.readULE32();

    for(let i = 0; i < nStages; i++) {
        const stageInfo = {};
        stageInfo.stage = await cHelpersBin.readULE32();
        stageInfo.executeBefore = await cHelpersBin.readULE32();
        stageInfo.domainSize = await cHelpersBin.readULE32();
        stageInfo.domainExtended = await cHelpersBin.readULE32();
        stageInfo.nTemp1 = await cHelpersBin.readULE32();
        stageInfo.nTemp3 = await cHelpersBin.readULE32();
        stageInfo.nOps = await cHelpersBin.readULE32();
        stageInfo.ops = [];
        for(let j = 0; j < stageInfo.nOps; j++) {
            stageInfo.ops[j] = await cHelpersBin.readULE32();
        }
        stageInfo.nArgs = await cHelpersBin.readULE32();
        stageInfo.args = [];
        for(let j = 0; j < stageInfo.nArgs; j++) {
            stageInfo.args[j] = await cHelpersBin.readULE64();
        }
        chelpers.push(stageInfo);
    }

    await endReadSection(cHelpersBin);

    console.log("> Reading the chelpers file finished");

    await cHelpersBin.close();

    return chelpers;
}