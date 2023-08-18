const fs = require("fs");
const version = require("../../package").version;

const { F1Field, getCurveFromName } = require("ffjavascript");
const fflonkSetup = require("./helpers/fflonk_setup.js");
const { newConstantPolsArray, compile } = require("pilcom");


const argv = require("yargs")
    .version(version)
    .usage("node main_setup.js -p <pil> -P [-P <pilconfig.json] -f <fflonkInfo.json> -c <circuit.const> -t <ptau> -z <circuit.zkey> -e <extraMuls>")
    .alias("t", "tau")   // Input -> ptau
    .alias("p", "pil")    // Input -> Proposed PIL
    .alias("P", "pilconfig")
    .alias("f", "fflonkInfo")
    .alias("c", "const")  // Input -> file required to build the constants
    .alias("z", "zkey")   // Output -> File required to execute
    .alias("e", "extraMuls")
    .alias("q", "maxQDegree")
    .argv;

async function run() {
    const F = new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);

    const ptauFile = typeof(argv.tau) === "string" ?  argv.tau.trim() : "mycircuit.ptau";
    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const pilConfig = typeof(argv.pilconfig) === "string" ? JSON.parse(fs.readFileSync(argv.pilconfig.trim())) : {};
    const constFile = typeof(argv.const) === "string" ?  argv.const.trim() : "mycircuit.const";
    const zkeyFile = typeof(argv.zkey) === "string" ?  argv.zkey.trim() : "mycircuit_zkey.json";
    const fflonkInfoFile = typeof(argv.fflonkInfo) === "string" ?  argv.fflonkInfo.trim() : "fflonkInfo.json";

    // PIL compile
    const pil = await compile(F, pilFile, null, pilConfig);

    const curve = await getCurveFromName("bn128");

    const Fr = curve.Fr;

    await curve.terminate();

    // Load preprocessed polynomials
    const constPols = newConstantPolsArray(pil, F);
    await constPols.loadFromFileFr(constFile, Fr);

    const fflonkInfo = JSON.parse(await fs.promises.readFile(fflonkInfoFile, "utf8"));

    let options = {};

    options.extraMuls = argv.extraMuls === undefined ? 2 : Number(argv.extraMuls);
    options.maxQDegree = argv.maxQDegree === undefined ? 0 : Number(argv.maxQDegree);
        
    await fflonkSetup(constPols, zkeyFile, ptauFile, fflonkInfo, options);

    console.log("Setup done correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});