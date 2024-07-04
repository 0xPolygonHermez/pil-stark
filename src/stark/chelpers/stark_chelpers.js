const { getParserArgs } = require("./getParserArgs.js");
const { generateParser, getAllOperations } = require("./generateParser.js");
const { findPatterns } = require("./helpers.js");
const { writeCHelpersFile } = require("./binFile.js");
const path = require("path");
const fs = require("fs");
const { mkdir } = require("fs-extra");

module.exports.buildCHelpers = async function buildCHelpers(starkInfo, cHelpersFile, className = "", binFile, genericBinFile) {

    if(className === "") className = "Stark";
    className = className[0].toUpperCase() + className.slice(1) + "Steps";

    let result = {};
    
    const cHelpersInfo = [];
    
    const cHelpersInfoGeneric = [];

    const nStages = 3;

    const cHelpersStepsHpp = [
        `#include "chelpers_steps.hpp"\n\n`,
        `class ${className} : public CHelpersSteps {`,
        "public:",
    ];

    let operations = getAllOperations();

    let operationsWithPatterns = getAllOperations();

    let totalSubsetOperationsUsed = [];

    for(let i = 1; i < nStages - 1; ++i) {
        let stage = i + 1;
        let code = starkInfo[`step${stage}prev`].code;
        getParserArgsStage(stage, `step${stage}`, code, "n");
    }

    let code = starkInfo[`step${nStages}prev`].code;
    getParserArgsStage(nStages, `step${nStages}`, code, "n");
 
    code = starkInfo[`step${nStages + 1}2ns`].code;
    getParserArgsStage(nStages + 1, `step${nStages + 1}`, code, "2ns");

    code = starkInfo[`step${nStages + 2}2ns`].code;
    getParserArgsStage(nStages + 2, `step${nStages + 2}`, code, "2ns");

    totalSubsetOperationsUsed = totalSubsetOperationsUsed.sort((a, b) => a - b);
    console.log("Generating generic parser with all " + totalSubsetOperationsUsed.length + " operations used");
    console.log("Total subset of operations used: " + totalSubsetOperationsUsed.join(", "));
    console.log("--------------------------------");
    
    const genericParser = generateParser(operationsWithPatterns, totalSubsetOperationsUsed);

    cHelpersStepsHpp.push(genericParser);
    cHelpersStepsHpp.push("};");


    result[`${className}_hpp`] = cHelpersStepsHpp.join("\n"); 
    
    const operationsPatterns = operationsWithPatterns.filter(op => op.isGroupOps);
    console.log("Number of patterns used: " + operationsPatterns.length);
    for(let i = 0; i < operationsPatterns.length; ++i) {
        console.log("case " + operationsPatterns[i].opIndex + " ->    " + operationsPatterns[i].ops.join(", "));
    }
    
    // Set case to consecutive numbers
    for(let i = 0; i < cHelpersInfo.length; ++i) {
        let stageName = `step${cHelpersInfo[i].stage}`;
        if(!cHelpersInfo[i].executeBefore) stageName += "_after";
        cHelpersInfo[i].ops = cHelpersInfo[i].ops.map(op => totalSubsetOperationsUsed.findIndex(o => o === op));        
    }

    result[`${className}_hpp`] = result[`${className}_hpp`].replace(/case (\d+):/g, (match, caseNumber) => {
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
    if(genericBinFile) {
        await writeCHelpersFile(genericBinFile, cHelpersInfoGeneric);
    }

    return;

    function getParserArgsStage(stage, stageName, stageCode, dom, executeBefore = true) {
        console.log(`Getting parser args for ${stageName}`);

        const {stageInfo: stageInfo2} = getParserArgs(starkInfo, operations, stageCode, dom, stage, executeBefore);
        cHelpersInfoGeneric.push(stageInfo2);

        const {stageInfo, operationsUsed: opsUsed} = getParserArgs(starkInfo, operationsWithPatterns, stageCode, dom, stage, executeBefore);
        
        console.log("Number of operations before join: " + stageInfo.ops.length);

        const patternOps = findPatterns(stageInfo.ops, operationsWithPatterns);
        opsUsed.push(...patternOps);

        console.log("Number of operations after join: " + stageInfo.ops.length);               

        cHelpersInfo.push(stageInfo);

        for(let j = 0; j < opsUsed.length; ++j) {
            if(!totalSubsetOperationsUsed.includes(opsUsed[j])) totalSubsetOperationsUsed.push(opsUsed[j]);
        }
    }
}
