const fs = require("fs");
const version = require("../../package").version;

const {readR1cs} = require("r1csfile");
const { writeExecFile } = require("../../src/compressor/exec_helpers");
const { writeExecFile: writeExecFileFr } = require("../../src/final/exec_helpers");
const F3g = require("../../src/helpers/f3g");
const plonkSetup = require("./plonksetup.js");
const { F1Field, getCurveFromName } = require("ffjavascript");


const argv = require("yargs")
    .version(version)
    .usage("node main_plonksetup.js -r <circuit.r1cs> -p <pil.json> -c <circuit.const> -e <circuit.exec>")
    .alias("r", "r1cs")   // Input -> r1cs fil
    .alias("p", "pil")    // Input -> Proposed PIL
    .alias("c", "const")  // Output -> file required to build the constants
    .alias("e", "exec")   // Output -> File required to execute
    .string("curve")
    .argv;

async function run() {
    const curveName = argv.curve || "gl";
    const F = curveName === "gl" ? new F3g() : new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);

    const r1csFile = typeof(argv.r1cs) === "string" ?  argv.r1cs.trim() : "mycircuit.r1cs";
    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const constFile = typeof(argv.const) === "string" ?  argv.const.trim() : "mycircuit.const";
    const execFile = typeof(argv.exec) === "string" ?  argv.exec.trim() : "mycircuit.exec";

    const r1cs = await readR1cs(r1csFile, {F: F, logger:console });

    const res = await plonkSetup(F, r1cs);

    await fs.promises.writeFile(pilFile, res.pilStr, "utf8");

    if(curveName === "gl"){
        await res.constPols.saveToFile(constFile);
        await writeExecFile(execFile,res.plonkAdditions,  res.sMap);
    } else {
        const curve = await getCurveFromName("bn128");

    	const Fr = curve.Fr;

    	await curve.terminate();

        await res.constPols.saveToFileFr(constFile, Fr);
        await writeExecFileFr(Fr, execFile, res.plonkAdditions, res.sMap);
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
