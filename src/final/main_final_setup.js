const fs = require("fs");
const version = require("../../package").version;

const { F1Field, getCurveFromName } = require("ffjavascript");
const {readR1cs} = require("r1csfile");
const { writeExecFile } = require("./exec_helpers");
const plonkSetupFinal6 = require("./final6_setup");
const plonkSetupFinal9 = require("./final9_setup");
const plonkSetupFinalFflonk = require("./finalfflonk_setup");


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
    
    let cols = argv.cols ? Number(argv.cols) : 0;
    
    if(![0,6,9].includes(cols)) throw new Error("Invalid number of cols");

    let res;
    if(cols === 9) {
        res = await plonkSetupFinal9(F, r1cs, options);
    } else if(cols === 6){
        res = await plonkSetupFinal6(F, r1cs, options);
    } else {
        res = await plonkSetupFinalFflonk(F, r1cs, options);
    }

    await fs.promises.writeFile(pilFile, res.pilStr, "utf8");

    const curve = await getCurveFromName("bn128");

    const Fr = curve.Fr;

    await curve.terminate();

    await res.constPols.saveToFileFr(constFile, Fr);

    await writeExecFile(Fr, execFile, res.plonkAdditions, res.sMap);

    console.log("files Generated Correctly");

}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});