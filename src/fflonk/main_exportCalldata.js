const fs = require("fs");
const version = require("../../package").version;

const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true, storeAsString: true });
const exportFflonkCalldata = require("./solidity/exportFflonkCalldata");

const argv = require("yargs")
    .version(version)
    .usage("node main_prover.js -v <verificationkey.json> -o <proof.json> -c <calldata.txt>")
    .alias("v", "verificationkey")
    .alias("c", "calldata")
    .alias("o", "proof")
    .alias("b", "public")
    .argv;

async function run() {
    const verificationKeyFile = typeof(argv.verificationkey) === "string" ?  argv.verificationkey.trim() : "verificationkey.json";
    const proofFile = typeof(argv.proof) === "string" ?  argv.proof.trim() : "mycircuit.proof.json";
    const publicFile = typeof(argv.public) === "string" ?  argv.public.trim() : "mycircuit.public.json";
    const calldataFile = typeof(argv.calldata) === "string" ?  argv.calldata.trim() : "calldata.txt";

    const proof = JSONbig.parse(await fs.promises.readFile(proofFile, "utf8"));
    const publicSignals = JSONbig.parse(await fs.promises.readFile(publicFile, "utf8"))

    const verificationKey = JSON.parse(await fs.promises.readFile(verificationKeyFile, "utf8"));

    const fflonkCalldata = await exportFflonkCalldata(verificationKey, proof, publicSignals, {});
    
    await fs.promises.writeFile(calldataFile, fflonkCalldata, "utf8");

    console.log("Calldata generated correctly");
   
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});
