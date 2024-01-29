const { writeCHelpersFile } = require("./binFile.js");
const compileCode_parser = require("./compileCode_parser_new.js");
const { compileCode } = require("./helpers.js");
const path = require("path");

module.exports = async function buildCHelpers(starkInfo, config = {}) {

    const code = [];
    const multipleCodeFiles = config && config.multipleCodeFiles;
    const optcodes = config && config.optcodes;

    const cHelpersInfo = [];

    for (let i = 0; i < starkInfo.nPublics; i++) {
        if (starkInfo.publicsCode[i]) {
            code.push(compileCode(`${config.className}::publics_" + i + "_first`, starkInfo, starkInfo.publicsCode[i].first, "n", true));
            code.push(compileCode(`${config.className}::publics_" + i + "_i`, starkInfo, starkInfo.publicsCode[i].first, "n", true));
            code.push(compileCode(`${config.className}::publics_" + i + "_last`, starkInfo, starkInfo.publicsCode[i].first, "n", true));
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
        code.push(step2PrevParser.parserHPPCode);
        result.step2prev_parser_hpp = code.join("\n\n") + "\n";
        code.length = 0;
        if(step2PrevParser.parserCPPCode) {
            result.step2prev_parser_cpp = step2PrevParser.parserCPPCode;
        }
    }

    code.push(compileCode(`${config.className}::step2prev_first`, starkInfo, starkInfo.step2prev.first, "n"));
    code.push(compileCode(`${config.className}::step2prev_i`, starkInfo, starkInfo.step2prev.first, "n"));
    code.push(compileCode(`${config.className}::step2prev_last`, starkInfo, starkInfo.step2prev.first, "n"));

    if (multipleCodeFiles) {
        result.step2 = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        const step3PrevParser = compileCode_parser(starkInfo, config, starkInfo.step3prev.first, "n", 3, true)
        cHelpersInfo.push(step3PrevParser.stageInfo);
        code.push(step3PrevParser.parserHPPCode);
        result.step3prev_parser_hpp = code.join("\n\n") + "\n";
        code.length = 0;
        if(step3PrevParser.parserCPPCode) {
            result.step3prev_parser_cpp = step3PrevParser.parserCPPCode;
        }
    }

    code.push(compileCode(`${config.className}::step3prev_first`, starkInfo, starkInfo.step3prev.first, "n"));
    code.push(compileCode(`${config.className}::step3prev_i`, starkInfo, starkInfo.step3prev.first, "n"));
    code.push(compileCode(`${config.className}::step3prev_last`, starkInfo, starkInfo.step3prev.first, "n"));

    if (multipleCodeFiles) {
        result.step3prev = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        const step3Parser = compileCode_parser(starkInfo, config, starkInfo.step3.first, "n", 3, false);
        cHelpersInfo.push(step3Parser.stageInfo);
        code.push(step3Parser.parserHPPCode);
        result.step3_parser_hpp = code.join("\n\n") + "\n";
        code.length = 0;
        if(step3Parser.parserCPPCode) {
            result.step3_parser_cpp = step3Parser.parserCPPCode;
        }
    }

    code.push(compileCode(`${config.className}::step3_first`, starkInfo, starkInfo.step3.first, "n"));
    code.push(compileCode(`${config.className}::step3_i`, starkInfo, starkInfo.step3.first, "n"));
    code.push(compileCode(`${config.className}::step3_last`, starkInfo, starkInfo.step3.first, "n"));

    if (multipleCodeFiles) {
        result.step3 = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        const step42nsParser = compileCode_parser(starkInfo, config, starkInfo.step42ns.first, "2ns", 4, true);
        cHelpersInfo.push(step42nsParser.stageInfo);
        code.push(step42nsParser.parserHPPCode);
        result.step42ns_parser_hpp = code.join("\n\n") + "\n";
        code.length = 0;
        if(step42nsParser.parserCPPCode) {
            result.step42ns_parser_cpp = step42nsParser.parserCPPCode;
        }
    }
    code.push(compileCode(`${config.className}::step42ns_first`, starkInfo, starkInfo.step42ns.first, "2ns"));
    code.push(compileCode(`${config.className}::step42ns_i`, starkInfo, starkInfo.step42ns.first, "2ns"));
    code.push(compileCode(`${config.className}::step42ns_last`, starkInfo, starkInfo.step42ns.first, "2ns"));

    if (multipleCodeFiles) {
        result.step42ns = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        const step52nsParser = compileCode_parser(starkInfo, config, starkInfo.step52ns.first, "2ns", 5, true);
        cHelpersInfo.push(step52nsParser.stageInfo);
        code.push(step52nsParser.parserHPPCode);
        result.step52ns_parser_hpp = code.join("\n\n") + "\n";
        code.length = 0;
        if(step52nsParser.parserCPPCode) {
            result.step52ns_parser_cpp = step52nsParser.parserCPPCode;
        }
    }

    await writeCHelpersFile(config.binFile, cHelpersInfo);

    code.push(compileCode(`${config.className}::step52ns_first`, starkInfo, starkInfo.step52ns.first, "2ns"));
    code.push(compileCode(`${config.className}::step52ns_i`, starkInfo, starkInfo.step52ns.first, "2ns"));
    code.push(compileCode(`${config.className}::step52ns_last`, starkInfo, starkInfo.step52ns.first, "2ns"));

    if (multipleCodeFiles) {
        result.step52ns = code.join("\n\n") + "\n";
        return result;
    }

    return code.join("\n\n");
}
