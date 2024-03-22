const fs = require("fs");
const version = require("../package").version;

const {buildCHelpers} = require("./stark/chelpers/stark_chelpers.js");

const argv = require("yargs")
    .version(version)
    .usage("node main_buildchelpers.js -s <starkinfo.json> -c <chelpers.cpp> [-C <classname>]")
    .alias("s", "starkinfo")
    .alias("c", "chelpers")
    .alias("C", "cls")
    .alias("b", "binfile")
    .alias("g", "genericbinfile")
    .argv;

async function run() {
    let cls = typeof (argv.cls) === "string" ? argv.cls.trim() : "Stark";
    const starkInfoFile = typeof (argv.starkinfo) === "string" ? argv.starkinfo.trim() : "mycircuit.starkinfo.json";
    const cHelpersFile = typeof (argv.chelpers) === "string" ? argv.chelpers.trim() : "mycircuit.chelpers";
    const binFile = typeof (argv.binfile) === "string" ? argv.binfile.trim() : "mycircuit.chelpers.bin";
    const genericBinFile = typeof (argv.genericbinfile) === "string" ? argv.genericbinfile.trim() : undefined;

    const starkInfo = JSON.parse(await fs.promises.readFile(starkInfoFile, "utf8"));

    await buildCHelpers(starkInfo, cHelpersFile, cls, binFile, genericBinFile);
    
    console.log("files Generated Correctly");
}

run().then(() => {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});
