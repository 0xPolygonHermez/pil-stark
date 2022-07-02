const fs = require("fs");
const version = require("../package").version;

const F1Field = require("./f3g");
const starkInfoGen = require("./starkinfo.js");
const { compile } = require("zkpil");

const argv = require("yargs")
    .version(version)
    .usage("node main_genstarkinfo.js -p <pil.json> -s <starkstruct.json> -i <starkinfo.json>")
    .alias("p", "pil")
    .alias("s", "starkstruct")
    .alias("i", "starkinfo")
    .argv;

async function run() {
    const F = new F1Field();

    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const starkStructFile = typeof(argv.starkstruct) === "string" ?  argv.starkstruct.trim() : "mycircuit.stark_struct.json";
    const starkInfoFile = typeof(argv.starkinfo) === "string" ?  argv.starkinfo.trim() : "mycircuit.starkinfo.json";

    const pil = await compile(F, pilFile);
    const starkStruct = JSON.parse(await fs.promises.readFile(starkStructFile, "utf8"));

    const starkInfo = starkInfoGen(pil, starkStruct);

    await fs.promises.writeFile(starkInfoFile, JSON.stringify(starkInfo, null, 1), "utf8");

    console.log("files Generated Correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});

