const fs = require("fs"); 
const version = require("../../package").version;

const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true, storeAsString: true });
const fflonkVerify = require("./helpers/fflonk_verify");

const argv = require("yargs")
    .version(version)
    .usage("node main_verify.js -z <circuit.zkey> -f <fflonkinfo.json> -o <proof.json> -b <public.json>")
    .alias("f", "fflonkinfo")
    .alias("z", "zkey")
    .alias("o", "proof")
    .alias("b", "public")
    .argv;

async function run() {
    const fflonkInfoFile = typeof(argv.fflonkinfo) === "string" ?  argv.fflonkinfo.trim() : "mycircuit.fflonkInfo.json";
    const zkeyFile = typeof(argv.zkey) === "string" ?  argv.zkey.trim() : "mycircuit.zkey";
    const proofFile = typeof(argv.proof) === "string" ?  argv.proof.trim() : "mycircuit.proof.json";
    const publicFile = typeof(argv.public) === "string" ?  argv.public.trim() : "mycircuit.public.json";

    const fflonkInfo = JSON.parse(await fs.promises.readFile(fflonkInfoFile, "utf8"));
    const proof = JSONbig.parse(await fs.promises.readFile(proofFile, "utf8"));
    const publicSignals = JSONbig.parse(await fs.promises.readFile(publicFile, "utf8"))

    const resV = await fflonkVerify(zkeyFile, publicSignals, proof, fflonkInfo, {});
    
    if (resV === true) {
        console.log("Verification Ok!!")
        return 0;
    } else {
        console.log("FAIL!")
        return 1;
    }
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});