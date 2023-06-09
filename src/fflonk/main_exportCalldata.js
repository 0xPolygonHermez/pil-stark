const fs = require("fs");
const version = require("../../package").version;

const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true, storeAsString: true });
const exportFflonkCalldata = require("./solidity/exportFflonkCalldata");

const argv = require("yargs")
    .version(version)
    .usage("node main_prover.js -z <circuit.zkey> -o <proof.json>")
    .alias("z", "zkey")
    .alias("o", "proof")
    .alias("b", "public")
    .argv;

async function run() {
    const zkeyFile = typeof(argv.zkey) === "string" ?  argv.zkey.trim() : "mycircuit.zkey";
    const proofFile = typeof(argv.proof) === "string" ?  argv.proof.trim() : "mycircuit.proof.json";
    const publicFile = typeof(argv.public) === "string" ?  argv.public.trim() : "mycircuit.public.json";

    const proof = JSONbig.parse(await fs.promises.readFile(proofFile, "utf8"));
    const publicSignals = JSONbig.parse(await fs.promises.readFile(publicFile, "utf8"))

    const fflonkCalldata = await exportFflonkCalldata(zkeyFile, proof, {});
    
    console.log(fflonkCalldata);
   
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});
