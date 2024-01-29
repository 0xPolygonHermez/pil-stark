const { writeCHelpersFile } = require("./binFile.js");
const compileCode_parser = require("./compileCode_parser.js");
const { compileCode } = require("./helpers.js");

module.exports = async function buildCHelpers(starkInfo, config = {}) {

    const code = [];
    const multipleCodeFiles = config && config.multipleCodeFiles;
    const optcodes = config && config.optcodes;

    const cHelpersInfo = [];

    for (let i = 0; i < starkInfo.nPublics; i++) {
        if (starkInfo.publicsCode[i]) {
            code.push(compileCode(`${config.className}::publics_" + i`, starkInfo, starkInfo.publicsCode[i].first, "n", true));
        }
    }

    const pubTable = [];
    pubTable.push("publics = (")
    for (let i = 0; i < starkInfo.nPublics; i++) {
        const comma = i == 0 ? "     " : "     ,";
        if (starkInfo.publicsCode[i]) {
            pubTable.push(`${comma}(publics_${i}_first, publics_${i}_i,  publics_${i}_last)`);
        } else {
            pubTable.push(`${comma}(NULL,NULL,NULL)`);
        }
    }
    pubTable.push(");");

    let result = {};

    if (multipleCodeFiles) {
        result.public = pubTable.join("\n") + "\n";
    }
    else {
        code.push(pubTable.join("\n"));
    }

    if (optcodes && multipleCodeFiles) {
        const step2PrevParser = compileCode_parser(starkInfo, config, starkInfo.step2prev.first, "n", 2, true);
        cHelpersInfo.push(step2PrevParser.stageInfo);
        if(step2PrevParser.parserCPPCode) {
            result.step2prev_parser_cpp = step2PrevParser.parserCPPCode;
        }
    }

    code.push(compileCode(`${config.className}::step2prev`, starkInfo, starkInfo.step2prev.first, "n"));

    if (multipleCodeFiles) {
        result.step2 = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        const step3PrevParser = compileCode_parser(starkInfo, config, starkInfo.step3prev.first, "n", 3, true)
        cHelpersInfo.push(step3PrevParser.stageInfo);
        if(step3PrevParser.parserCPPCode) {
            result.step3prev_parser_cpp = step3PrevParser.parserCPPCode;
        }
    }

    code.push(compileCode(`${config.className}::step3prev`, starkInfo, starkInfo.step3prev.first, "n"));

    if (multipleCodeFiles) {
        result.step3prev = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        const step3Parser = compileCode_parser(starkInfo, config, starkInfo.step3.first, "n", 3, false);
        cHelpersInfo.push(step3Parser.stageInfo);
        if(step3Parser.parserCPPCode) {
            result.step3_parser_cpp = step3Parser.parserCPPCode;
        }
    }

    code.push(compileCode(`${config.className}::step3`, starkInfo, starkInfo.step3.first, "n"));

    if (multipleCodeFiles) {
        result.step3 = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        const step42nsParser = compileCode_parser(starkInfo, config, starkInfo.step42ns.first, "2ns", 4, true);
        cHelpersInfo.push(step42nsParser.stageInfo);
        if(step42nsParser.parserCPPCode) {
            result.step42ns_parser_cpp = step42nsParser.parserCPPCode;
        }
    }
    code.push(compileCode(`${config.className}::step42ns`, starkInfo, starkInfo.step42ns.first, "2ns"));

    if (multipleCodeFiles) {
        result.step42ns = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        const step52nsParser = compileCode_parser(starkInfo, config, starkInfo.step52ns.first, "2ns", 5, true);
        cHelpersInfo.push(step52nsParser.stageInfo);
        if(step52nsParser.parserCPPCode) {
            result.step52ns_parser_cpp = step52nsParser.parserCPPCode;
        }
    }

    await writeCHelpersFile(config.binFile, cHelpersInfo);

    code.push(compileCode(`${config.className}::step52ns`, starkInfo, starkInfo.step52ns.first, "2ns"));

    if (multipleCodeFiles) {
        result.step52ns = code.join("\n\n") + "\n";
        return result;
    }

    return code.join("\n\n");
}
