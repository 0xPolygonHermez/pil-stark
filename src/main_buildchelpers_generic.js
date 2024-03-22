const { generateParser, getAllOperations } = require("./stark/chelpers/generateParser");
const fs = require("fs");

const version = require("../package").version;

const argv = require("yargs")
    .version(version)
    .usage("node main_buildchelpers_generic.js -c <chelpers.cpp>")
    .alias("c", "chelpers")
    .argv;

async function run() {
    const cHelpersFile = typeof (argv.chelpers) === "string" ? argv.chelpers.trim() : "mycircuit.chelpers";
    
    let operations = getAllOperations();
    
    const parser = generateParser(operations);

    const cHelpersStepsHpp = [
        `#ifndef CHELPERS_STEPS_HPP`,
        `#define CHELPERS_STEPS_HPP`,
        `#include "chelpers.hpp"`,
        `#include "steps.hpp"\n`,
        `class CHelpersSteps {`,
        "public:",
        "    virtual void calculateExpressions(StarkInfo &starkInfo, StepsParams &params, ParserArgs &parserArgs, ParserParams &parserParams) {",
        `        uint32_t nrowsBatch = 4;`,
        `        bool domainExtended = parserParams.stage > 3 ? true : false;`,
    ];
      

    cHelpersStepsHpp.push(parser);
    cHelpersStepsHpp.push("};\n");
    cHelpersStepsHpp.push("#endif")

    await fs.promises.writeFile(cHelpersFile, cHelpersStepsHpp.join("\n"), "utf8");

    console.log("Generic parser generated correctly");
}

run().then(() => {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});
