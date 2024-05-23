const { generateParser, getAllOperations } = require("./stark/chelpers/generateParser");
const fs = require("fs");

const version = require("../package").version;

const argv = require("yargs")
    .version(version)
    .usage("node main_buildchelpers_generic.js -c <chelpers.cpp>")
    .alias("c", "chelpers")
    .string("parserType")
    .argv;

async function run() {
    const cHelpersFile = typeof (argv.chelpers) === "string" ? argv.chelpers.trim() : "mycircuit.chelpers";
    
    let operations = getAllOperations();
    
    let parserType = "avx";

    if(argv.parserType) {
        if(!["avx", "avx512","pack"].includes(argv.parserType)) throw new Error("Invalid parser type");
        parserType = argv.parserType;
    }

    const parser = generateParser(operations, undefined, parserType);

    const cHelpersStepsName = parserType === "avx" ? `CHELPERS_STEPS_HPP` : parserType === "avx512" ? "CHELPERS_STEPS_AVX512_HPP" : "CHELPERS_STEPS_PACK_HPP";
    
    const cHelpersStepsClassName = parserType === "avx" ? `CHelpersSteps` : parserType === "avx512" ? "CHelpersStepsAvx512 : public CHelpersSteps" : "CHelpersStepsPack : public CHelpersSteps";

    const cHelpersStepsHpp = [
        `#ifndef ${cHelpersStepsName}`,
        `#define ${cHelpersStepsName}`,
        `#include "chelpers.hpp"`,
        `${parserType !== "avx" ? `#include "chelpers_steps.hpp"` : ""}`,
        `#include "steps.hpp"\n`,
        `class ${cHelpersStepsClassName} {`,
        "public:",
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