const { getParserArgs } = require("./getParserArgs.js");
const { generateParser, getAllOperations } = require("./generateParser.js");
const { compileCode } = require("./helpers.js");

module.exports = async function buildCHelpers(starkInfo, config = {}) {

    let result = {};

    const code = [];
    const multipleCodeFiles = config && config.multipleCodeFiles;
    const optcodes = config && config.optcodes;

    const cHelpersInfo = [];

    const cHelpersStepsHppParserAVX = ["#if defined(PARSER_AVX) && !defined(PARSER_GENERIC)"];
    const cHelpersStepsHppExpressions = ["#ifndef PARSER_AVX"];

    const nStages = 3;

    let specific = false;

    const cHelpersStepsHpp = [
        "#ifndef CHELPERS_STEPS_HPP",
        "#define CHELPERS_STEPS_HPP",
        `#include "chelpers.hpp"\n\n`
    ];

    if(specific) cHelpersStepsHpp.push(...["#define PARSER_AVX true","#define PARSER_GENERIC true\n"]);
    cHelpersStepsHpp.push(...[
        "class CHelpersSteps {",
        "    public:",
        "        void calculateExpressions(StarkInfo starkInfo, StepsParams &params, ParserParams &parserParams, bool domainExtended);",
        "    private:",
    ]);

    if(specific) {
        cHelpersStepsHpp.push(...[
            "#if defined(PARSER_AVX) && defined(PARSER_GENERIC)",
            "        void parser_avx(StepsParams &params, ParserParams &parserParams, uint32_t rowStart, uint32_t rowEnd, uint32_t nrowsBatch, uint32_t domainSize, bool domainExtended, bool const includesEnds);",
            "#endif",
        ]);
    } else {
        cHelpersStepsHpp.push("        void parser_avx(StepsParams &params, ParserParams &parserParams, uint32_t rowStart, uint32_t rowEnd, uint32_t nrowsBatch, uint32_t domainSize, bool domainExtended, bool const includesEnds);");
    }

    const cHelpersStepsCpp = [`#include "chelpers_steps.hpp"`];
    if(specific) cHelpersStepsCpp.push("#if defined(PARSER_AVX) && defined(PARSER_GENERIC)");

    cHelpersStepsCpp.push(...[
        `\nvoid CHelpersSteps::calculateExpressions(StarkInfo starkInfo, StepsParams &params, ParserParams &parserParams, bool domainExtended) {`,
        `    uint32_t domainSize = domainExtended ? 1 << starkInfo.starkStruct.nBitsExt : 1 << starkInfo.starkStruct.nBits;`,
        `    uint32_t nrowsBatch = 4;`,
        `    uint32_t rowStart = 0;`,
        `    uint32_t rowEnd = domainSize - nrowsBatch;`,
    ]);
    if(specific) cHelpersStepsCpp.push("#if defined(PARSER_AVX) && defined(PARSER_GENERIC)");
    cHelpersStepsCpp.push(...[
        `    CHelpersSteps::parser_avx(params, parserParams, 0, rowStart, nrowsBatch, domainSize, domainExtended, true);`,
        `    CHelpersSteps::parser_avx(params, parserParams, rowStart, rowEnd, nrowsBatch, domainSize, domainExtended, false);`,
        `    CHelpersSteps::parser_avx(params, parserParams, rowEnd, domainSize, nrowsBatch, domainSize, domainExtended, true);`,
    ]);
    if(specific) cHelpersStepsCpp.push("#endif");


    const cHelpersStepsCppParserAVX = ["#if defined(PARSER_AVX) && !defined(PARSER_GENERIC)", `        switch (parserParams.stage) {`];
    const cHelpersStepsCppExpressions = ["#ifndef PARSER_AVX", `    switch (parserParams.stage) {`];

    let operations = getAllOperations();

    result.chelpers_generic_parser_cpp = generateParser(operations);

    let totalSubsetOperationsUsed = [];

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

    generateCode(nStages, `step${nStages}`, starkInfo[`step${nStages}prev`].first, "n");
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

    cHelpersStepsCppParserAVX.push("    }\n", "#endif");
    cHelpersStepsCppExpressions.push("    }\n", "#endif");

    if(specific) {
        cHelpersStepsCpp.push(...cHelpersStepsCppParserAVX);
        cHelpersStepsCpp.push(...cHelpersStepsCppExpressions);
    }

    cHelpersStepsCpp.push("}");


    result.chelpers_steps_cpp = cHelpersStepsCpp.join("\n");

    cHelpersStepsHppParserAVX.push("#endif");
    cHelpersStepsHppExpressions.push("#endif")

    if(specific) {
        cHelpersStepsHpp.push(...cHelpersStepsHppParserAVX);
        cHelpersStepsHpp.push(...cHelpersStepsHppExpressions);
    }
    
    cHelpersStepsHpp.push("};");
    cHelpersStepsHpp.push("\n#endif");

    result.chelpers_steps_hpp = cHelpersStepsHpp.join("\n"); 

    console.log("Generating generic parser with all " + totalSubsetOperationsUsed.length + " operations used");
    console.log("Total subset of operations used: " + totalSubsetOperationsUsed.sort().join(", "));
    console.log("--------------------------------");

    result.generic_parser_cpp = generateParser(operations, totalSubsetOperationsUsed);

    console.log(cHelpersInfo);
    if (multipleCodeFiles) {
        return {code: result, cHelpersInfo }
    } else {
        return {code: code.join("\n\n"), cHelpersInfo };
    }

    function generateCode(stage, stageName, stageCode, dom, executeBefore = true) {
        console.log("Generating code for " + stageName);
        if (optcodes && multipleCodeFiles) {
            const {stageInfo, operationsUsed} = getParserArgs(starkInfo, operations, stageCode, dom, stage, executeBefore);
            result[`${stageName}_parser_cpp`] = generateParser(operations, operationsUsed, stageName);
            for(let j = 0; j < operationsUsed.length; ++j) {
                if(!totalSubsetOperationsUsed.includes(operationsUsed[j])) totalSubsetOperationsUsed.push(operationsUsed[j]);
            }
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
