const fs = require("fs");
const version = require("../../package").version;

const { F1Field } = require("ffjavascript");
const { fflonkSetup } = require("./fflonk_setup");


const argv = require("yargs")
    .version(version)
    .usage("node main_fflonksetup.js -p <pil> -P [-P <pilconfig.json] -c <circuit.const> -t <ptau> -v <preprocessed.json>")
    .alias("t", "tau")   // Input -> r1cs fil
    .alias("p", "pil")    // Input -> Proposed PIL
    .alias("P", "pilconfig")
    .alias("c", "const")  // Output -> file required to build the constants
    .alias("v", "vk")   // Output -> File required to execute
    .argv;

async function run() {
    const F = new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);

    const ptauFile = typeof(argv.tau) === "string" ?  argv.tau.trim() : "mycircuit.ptau";
    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const pilConfig = typeof(argv.pilconfig) === "string" ? JSON.parse(fs.readFileSync(argv.pilconfig.trim())) : {};
    const constFile = typeof(argv.const) === "string" ?  argv.const.trim() : "mycircuit.const";
    const preprocessedFilename = typeof(argv.vk) === "string" ?  argv.vk.trim() : "mycircuit_vk.json";

    const options = {F, logger: console};
    const setup = await fflonkSetup(pilFile, pilConfig, constFile, ptauFile, options);

    await fs.promises.writeFile(preprocessedFilename, JSON.stringify(setup, null, 1), "utf8");

    console.log("Setup done correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});
