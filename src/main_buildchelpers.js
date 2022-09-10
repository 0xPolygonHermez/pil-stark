const fs = require("fs");
const path = require("path");
const version = require("../package").version;

const F1Field = require("./f3g");
const starkInfoGen = require("./starkinfo.js");
const { compile } = require("pilcom");
const buildCHelpers = require("./chelpers.js");

const argv = require("yargs")
    .version(version)
    .usage("node main_buildchelpers.js -p <pil.json> [-P <pilconfig.json] -s <starkstruct.json> -c <chelpers.cpp>")
    .alias("p", "pil")
    .alias("P", "pilconfig")
    .alias("s", "starkstruct")
    .alias("c", "chelpers")
    .alias("m", "multiple")
    .argv;

async function run() {
    const F = new F1Field();

    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const pilConfig = typeof(argv.pilconfig) === "string" ? JSON.parse(fs.readFileSync(argv.pilconfig.trim())) : {};

    const starkStructFile = typeof(argv.starkstruct) === "string" ?  argv.starkstruct.trim() : "mycircuit.stark_struct.json";
    const chelpersFile = typeof(argv.chelpers) === "string" ?  argv.chelpers.trim() : "mycircuit.chelpers.cpp";
    const multipleCodeFiles = argv.multiple;

    const pil = await compile(F, pilFile, null, pilConfig);
    const starkStruct = JSON.parse(await fs.promises.readFile(starkStructFile, "utf8"));

    const starkInfo = starkInfoGen(pil, starkStruct);

    const cCode = await buildCHelpers(starkInfo, multipleCodeFiles ? {multipleCodeFiles: true}:{});

    if (multipleCodeFiles) {
        const baseDir = path.dirname(chelpersFile);
        if (!fs.existsSync(baseDir)){
            fs.mkdirSync(baseDir, { recursive: true });
        }
        const dotPos = chelpersFile.lastIndexOf('.');
        const leftFilename = dotPos < 0 ? chelpersFile : chelpersFile.substr(0, dotPos);
        const ext = dotPos < 0 ? '.cpp' : chelpersFile.substr(dotPos);
        for(cpart in cCode) {
            await fs.promises.writeFile(leftFilename + '.' + cpart + ext, cCode[cpart], "utf8");
        }
    } else {
        await fs.promises.writeFile(chelpersFile, cCode, "utf8");
    }

    console.log("files Generated Correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});
