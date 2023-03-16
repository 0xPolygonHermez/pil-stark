const fs = require("fs");
const version = require("../../package").version;

const { F1Field } = require("ffjavascript");
const { fflonkSetup } = require("./helpers/fflonk_setup");
const { newConstantPolsArray } = require("pilcom");


const argv = require("yargs")
    .version(version)
    .usage("node main_setup.js -p <pil> -P [-P <pilconfig.json] -c <circuit.const> -t <ptau> -z <zkey.json>")
    .alias("t", "tau")   // Input -> r1cs fil
    .alias("p", "pil")    // Input -> Proposed PIL
    .alias("P", "pilconfig")
    .alias("c", "const")  // Output -> file required to build the constants
    .alias("z", "zkey")   // Output -> File required to execute
    .argv;

async function run() {
    const F = new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);

    const ptauFile = typeof(argv.tau) === "string" ?  argv.tau.trim() : "mycircuit.ptau";
    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const pilConfig = typeof(argv.pilconfig) === "string" ? JSON.parse(fs.readFileSync(argv.pilconfig.trim())) : {};
    const constFile = typeof(argv.const) === "string" ?  argv.const.trim() : "mycircuit.const";
    const zkeyFile = typeof(argv.zkey) === "string" ?  argv.zkey.trim() : "mycircuit_zkey.json";

    // PIL compile
    const pil = await compile(F, pilFile, null, pilConfig);

    // Load preprocessed polynomials
    const cnstPols = newConstantPolsArray(pil, F);
    await cnstPols.loadFromFile(constFile);

    const options = {F, logger: console};
    const zkey = await fflonkSetup(pil, cnstPols, ptauFile, options);

    await fs.promises.writeFile(zkeyFile, JSON.stringify(zkey, null, 1), "utf8");


    console.log("Setup done correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});
