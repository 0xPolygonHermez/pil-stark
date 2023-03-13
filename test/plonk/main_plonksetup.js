const fs = require("fs");
const version = require("../../package").version;
const {readR1cs} = require("r1csfile");
const F3g = require("../../src/helpers/f3g");
const plonkSetup = require("./plonksetup.js");


const argv = require("yargs")
    .version(version)
    .usage("node main_plonksetup.js -r <circuit.r1cs> -p <pil.json> -c <circuit.const> -e <circuit.exec>")
    .alias("r", "r1cs")   // Input -> r1cs fil
    .alias("p", "pil")    // Input -> Proposed PIL
    .alias("c", "const")  // Output -> file required to build the constants
    .alias("e", "exec")   // Output -> File required to execute
    .argv;

async function run() {
    const F = new F3g();

    const r1csFile = typeof(argv.r1cs) === "string" ?  argv.r1cs.trim() : "mycircuit.r1cs";
    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const constFile = typeof(argv.const) === "string" ?  argv.const.trim() : "mycircuit.const";
    const execFile = typeof(argv.exec) === "string" ?  argv.exec.trim() : "mycircuit.exec";

    const r1cs = await readR1cs(r1csFile, {F: F, logger:console });

    const res = await plonkSetup(r1cs);

    await fs.promises.writeFile(pilFile, res.pilStr, "utf8");

    await res.constPols.saveToFile(constFile);

    await writeExecFile(execFile,res.plonkAdditions,  res.sMap);

    console.log("files Generated Correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});


async function writeExecFile(execFile, adds, sMap) {

    const size = 2 + adds.length*4 + sMap.length*sMap[0].length;
    const buff = new BigUint64Array(size);

    buff[0] = BigInt(adds.length);
    buff[1] = BigInt(sMap[0].length);

    for (let i=0; i< adds.length; i++) {
        buff[2 + i*4     ] = BigInt(adds[i][0]);
        buff[2 + i*4 + 1 ] = BigInt(adds[i][1]);
        buff[2 + i*4 + 2 ] = adds[i][2];
        buff[2 + i*4 + 3 ] = adds[i][3];
    }

    for (let i=0; i<sMap[0].length; i++) {
        for (let c=0; c<3; c++) {
            buff[2 + adds.length*4 + 3*i + c] = BigInt(sMap[c][i]);
        }
    }

    const fd =await fs.promises.open(execFile, "w+");
    await fd.write(buff);
    await fd.close();
}
