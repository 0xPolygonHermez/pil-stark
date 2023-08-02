const fs = require("fs"); 
const version = require("../../package").version;
const exportPilFflonkVerifier = require("./solidity/exportPilFflonkVerifier");

const argv = require("yargs")
    .version(version)
    .usage("node main_exportSolidityVerifier.js -v <verificationkey.json> -f <fflonkinfo.json> -p <pilfflonkverifier.sol> -s <shplonkverifier.sol> [--extendLoops]")
    .alias("f", "fflonkinfo")
    .alias("v", "verificationkey")
    .alias("p", "pilfflonkverifier")
    .alias("s", "shplonkverifier")
    .argv;

async function run() {
    const fflonkInfoFile = typeof(argv.fflonkinfo) === "string" ?  argv.fflonkinfo.trim() : "mycircuit.fflonkInfo.json";
    const verificationKeyFile = typeof(argv.verificationkey) === "string" ?  argv.verificationkey.trim() : "verificationkey.json";
    const pilFflonkVerifierFile = typeof(argv.pilfflonkverifier) === "string" ?  argv.pilfflonkverifier.trim() : "pilfflonkverifier.sol";
    const shPlonkVerifierFile = typeof(argv.shplonkverifier) === "string" ?  argv.shplonkverifier.trim() : "shplonkverifier.sol";
    
    const fflonkInfo = JSON.parse(await fs.promises.readFile(fflonkInfoFile, "utf8"));
   
    const verificationKey = JSON.parse(await fs.promises.readFile(verificationKeyFile, "utf8"));

    const options = {
        extendLoops: argv.extendLoops || false,
    }

    const verifierCode = await exportPilFflonkVerifier(verificationKey, fflonkInfo, options);
    
    await fs.promises.writeFile(pilFflonkVerifierFile, verifierCode.verifierPilFflonkCode, "utf8");

    await fs.promises.writeFile(shPlonkVerifierFile, verifierCode.verifierShPlonkCode, "utf8");
    
    console.log("Solidity files generated correctly");

}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});
