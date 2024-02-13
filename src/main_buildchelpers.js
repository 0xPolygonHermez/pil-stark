const fs = require("fs");
const path = require("path");
const version = require("../package").version;

const buildCHelpers = require("./stark/chelpers/stark_chelpers.js");
const { writeCHelpersFile } = require("./stark/chelpers/binFile.js");

const argv = require("yargs")
    .version(version)
    .usage("node main_buildchelpers.js -s <starkinfo.json> -c <chelpers.cpp> [-C <classname>]")
    .alias("s", "starkinfo")
    .alias("c", "chelpers")
    .alias("C", "cls")
    .alias("m", "multiple")
    .alias("b", "binfile")
    .argv;

async function run() {
    let cls = typeof (argv.cls) === "string" ? argv.cls.trim() : "Stark";
    let multiple = argv.multiple;
    const starkInfoFile = typeof (argv.starkinfo) === "string" ? argv.starkinfo.trim() : "mycircuit.starkinfo.json";
    const chelpersFile = typeof (argv.chelpers) === "string" ? argv.chelpers.trim() : "mycircuit.chelpers";
    const binFile = typeof (argv.chelpers) === "string" ? argv.binfile.trim() : "mycircuit.chelpers.bin";

    const baseDir = path.dirname(chelpersFile);
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }
    
    cls = cls[0].toUpperCase() + cls.slice(1) + "Steps";

    const starkInfo = JSON.parse(await fs.promises.readFile(starkInfoFile, "utf8"));

    const {code: cCode, cHelpersInfo } = await buildCHelpers(starkInfo, cls, multiple);

    for (cpart in cCode) {
        let fileName = chelpersFile + "/" + cpart;
        fileName = fileName.substring(0, fileName.lastIndexOf('_')) + '.' + fileName.substring(fileName.lastIndexOf('_') + 1);
        console.log(fileName);
        await fs.promises.writeFile(fileName, cCode[cpart], "utf8");
    }

    await writeCHelpersFile(binFile, cHelpersInfo);
    
    console.log("files Generated Correctly");
}

run().then(() => {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});
