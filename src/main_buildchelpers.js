const fs = require("fs");
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
    .argv;

async function run() {
    const F = new F1Field();

    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const pilConfig = typeof(argv.pilconfig) === "string" ? JSON.parse(fs.readFileSync(argv.pilconfig.trim())) : {};

    const starkStructFile = typeof(argv.starkstruct) === "string" ?  argv.starkstruct.trim() : "mycircuit.stark_struct.json";
    const chelpersFile = typeof(argv.chelpers) === "string" ?  argv.chelpers.trim() : "mycircuit.chelpers.cpp";

    const pil = await compile(F, pilFile, null, pilConfig);
    const starkStruct = JSON.parse(await fs.promises.readFile(starkStructFile, "utf8"));

    const starkInfo = starkInfoGen(pil, starkStruct);

    const cCode = await buildCHelpers(starkInfo);

    await fs.promises.writeFile(chelpersFile, cCode, "utf8");

    console.log("files Generated Correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});
