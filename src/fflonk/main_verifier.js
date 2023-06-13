const fs = require("fs"); 
const version = require("../../package").version;

const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true, storeAsString: true });
const fflonkVerify = require("./helpers/fflonk_verify");

const argv = require("yargs")
    .version(version)
    .usage("node main_verify.js -v <verificationkey.json> -f <fflonkinfo.json> -o <proof.json> -b <public.json>")
    .alias("f", "fflonkinfo")
    .alias("v", "verificationkey")
    .alias("o", "proof")
    .alias("b", "public")
    .argv;

async function run() {
    const fflonkInfoFile = typeof(argv.fflonkinfo) === "string" ?  argv.fflonkinfo.trim() : "mycircuit.fflonkInfo.json";
    const verificationKeyFile = typeof(argv.verificationkey) === "string" ?  argv.verificationkey.trim() : "verificationkey.json";
    const proofFile = typeof(argv.proof) === "string" ?  argv.proof.trim() : "mycircuit.proof.json";
    const publicFile = typeof(argv.public) === "string" ?  argv.public.trim() : "mycircuit.public.json";

    console.log(verificationKeyFile);
    const fflonkInfo = JSON.parse(await fs.promises.readFile(fflonkInfoFile, "utf8"));
    const verificationKey = JSON.parse(await fs.promises.readFile(verificationKeyFile, "utf8"));

    const proof = JSONbig.parse(await fs.promises.readFile(proofFile, "utf8"));
    const publicSignals = JSONbig.parse(await fs.promises.readFile(publicFile, "utf8"))

    const resV = await fflonkVerify(verificationKey, publicSignals, proof, fflonkInfo, {});
    
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
