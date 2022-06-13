const fs = require("fs");
const version = require("../package").version;

const pil2circom = require("./pil2circom.js");
const F1Field = require("./f3g.js");
const {readR1cs} = require("r1csfile");
const plonkSetup = require("./plonk_setup.js");


const argv = require("yargs")
    .version(version)
    .usage("node main_plonk_setup.js -r <r1cs.circom> -p <pil.json> -v <verification_key.json>")
    .alias("r", "r1cs")
    .alias("c", "const")  // Output file required to build the constants
    .alias("p", "pil")    // Proposed PIL
    .alias("e", "exac")   // File required to execute
    .argv;

async function run() {
    const F = new F1Field();

    const r1csFile = typeof(argv.r1cs) === "string" ?  argv.r1cs.trim() : "circuit.r1cs";
    const constFile = typeof(argv.const) === "string" ?  argv.const.trim() : "circuit.plonk.const";
    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "circuit.plonk.pil";
    const execFile = typeof(argv.exec) === "string" ?  argv.output.trim() : "circuit.plonk.exec";

    const r1cs = await readR1cs(r1csFile, {F: F });

    res = await plonkSetup(r1cs);

    /*
    const verKey = JSON.parse(await fs.promises.readFile(verKeyFile, "utf8"));
    const constRoot = [];
    for (let i=0; i<4; i++) {
        constRoot[i] = BigInt(verKey.constRoot[i]);
    }
    const template = await fs.promises.readFile("./circuitsGL/stark_verifier.circom.ejs", "utf8");
    const starkStruct = JSON.parse(await fs.promises.readFile(starkStructFile, "utf8"));

    const verifier = await pil2circom(template, pil, constRoot, starkStruct);

    await fs.promises.writeFile(outputFile, verifier, "utf8");
*/

    console.log("file Generated Correctly");

}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});

