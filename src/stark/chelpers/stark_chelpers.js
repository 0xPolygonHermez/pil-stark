const { getParserArgs } = require("./getParserArgs.js");
const { generateParser } = require("./generateParser.js");
const { compileCode } = require("./helpers.js");

module.exports = async function buildCHelpers(starkInfo, config = {}) {

    const isGeneric = config && config.isGeneric || false;

    let result = {};

    const code = [];
    const multipleCodeFiles = config && config.multipleCodeFiles;
    const optcodes = config && config.optcodes;

    const cHelpersInfo = [];

    let operations;

    if(isGeneric) {
        const parser = generateParser();
        operations = parser.operations;
        result.generic_parser_cpp = parser.parserCPPCode;
    }

    if (optcodes && multipleCodeFiles) {
        if(!isGeneric) {
            const parser = generateParser(starkInfo.step2prev.first);
            operations = parser.operations;
            result.step2prev_parser_cpp = parser.parserCPPCode;
        }
        const step2StageInfo = getParserArgs(starkInfo, operations, starkInfo.step2prev.first, "n", 2, true);
        cHelpersInfo.push(step2StageInfo);
    }

    code.push(compileCode(`${config.className}::step2prev`, starkInfo, starkInfo.step2prev.first, "n"));

    if (multipleCodeFiles) {
        result.step2 = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        if(!isGeneric) {
            const parser = generateParser(starkInfo.step3prev.first);
            operations = parser.operations;
            result.step3prev_parser_cpp = parser.parserCPPCode;
        }
        const step3PrevStageInfo = getParserArgs(starkInfo, operations, starkInfo.step3prev.first, "n", 3, true)
        cHelpersInfo.push(step3PrevStageInfo);

    }

    code.push(compileCode(`${config.className}::step3prev`, starkInfo, starkInfo.step3prev.first, "n"));

    if (multipleCodeFiles) {
        result.step3prev = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        if(!isGeneric) {
            const parser = generateParser(starkInfo.step3.first);
            operations = parser.operations;
            result.step3_parser_cpp = parser.parserCPPCode;
        }
        const step3StageInfo = getParserArgs(starkInfo, operations, starkInfo.step3.first, "n", 3, false);
        cHelpersInfo.push(step3StageInfo);
    }

    code.push(compileCode(`${config.className}::step3`, starkInfo, starkInfo.step3.first, "n"));

    if (multipleCodeFiles) {
        result.step3 = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        if(!isGeneric) {
            const parser = generateParser(starkInfo.step42ns.first);
            operations = parser.operations;
            result.step42ns_parser_cpp = parser.parserCPPCode;
        }
        const step42nsStageInfo = getParserArgs(starkInfo, operations, starkInfo.step42ns.first, "2ns", 4, true);
        cHelpersInfo.push(step42nsStageInfo);
    }
    code.push(compileCode(`${config.className}::step42ns`, starkInfo, starkInfo.step42ns.first, "2ns"));

    if (multipleCodeFiles) {
        result.step42ns = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        if(!isGeneric) {
            const parser = generateParser(starkInfo.step52ns.first);
            operations = parser.operations;
            result.step52ns_parser_cpp = parser.parserCPPCode;
        }
        const step52nsStageInfo = getParserArgs(starkInfo, operations, starkInfo.step52ns.first, "2ns", 5, true);
        cHelpersInfo.push(step52nsStageInfo);
    }

    code.push(compileCode(`${config.className}::step52ns`, starkInfo, starkInfo.step52ns.first, "2ns"));

    if (multipleCodeFiles) {
        result.step52ns = code.join("\n\n") + "\n";
        return {code: result, cHelpersInfo }
    }

    return {code: code.join("\n\n"), cHelpersInfo };
}
