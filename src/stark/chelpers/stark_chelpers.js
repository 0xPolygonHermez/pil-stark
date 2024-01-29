const { getParserArgs } = require("./getParserArgs.js");
const { generateParser, getAllOperations } = require("./generateParser.js");
const { compileCode } = require("./helpers.js");

module.exports = async function buildCHelpers(starkInfo, config = {}) {

    const isGeneric = config && config.isGeneric || true;

    let result = {};

    const code = [];
    const multipleCodeFiles = config && config.multipleCodeFiles;
    const optcodes = config && config.optcodes;

    const cHelpersInfo = [];

    let operations = getAllOperations();

    if(isGeneric) result.generic_parser_cpp = generateParser(operations);

    if (optcodes && multipleCodeFiles) {
        const {stageInfo: step2PrevStageInfo, operationsUsed} = getParserArgs(starkInfo, operations, starkInfo.step2prev.first, "n", 2, true);
        if(!isGeneric) result.step2prev_parser_cpp = generateParser(operations, operationsUsed);
        cHelpersInfo.push(step2PrevStageInfo);
    }

    code.push(compileCode(`${config.className}::step2prev`, starkInfo, starkInfo.step2prev.first, "n"));

    if (multipleCodeFiles) {
        result.step2 = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        const {stageInfo: step3PrevStageInfo, operationsUsed} = getParserArgs(starkInfo, operations, starkInfo.step3prev.first, "n", 3, true)
        if(!isGeneric) result.step3prev_parser_cpp = generateParser(operations, operationsUsed);
        cHelpersInfo.push(step3PrevStageInfo);

    }

    code.push(compileCode(`${config.className}::step3prev`, starkInfo, starkInfo.step3prev.first, "n"));

    if (multipleCodeFiles) {
        result.step3prev = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        const {stageInfo: step3StageInfo, operationsUsed} = getParserArgs(starkInfo, operations, starkInfo.step3.first, "n", 3, false);
        if(!isGeneric) result.step3_parser_cpp = generateParser(operations, operationsUsed);
        cHelpersInfo.push(step3StageInfo);
    }

    code.push(compileCode(`${config.className}::step3`, starkInfo, starkInfo.step3.first, "n"));

    if (multipleCodeFiles) {
        result.step3 = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        const {stageInfo: step42nsStageInfo, operationsUsed} = getParserArgs(starkInfo, operations, starkInfo.step42ns.first, "2ns", 4, true);
        if(!isGeneric) result.step42ns_parser_cpp = generateParser(operations, operationsUsed);
        cHelpersInfo.push(step42nsStageInfo);
    }
    code.push(compileCode(`${config.className}::step42ns`, starkInfo, starkInfo.step42ns.first, "2ns"));

    if (multipleCodeFiles) {
        result.step42ns = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        const {stageInfo: step52nsStageInfo, operationsUsed} = getParserArgs(starkInfo, operations, starkInfo.step52ns.first, "2ns", 5, true);
        if(!isGeneric) result.step52ns_parser_cpp = generateParser(operations, operationsUsed);
        cHelpersInfo.push(step52nsStageInfo);
    }

    code.push(compileCode(`${config.className}::step52ns`, starkInfo, starkInfo.step52ns.first, "2ns"));

    if (multipleCodeFiles) {
        result.step52ns = code.join("\n\n") + "\n";
        return {code: result, cHelpersInfo }
    }

    return {code: code.join("\n\n"), cHelpersInfo };
}
