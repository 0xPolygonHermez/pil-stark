const { getParserArgs } = require("./getParserArgs.js");
const { generateParser, getAllOperations } = require("./generateParser.js");
const { compileCode } = require("./helpers.js");

module.exports = async function buildCHelpers(starkInfo, config = {}) {

    let result = {};

    const code = [];
    const multipleCodeFiles = config && config.multipleCodeFiles;
    const optcodes = config && config.optcodes;

    const cHelpersInfo = [];

    const cHelpersStepsHppParserAVX = [];
    const cHelpersStepsHppExpressions = [];

    const nStages = 3;

    const cHelpersStepsHpp = [
        `#include "chelpers.hpp"\n\n`,
        "#define PARSER_AVX true",
        "#define PARSER_GENERIC true\n",
        "class CHelpersSteps {",
        "    public:",
        "        void calculateExpressions(StarkInfo starkInfo, StepsParams &params, ParserParams &parserParams, bool domainExtended);",
        "    private:",
        "#ifdef PARSER_AVX",
        "    #ifdef PARSER_GENERIC",
        "        void parser_avx(StepsParams &params, ParserParams &parserParams, uint32_t rowStart, uint32_t rowEnd, uint32_t nrowsBatch, uint32_t domainSize, bool domainExtended, bool const includesEnds);",
        "    #else",
    ];

    const cHelpersStepsCpp = [
        `#include "chelpers_steps.hpp"\n`,
        `void calculateExpressions(StarkInfo starkInfo, StepsParams &params, ParserParams &parserParams, bool domainExtended) {`,
        `    uint32_t domainSize = domainExtended ? 1 << starkInfo.starkStruct.nBitsExt : 1 << starkInfo.starkStruct.nBits;`,
        `    uint32_t nrowsBatch = 4;`,
        `    uint32_t rowStart = 0;`,
        `    uint32_t rowEnd = domainSize - nrowsBatch;`,
        `#ifdef PARSER_AVX`,
        "    #ifdef PARSER_GENERIC",
        `        parser_avx(params, parserParams, 0, rowStart, nrowsBatch, domainSize, domainExtended, true);`,
        `        parser_avx(params, parserParams, rowStart, rowEnd, nrowsBatch, domainSize, domainExtended, false);`,
        `        parser_avx(params, parserParams, rowEnd, nrowsBatch, domainSize, domainExtended, true);`,
        
    ];

    const cHelpersStepsCppParserAVX = ["    #else", `        switch (parserParams.stage) {`];
    const cHelpersStepsCppExpressions = ["#else", `    switch (parserParams.stage) {`];

    let operations = getAllOperations();

    result.generic_parser_cpp = generateParser(operations);

    for(let i = 1; i < nStages - 1; ++i) {
        let stage = i + 1;
        generateCode(stage, `step${stage}`, starkInfo[`step${stage}prev`].first, "n");
        
        cHelpersStepsCppParserAVX.push(...[
            `            case ${stage}:`,
            `                CHelpersSteps::step${stage}_parser_avx(params, parserParams, 0, rowStart, nrowsBatch, domainSize, false, true);`,
            `                CHelpersSteps::step${stage}_parser_avx(params, parserParams, rowStart, rowEnd, nrowsBatch, domainSize, false, false);`,
            `                CHelpersSteps::step${stage}_parser_avx(params, parserParams, rowEnd, nrowsBatch, domainSize, false, true);`,
            `                break;`
        ])
        cHelpersStepsCppExpressions.push(...[
            `        case ${stage}:`,
            `            CHelpersSteps::step${stage}(params, domainSize);`,
            `            break;`
        ])
    }

    generateCode(nStages, `step${nStages}`, starkInfo[`step${nStages}prev`].first, "n", false);
    generateCode(nStages, `step${nStages}_after`, starkInfo[`step${nStages}`].first, "n", false);
    cHelpersStepsCppParserAVX.push(...[
        `            case ${nStages}:`,
        "                if(parserParams.executeBefore) {",
        `                    CHelpersSteps::step${nStages}_parser_avx(params, parserParams, 0, rowStart, nrowsBatch, domainSize, false, true);`,
        `                    CHelpersSteps::step${nStages}_parser_avx(params, parserParams, rowStart, rowEnd, nrowsBatch, domainSize, false, false);`,
        `                    CHelpersSteps::step${nStages}_parser_avx(params, parserParams, rowEnd, nrowsBatch, domainSize, false, true);`,
        "                } else {",
        `                    CHelpersSteps::step${nStages}_after_parser_avx(params, parserParams, 0, rowStart, nrowsBatch, domainSize, false, true);`,
        `                    CHelpersSteps::step${nStages}_after_parser_avx(params, parserParams, rowStart, rowEnd, nrowsBatch, domainSize, false, false);`,
        `                    CHelpersSteps::step${nStages}_after_parser_avx(params, parserParams, rowEnd, nrowsBatch, domainSize, false, true);`,
        "                }",
        `                break;`
    ])
    cHelpersStepsCppExpressions.push(...[
        `        case ${nStages}:`,
        "            if(parserParams.executeBefore) {",
        `               CHelpersSteps::step${nStages}(params, domainSize);`,
        "            } else {",
        `               CHelpersSteps::step${nStages}_after(params, domainSize);`,
        "            }",
        `            break;`
    ])

    generateCode(nStages + 1, `step${nStages + 1}`, starkInfo[`step${nStages + 1}2ns`].first, "2ns");
    cHelpersStepsCppParserAVX.push(...[
        `            case ${nStages + 1}:`,
        `                CHelpersSteps::step${nStages + 1}_parser_avx(params, parserParams, 0, rowStart, nrowsBatch, domainSize, true, true);`,
        `                CHelpersSteps::step${nStages + 1}_parser_avx(params, parserParams, rowStart, rowEnd, nrowsBatch, domainSize, true, false);`,
        `                CHelpersSteps::step${nStages + 1}_parser_avx(params, parserParams, rowEnd, nrowsBatch, domainSize, true, true);`,
        `                break;`
    ])
    cHelpersStepsCppExpressions.push(...[
        `        case ${nStages + 1}:`,
        `            CHelpersSteps::step${nStages + 1}(params, domainSize);`,
        `            break;`
    ])

    generateCode(nStages + 2, `step${nStages + 2}`, starkInfo[`step${nStages + 2}2ns`].first, "2ns");
    cHelpersStepsCppParserAVX.push(...[
        `            case ${nStages + 2}:`,
        `                CHelpersSteps::step${nStages + 2}_parser_avx(params, parserParams, 0, rowStart, nrowsBatch, domainSize, true, true);`,
        `                CHelpersSteps::step${nStages + 2}_parser_avx(params, parserParams, rowStart, rowEnd, nrowsBatch, domainSize, true, false);`,
        `                CHelpersSteps::step${nStages + 2}_parser_avx(params, parserParams, rowEnd, nrowsBatch, domainSize, true, true);`,
        `                break;`
    ])
    cHelpersStepsCppExpressions.push(...[
        `        case ${nStages + 2}:`,
        `            CHelpersSteps::step${nStages + 2}(params, domainSize);`,
        `            break;`
    ])

    cHelpersStepsCpp.push(...[...cHelpersStepsCppParserAVX, "        }"]);
    cHelpersStepsCpp.push("    #endif");
    cHelpersStepsCpp.push(...[...cHelpersStepsCppExpressions, "    }"]);
    cHelpersStepsCpp.push(...[
        "#endif",
        "}",
    ]);


    result.chelpers_steps_cpp = cHelpersStepsCpp.join("\n");

    cHelpersStepsHpp.push(...cHelpersStepsHppParserAVX);
    cHelpersStepsHpp.push("    #endif");
    cHelpersStepsHpp.push("#else")
    cHelpersStepsHpp.push(...cHelpersStepsHppExpressions);
    cHelpersStepsHpp.push("#endif")
    cHelpersStepsHpp.push("};");

    result.chelpers_steps_hpp = cHelpersStepsHpp.join("\n"); 

    if (multipleCodeFiles) {
        return {code: result, cHelpersInfo }
    } else {
        return {code: code.join("\n\n"), cHelpersInfo };
    }

    function generateCode(stage, stageName, stageCode, dom, executeBefore = true) {
        console.log("Generating code for " + stageName);
        if (optcodes && multipleCodeFiles) {
            const {stageInfo, operationsUsed} = getParserArgs(starkInfo, operations, stageCode, dom, stage, executeBefore);
            result[`${stageName}_parser_cpp`] = generateParser(operations, stageName, operationsUsed);
            cHelpersInfo.push(stageInfo);
        }
    
        code.push(compileCode(`CHelpersSteps::${stageName}`, starkInfo, stageCode, dom));
        cHelpersStepsHppExpressions.push(`        void ${stageName}(StepsParams &params, uint32_t N);`);

        if (multipleCodeFiles) {
            result[stageName + "_cpp"] = code.join("\n\n") + "\n";
            code.length = 0;
        }

        cHelpersStepsHppParserAVX.push(`        void ${stageName}_parser_avx(StepsParams &params, ParserParams &parserParams, uint32_t rowStart, uint32_t rowEnd, uint32_t nrowsBatch, uint32_t domainSize, bool domainExtended, bool const includesEnds);`);
    }
}
