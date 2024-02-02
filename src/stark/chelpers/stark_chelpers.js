const { getParserArgs } = require("./getParserArgs.js");
const { generateParser, getAllOperations } = require("./generateParser.js");
const { findPatterns } = require("./helpers.js");
const _ = require('lodash');

module.exports = async function buildCHelpers(starkInfo, className = "") {

    let result = {};
    
    const patternsAdded = [];

    const cHelpersInfo = [];

    const cHelpersStepsHppParserAVX = [];
    const cHelpersStepsCppParserAVX = [`    } else {`, `        switch (parserParams.stage) {`];

    const nStages = 3;

    const cHelpersStepsHpp = [
        `#include "chelpers_steps.hpp"\n\n`,
        `class ${className} : public CHelpersSteps {`,
        "    public:",
        "        void calculateExpressions(StarkInfo starkInfo, StepsParams &params, ParserParams &parserParams, bool useGeneric);",
        "    private:",
        "        void parser_avx(StepsParams &params, ParserParams &parserParams, uint32_t rowStart, uint32_t rowEnd, uint32_t nrowsBatch, uint32_t domainSize, bool domainExtended, bool const includesEnds);"
    ];
    
    const cHelpersStepsCpp = [
        `#include "${className}.hpp"\n`,
        `void ${className}::calculateExpressions(StarkInfo starkInfo, StepsParams &params, ParserParams &parserParams, bool useGeneric) {`,
        `    bool domainExtended = parserParams.stage > 3 ? true : false;`,
        `    uint32_t domainSize = domainExtended ? 1 << starkInfo.starkStruct.nBitsExt : 1 << starkInfo.starkStruct.nBits;`,
        `    uint32_t nrowsBatch = 4;`,
        `    uint32_t rowStart = 0;`,
        `    uint32_t rowEnd =  domainExtended ? domainSize - FIELD_EXTENSION*nrowsBatch : domainSize - nrowsBatch;`,
        `    if(useGeneric) {`,
        `        ${className}::parser_avx(params, parserParams, 0, rowStart, nrowsBatch, domainSize, domainExtended, true);`,
        `        ${className}::parser_avx(params, parserParams, rowStart, rowEnd, nrowsBatch, domainSize, domainExtended, false);`,
        `        ${className}::parser_avx(params, parserParams, rowEnd, domainSize, nrowsBatch, domainSize, domainExtended, true);`,
    ];
   
    let operations = getAllOperations();
    let operationsUsed = {};

    let totalSubsetOperationsUsed = [];

    for(let i = 1; i < nStages - 1; ++i) {
        let stage = i + 1;
        getParserArgsStage(stage, `step${stage}`, starkInfo[`step${stage}prev`].first, "n");
    }

    getParserArgsStage(nStages, `step${nStages}`, starkInfo[`step${nStages}prev`].first, "n");
    getParserArgsStage(nStages, `step${nStages}_after`, starkInfo[`step${nStages}`].first, "n", false);
    
    getParserArgsStage(nStages + 1, `step${nStages + 1}`, starkInfo[`step${nStages + 1}2ns`].first, "2ns");
    getParserArgsStage(nStages + 2, `step${nStages + 2}`, starkInfo[`step${nStages + 2}2ns`].first, "2ns");

    totalSubsetOperationsUsed = totalSubsetOperationsUsed.sort((a, b) => a - b);
    console.log("Generating generic parser with all " + totalSubsetOperationsUsed.length + " operations used");
    console.log("Total subset of operations used: " + totalSubsetOperationsUsed.join(", "));
    console.log("--------------------------------");
    
    result[`${className}_generic_parser_cpp`] = generateParser(className, "", operations, totalSubsetOperationsUsed);

    for(let i = 0; i < cHelpersInfo.length; ++i) {
        const stage = cHelpersInfo[i].stage;
        const executeBefore = cHelpersInfo[i].executeBefore;

        let stageName = `step${stage}`;
        if(!executeBefore) stageName += "_after";
        console.log("Generating code for " + stageName);

        const opsUsed = operationsUsed[stageName];
        result[`${className}_${stageName}_parser_cpp`] = generateParser(className, stageName, operations, opsUsed);
        cHelpersStepsHppParserAVX.push(`        void ${stageName}_parser_avx(StepsParams &params, ParserParams &parserParams, uint32_t rowStart, uint32_t rowEnd, uint32_t nrowsBatch, uint32_t domainSize, bool domainExtended, bool const includesEnds);`);
        if(stage == nStages && !executeBefore) {
            cHelpersStepsCppParserAVX.push(...[
                `            case ${nStages}:`,
                "                if(parserParams.executeBefore) {",
                `                    ${className}::step${nStages}_parser_avx(params, parserParams, 0, rowStart, nrowsBatch, domainSize, false, true);`,
                `                    ${className}::step${nStages}_parser_avx(params, parserParams, rowStart, rowEnd, nrowsBatch, domainSize, false, false);`,
                `                    ${className}::step${nStages}_parser_avx(params, parserParams, rowEnd, domainSize, nrowsBatch, domainSize, false, true);`,
                "                } else {",
                `                    ${className}::step${nStages}_after_parser_avx(params, parserParams, 0, rowStart, nrowsBatch, domainSize, false, true);`,
                `                    ${className}::step${nStages}_after_parser_avx(params, parserParams, rowStart, rowEnd, nrowsBatch, domainSize, false, false);`,
                `                    ${className}::step${nStages}_after_parser_avx(params, parserParams, rowEnd, domainSize, nrowsBatch, domainSize, false, true);`,
                "                }",
                `                break;`
            ])
        }  else if(stage !== nStages) {
            cHelpersStepsCppParserAVX.push(...[
                `            case ${stage}:`,
                `                ${className}::step${stage}_parser_avx(params, parserParams, 0, rowStart, nrowsBatch, domainSize, false, true);`,
                `                ${className}::step${stage}_parser_avx(params, parserParams, rowStart, rowEnd, nrowsBatch, domainSize, false, false);`,
                `                ${className}::step${stage}_parser_avx(params, parserParams, rowEnd, domainSize, nrowsBatch, domainSize, false, true);`,
                `                break;`
            ])
        }
    }

    cHelpersStepsCppParserAVX.push("        }");
    cHelpersStepsCpp.push(...cHelpersStepsCppParserAVX);
    cHelpersStepsCpp.push("    }");
    cHelpersStepsCpp.push("}");

    cHelpersStepsHpp.push(...cHelpersStepsHppParserAVX);
    cHelpersStepsHpp.push("};");


    result[`${className}_cpp`] = cHelpersStepsCpp.join("\n");
    result[`${className}_hpp`] = cHelpersStepsHpp.join("\n"); 

    console.log("Number of patterns added: " + patternsAdded.length);
    for(let j = 0; j < patternsAdded.length; ++j) {
        console.log("[", patternsAdded[j].join(", ") + "]");
    }
    
    // Set case to consecutive numbers
    // for(let i = 0; i < cHelpersInfo.length; ++i) {
    //     let stageName = `step${cHelpersInfo[i].stage}`;
    //     if(!cHelpersInfo[i].executeBefore) stageName += "_after";
    //     cHelpersInfo[i].ops = cHelpersInfo[i].ops.map(op => totalSubsetOperationsUsed.findIndex(o => o === op));

    //     result[`${className}_${stageName}_parser_cpp`] = result[`${className}_${stageName}_parser_cpp`].replace(/case (\d+):/g, (match, caseNumber) => {
    //         caseNumber = parseInt(caseNumber, 10);
    //         const newIndex = totalSubsetOperationsUsed.findIndex(o => o === caseNumber);
    //         if(newIndex === -1) throw new Error("Invalid operation!");
    //         return `case ${newIndex}:`;
    //     });
        
    // }
    // result[`${className}_generic_parser_cpp`] = result[`${className}_generic_parser_cpp`].replace(/case (\d+):/g, (match, caseNumber) => {
    //     caseNumber = parseInt(caseNumber, 10);
    //     const newIndex = totalSubsetOperationsUsed.findIndex(o => o === caseNumber);
    //     if(newIndex === -1) throw new Error("Invalid operation!");
    //     return `case ${newIndex}:`;
    // });

    return {code: result, cHelpersInfo };

    function getParserArgsStage(stage, stageName, stageCode, dom, executeBefore = true) {
        console.log(`Getting parser args for ${stageName}`);

        const {stageInfo, operationsUsed: opsUsed} = getParserArgs(starkInfo, operations, stageCode, dom, stage, executeBefore);

        const patterns = findPatterns(stageInfo.ops);
        
        console.log("Number of operations before join: " + stageInfo.nOps);

        for(let i = 0; i < patterns.length; ++i) {
            const sequence = patterns[i];
            let opIndex;
            if(!patternsAdded.some(subArray => _.isEqual(subArray, sequence))) {
                patternsAdded.push(sequence);
                opIndex = operations.length;
                operations.push({isGroupOps: true, ops: sequence});
            } else {
                opIndex = operations.findIndex(subArray => _.isEqual(subArray.ops, sequence));
                if(opIndex === -1) throw new Error("Something went wrong");
            }

            let opsString = stageInfo.ops.join(", ");
            let patternString = sequence.join(", ");
            opsString = opsString.replace(new RegExp(patternString, "g"), `${opIndex}`);
            stageInfo.ops = opsString.split(", ");

            opsUsed.push(opIndex);
        }

        stageInfo.nOps = stageInfo.ops.length;

        console.log("Number of operations after join: " + stageInfo.nOps);

        cHelpersInfo.push(stageInfo);
        for(let j = 0; j < opsUsed.length; ++j) {
            if(!totalSubsetOperationsUsed.includes(opsUsed[j])) totalSubsetOperationsUsed.push(opsUsed[j]);
        }

        operationsUsed[stageName] = opsUsed;   
    }
}
