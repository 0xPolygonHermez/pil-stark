const fs = require("fs");
const version = require("../package").version;

const F3g = require("./helpers/f3g.js");
const { compile } = require("pilcom");
const { preparePil } = require("./pil_info/preparePil");

const argv = require("yargs")
    .version(version)
    .usage("node main_preparepil.js -p <pil.json> [-P <pilconfig.json] -s <starkstruct.json> -f <infopil.json>")
    .alias("p", "pil")
    .alias("P", "pilconfig")
    .alias("s", "starkstruct")
    .alias("f", "infopil")
    .argv;

async function run() {
    const F = new F3g();

    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const pilConfig = typeof(argv.pilconfig) === "string" ? JSON.parse(fs.readFileSync(argv.pilconfig.trim())) : {};

    const starkStructFile = typeof(argv.starkstruct) === "string" ?  argv.starkstruct.trim() : "mycircuit.stark_struct.json";
    
    const infoPilFile = typeof(argv.infopil) === "string" ?  argv.infopil.trim() : "mycircuit.infopil.json";

    let pil = await compile(F, pilFile, null, pilConfig);

    const starkStruct = JSON.parse(await fs.promises.readFile(starkStructFile, "utf8"));

    const infoPil = preparePil(F, pil, starkStruct);

    let maxDeg =  (1 << (starkStruct.nBitsExt - starkStruct.nBits)) + 1;

    const infoPilJSON = { maxDeg, cExpId: infoPil.res.cExpId, qDim: infoPil.res.qDim, ...infoPil };
    
    console.log("Writing file...");
    
    await fs.promises.writeFile(infoPilFile, JSON.stringify(infoPilJSON, null, 1), "utf8");

    console.log("files Generated Correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});

