const { getParserArgs } = require("./getParserArgs.js");
const { generateParser, getAllOperations } = require("./generateParser.js");
const { findPatterns } = require("./helpers.js");
const { writeCHelpersFile } = require("./binFile.js");
const path = require("path");
const fs = require("fs");
const { mkdir } = require("fs/promises");

module.exports = async function buildCHelpers(starkInfo, cHelpersFile, binFile, className = "", multiple = false) {

    if(className === "") className = "Stark";
    className = className[0].toUpperCase() + className.slice(1) + "Steps";

    let result = {};
    
    const cHelpersInfo = [];

    const cHelpersStepsHppParserAVX = [];
    const cHelpersStepsCppParserAVX = [`    } else {`, `        switch (parserParams.stage) {`];

    const nStages = 3;

    const cHelpersStepsHpp = [
        `#include "chelpers_steps.hpp"\n\n`,
        `class ${className} : public CHelpersSteps {`,
        "    public:",
        "        void calculateExpressions(StarkInfo &starkInfo, StepsParams &params, ParserArgs &parserArgs, ParserParams &parserParams, bool useGeneric);",
        "    private:",
        "        void parser_avx(StarkInfo &starkInfo, StepsParams &params, ParserArgs &parserArgs, ParserParams &parserParams, uint32_t nrowsBatch, bool domainExtended);"
    ];
    
    const cHelpersStepsCpp = [
        `#include "${className}.hpp"\n`,
        `void ${className}::calculateExpressions(StarkInfo &starkInfo, StepsParams &params, ParserArgs &parserArgs, ParserParams &parserParams, bool useGeneric) {`,
        `    uint32_t nrowsBatch = 4;`,
    ];
    if(multiple) cHelpersStepsCpp.push(`    if(useGeneric) {`);
    cHelpersStepsCpp.push(...[
        `        bool domainExtended = parserParams.stage > 3 ? true : false;`,
        `        ${className}::parser_avx(starkInfo, params, parserArgs, parserParams, nrowsBatch, domainExtended);`,
    ]);
   
    let operations = getAllOperations();
    let operationsUsed = {};

    let totalSubsetOperationsUsed = [];

    //Define mapOffsetCol
    let nrowsbatch = 4 + (1 << (starkInfo.starkStruct.nBitsExt - starkInfo.starkStruct.nBits));
    starkInfo.mapOffsetsCol = {};
    starkInfo.mapOffsetsCol.cm1_n = nrowsbatch * starkInfo.nConstants;
    starkInfo.mapOffsetsCol.cm2_n = starkInfo.mapOffsetsCol.cm1_n + nrowsbatch * starkInfo.mapSectionsN.cm1_n;
    starkInfo.mapOffsetsCol.cm3_n = starkInfo.mapOffsetsCol.cm2_n + nrowsbatch * starkInfo.mapSectionsN.cm2_n;
    starkInfo.mapOffsetsCol.tmpExp_n = starkInfo.mapOffsetsCol.cm3_n + nrowsbatch * starkInfo.mapSectionsN.cm3_n;

    starkInfo.mapOffsetsCol.cm1_2ns = nrowsbatch * starkInfo.nConstants;
    starkInfo.mapOffsetsCol.cm2_2ns = starkInfo.mapOffsetsCol.cm1_2ns + nrowsbatch * starkInfo.mapSectionsN.cm1_2ns;
    starkInfo.mapOffsetsCol.cm3_2ns = starkInfo.mapOffsetsCol.cm2_2ns + nrowsbatch * starkInfo.mapSectionsN.cm2_2ns;
    starkInfo.mapOffsetsCol.cm4_2ns = starkInfo.mapOffsetsCol.cm3_2ns + nrowsbatch * starkInfo.mapSectionsN.cm3_2ns;

    for(let i = 1; i < nStages - 1; ++i) {
        let stage = i + 1;
        getParserArgsStage(stage, `step${stage}`, starkInfo[`step${stage}prev`].code, "n");
    }

    getParserArgsStage(nStages, `step${nStages}`, starkInfo[`step${nStages}prev`].code, "n");
    getParserArgsStage(nStages, `step${nStages}_after`, starkInfo[`step${nStages}`].code, "n", false);
    
    getParserArgsStage(nStages + 1, `step${nStages + 1}`, starkInfo[`step${nStages + 1}2ns`].code, "2ns");
    getParserArgsStage(nStages + 2, `step${nStages + 2}`, starkInfo[`step${nStages + 2}2ns`].code, "2ns");

    totalSubsetOperationsUsed = totalSubsetOperationsUsed.sort((a, b) => a - b);
    console.log("Generating generic parser with all " + totalSubsetOperationsUsed.length + " operations used");
    console.log("Total subset of operations used: " + totalSubsetOperationsUsed.join(", "));
    console.log("--------------------------------");
    
    result[`${className}_generic_parser_cpp`] = generateParser(className, "", operations, totalSubsetOperationsUsed, true);

    for(let i = 0; i < cHelpersInfo.length; ++i) {
        const stage = cHelpersInfo[i].stage;
        const executeBefore = cHelpersInfo[i].executeBefore;

        let stageName = `step${stage}`;
        if(!executeBefore) stageName += "_after";
        console.log("Generating code for " + stageName);

        const opsUsed = operationsUsed[stageName];
        const vectorizeEvals = stage === nStages + 2 ? true : false;
        if(multiple) result[`${className}_${stageName}_parser_cpp`] = generateParser(className, stageName, operations, opsUsed, vectorizeEvals);
        cHelpersStepsHppParserAVX.push(`        void ${stageName}_parser_avx(StarkInfo &starkInfo, StepsParams &params, ParserArgs &parserArgs, ParserParams &parserParams, uint32_t nrowsBatch, bool domainExtended);`);
        const domainExtended = stage > nStages ? true : false;
        if(stage == nStages && !executeBefore) {
            cHelpersStepsCppParserAVX.push(...[
                `            case ${nStages}:`,
                "                if(parserParams.executeBefore) {",
                `                    ${className}::step${nStages}_parser_avx(starkInfo, params, parserParams, nrowsBatch, ${domainExtended});`,
                "                } else {",
                `                    ${className}::step${nStages}_after_parser_avx(starkInfo, params, parserParams, nrowsBatch, ${domainExtended});`,
                "                }",
                `                break;`
            ])
        }  else if(stage !== nStages) {
            cHelpersStepsCppParserAVX.push(...[
                `            case ${stage}:`,
                `                ${className}::step${stage}_parser_avx(starkInfo, params, parserParams, nrowsBatch, ${domainExtended});`,
                `                break;`
            ])
        }
    }

    cHelpersStepsCppParserAVX.push("        }");
    if(multiple) {
        cHelpersStepsCpp.push(...cHelpersStepsCppParserAVX);
    }
    if(multiple) cHelpersStepsCpp.push("    }");
    cHelpersStepsCpp.push("}");

    if(multiple) cHelpersStepsHpp.push(...cHelpersStepsHppParserAVX);
    cHelpersStepsHpp.push("};");


    result[`${className}_cpp`] = cHelpersStepsCpp.join("\n");
    result[`${className}_hpp`] = cHelpersStepsHpp.join("\n"); 
    
    const operationsPatterns = operations.filter(op => op.isGroupOps);
    console.log("Number of patterns used: " + operationsPatterns.length);
    for(let i = 0; i < operationsPatterns.length; ++i) {
        console.log("case " + operationsPatterns[i].opIndex + " ->    " + operationsPatterns[i].ops.join(", "));
    }
    
    // Set case to consecutive numbers
    for(let i = 0; i < cHelpersInfo.length; ++i) {
        let stageName = `step${cHelpersInfo[i].stage}`;
        if(!cHelpersInfo[i].executeBefore) stageName += "_after";
        cHelpersInfo[i].ops = cHelpersInfo[i].ops.map(op => totalSubsetOperationsUsed.findIndex(o => o === op));

        if(multiple) {
            result[`${className}_${stageName}_parser_cpp`] = result[`${className}_${stageName}_parser_cpp`].replace(/case (\d+):/g, (match, caseNumber) => {
                caseNumber = parseInt(caseNumber, 10);
                const newIndex = totalSubsetOperationsUsed.findIndex(o => o === caseNumber);
                if(newIndex === -1) throw new Error("Invalid operation!");
                return `case ${newIndex}:`;
            });
        }
        
    }
    result[`${className}_generic_parser_cpp`] = result[`${className}_generic_parser_cpp`].replace(/case (\d+):/g, (match, caseNumber) => {
        caseNumber = parseInt(caseNumber, 10);
        const newIndex = totalSubsetOperationsUsed.findIndex(o => o === caseNumber);
        if(newIndex === -1) throw new Error("Invalid operation!");
        return `case ${newIndex}:`;
    });

    const baseDir = path.dirname(cHelpersFile);
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }

    await mkdir(cHelpersFile, { recursive: true });

    for (r in result) {
        let fileName = cHelpersFile + "/" + r;
        fileName = fileName.substring(0, fileName.lastIndexOf('_')) + '.' + fileName.substring(fileName.lastIndexOf('_') + 1);
        console.log(fileName);
        await fs.promises.writeFile(fileName, result[r], "utf8");
    }

    await writeCHelpersFile(binFile, cHelpersInfo);

    return;

    function getParserArgsStage(stage, stageName, stageCode, dom, executeBefore = true) {
        console.log(`Getting parser args for ${stageName}`);

        const {stageInfo, operationsUsed: opsUsed} = getParserArgs(starkInfo, operations, stageCode, dom, stage, executeBefore);

        console.log("Number of operations before join: " + stageInfo.ops.length);

        const patternOps = findPatterns(stageInfo.ops, operations);
        opsUsed.push(...patternOps);

        console.log("Number of operations after join: " + stageInfo.ops.length);

        cHelpersInfo.push(stageInfo);
        for(let j = 0; j < opsUsed.length; ++j) {
            if(!totalSubsetOperationsUsed.includes(opsUsed[j])) totalSubsetOperationsUsed.push(opsUsed[j]);
        }

        operationsUsed[stageName] = opsUsed;   
    }
}
