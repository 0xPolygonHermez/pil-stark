const { createBinFile,
    endWriteSection,
    startWriteSection
     } = require("@iden3/binfileutils");

const CHELPERS_NSECTIONS = 4;

const CHELPERS_HEADER_SECTION = 2;
const CHELPERS_STAGES_SECTION = 3;
const CHELPERS_BUFFERS_SECTION = 4;

exports.writeCHelpersFile = async function (cHelpersFilename, cHelpersInfo) {
    console.log("> Writing the chelpers file");

    const cHelpersBin = await createBinFile(cHelpersFilename, "chps", 1, CHELPERS_NSECTIONS, 1 << 22, 1 << 24);
    
    console.log(`··· Writing Section ${CHELPERS_HEADER_SECTION}. CHelpers header section`);
    await startWriteSection(cHelpersBin, CHELPERS_HEADER_SECTION);

    const ops = [];
    const args = [];
    const numbers = [];

    const opsOffset = [];
    const argsOffset = [];
    const numbersOffset = [];

    for(let i = 0; i < cHelpersInfo.length; i++) {
        if(i == 0) {
            opsOffset.push(0);
            argsOffset.push(0);
            numbersOffset.push(0);
        } else {
            opsOffset.push(opsOffset[i-1] + cHelpersInfo[i-1].ops.length);
            argsOffset.push(argsOffset[i-1] + cHelpersInfo[i-1].args.length);
            numbersOffset.push(numbersOffset[i-1] + cHelpersInfo[i-1].numbers.length);
        }
        for(let j = 0; j < cHelpersInfo[i].ops.length; j++) {
            ops.push(cHelpersInfo[i].ops[j]);
        }
        for(let j = 0; j < cHelpersInfo[i].args.length; j++) {
            args.push(cHelpersInfo[i].args[j]);
        }
        for(let j = 0; j < cHelpersInfo[i].numbers.length; j++) {
            numbers.push(cHelpersInfo[i].numbers[j]);
        }
    }

    await cHelpersBin.writeULE32(ops.length);
    await cHelpersBin.writeULE32(args.length);
    await cHelpersBin.writeULE32(numbers.length);

    await endWriteSection(cHelpersBin);
    
    console.log(`··· Writing Section ${CHELPERS_STAGES_SECTION}. CHelpers stages section`);
    await startWriteSection(cHelpersBin, CHELPERS_STAGES_SECTION);

    const nStages = cHelpersInfo.length;

    //Write the number of stages
    await cHelpersBin.writeULE32(nStages);

    for(let i = 0; i < nStages; i++) {
        const stageInfo = cHelpersInfo[i];

        await cHelpersBin.writeULE32(stageInfo.stage);
        await cHelpersBin.writeULE32(stageInfo.executeBefore);
        await cHelpersBin.writeULE32(stageInfo.nTemp1);
        await cHelpersBin.writeULE32(stageInfo.nTemp3);

        await cHelpersBin.writeULE32(stageInfo.ops.length);
        await cHelpersBin.writeULE32(opsOffset[i]);

        await cHelpersBin.writeULE32(stageInfo.args.length);
        await cHelpersBin.writeULE32(argsOffset[i]);

        await cHelpersBin.writeULE32(stageInfo.numbers.length);
        await cHelpersBin.writeULE32(numbersOffset[i]);        
    }

    await endWriteSection(cHelpersBin);

    console.log(`··· Writing Section ${CHELPERS_BUFFERS_SECTION}. CHelpers buffers section`);
    await startWriteSection(cHelpersBin, CHELPERS_BUFFERS_SECTION);

    const buffOps = new Uint8Array(ops.length);
    const buffOpsV = new DataView(buffOps.buffer);
    for(let j = 0; j < ops.length; j++) {
        buffOpsV.setUint8(j, ops[j], true);
    }
    await cHelpersBin.write(buffOps);
    // for(let j = 0; j < ops.length; j++) {
    //     await cHelpersBin.writeULE32(ops[j]);
    // }

    for(let j = 0; j < args.length; j++) {
        await cHelpersBin.writeULE32(args[j]);
    }

    const buffNumbers = new Uint8Array(8*numbers.length);
    const buffNumbersV = new DataView(buffNumbers.buffer);
    for(let j = 0; j < numbers.length; j++) {
        buffNumbersV.setBigUint64(8*j, BigInt(numbers[j]), true);
    }
    await cHelpersBin.write(buffNumbers);

    await endWriteSection(cHelpersBin);

    console.log("> Writing the chelpers file finished");

    await cHelpersBin.close();
}