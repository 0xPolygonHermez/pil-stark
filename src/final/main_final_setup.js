const fs = require("fs");
const version = require("../../package").version;

const { F1Field } = require("ffjavascript");
const {readR1cs} = require("r1csfile");
const plonkSetup = require("./final_setup.js");
const { writeExecFile } = require("../helpers/exec_helpers");


const argv = require("yargs")
    .version(version)
    .usage("node main_final_setup.js -r <final.r1cs> -p <final.pil> -c <final.const> -e <final.exec> [--forceNBits=23]")
    .alias("r", "r1cs")
    .alias("c", "const")  // Output file required to build the constants
    .alias("p", "pil")    // Proposed PIL
    .alias("e", "exec")   // File required to execute
    .argv;

async function run() {
    const F = new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);
    const r1csFile = typeof(argv.r1cs) === "string" ?  argv.r1cs.trim() : "final.r1cs";
    const constFile = typeof(argv.const) === "string" ?  argv.const.trim() : "final.const";
    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "final.pil";
    const execFile = typeof(argv.exec) === "string" ?  argv.exec.trim() : "final.exec";

    const r1cs = await readR1cs(r1csFile, { F, logger:console });

    const options = {
        forceNBits: argv.forceNBits
    };

    const res = await plonkSetup(F, r1cs, options);

    await fs.promises.writeFile(pilFile, res.pilStr, "utf8");

    await res.constPols.saveToFile(constFile);

    await writeExecFile(F, execFile, res.plonkAdditions,  res.sMap);

    console.log("files Generated Correctly");

}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});