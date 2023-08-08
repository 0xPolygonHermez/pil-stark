const fs = require("fs");
const version = require("../../package").version;

const { F1Field } = require("ffjavascript");
const pilInfo = require("../pil_info/pil_info.js");
const { compile } = require("pilcom");

const argv = require("yargs")
    .version(version)
    .usage("node main_fflonkinfo.js -p <pil.json> [-P <pilconfig.json] -i <fflonkinfo.json>")
    .alias("p", "pil")
    .alias("P", "pilconfig")
    .alias("i", "fflonkinfo")
    .argv;

async function run() {
    const F = new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);

    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const pilConfig = typeof(argv.pilconfig) === "string" ? JSON.parse(fs.readFileSync(argv.pilconfig.trim())) : {};

    const fflonkInfoFile = typeof(argv.fflonkinfo) === "string" ?  argv.fflonkinfo.trim() : "mycircuit.fflonkinfo.json";

    const pil = await compile(F, pilFile, null, pilConfig);
    const fflonkInfo = pilInfo(F, pil, false);

    await fs.promises.writeFile(fflonkInfoFile, JSON.stringify(fflonkInfo, null, 1), "utf8");

    console.log("files Generated Correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});
