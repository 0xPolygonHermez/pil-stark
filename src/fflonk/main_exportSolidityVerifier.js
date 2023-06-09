const fs = require("fs"); 
const version = require("../../package").version;

const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true, storeAsString: true });
const fflonkVerify = require("./helpers/fflonk_verify");
const exportPilFflonkVerifier = require("./solidity/exportPilFflonkVerifier");

const argv = require("yargs")
    .version(version)
    .usage("node main_exportSolidityVerifier.js -z <circuit.zkey> -f <fflonkinfo.json> -p <pilfflonkverifier.sol> -s <shplonkverifier.sol>")
    .alias("f", "fflonkinfo")
    .alias("z", "zkey")
    .alias("p", "pilfflonkverifier")
    .alias("s", "shplonkverifier")
    .argv;

async function run() {
    const fflonkInfoFile = typeof(argv.fflonkinfo) === "string" ?  argv.fflonkinfo.trim() : "mycircuit.fflonkInfo.json";
    const zkeyFile = typeof(argv.zkey) === "string" ?  argv.zkey.trim() : "mycircuit.zkey";
    const pilFflonkVerifierFile = typeof(argv.pilfflonkverifier) === "string" ?  argv.pilfflonkverifier.trim() : "pilfflonkverifier.sol";
    const shPloknVerifierFile = typeof(argv.shplonkverifier) === "string" ?  argv.shplonkverifier.trim() : "shplonkverifier.sol";
    
    const fflonkInfo = JSON.parse(await fs.promises.readFile(fflonkInfoFile, "utf8"));
   

    const verifierCode = await exportPilFflonkVerifier(zkeyFile, fflonkInfo, {});
    
    await fs.promises.writeFile(pilFflonkVerifierFile, verifierCode.verifierPilFflonkCode, "utf8");

    await fs.promises.writeFile(shPloknVerifierFile, verifierCode.verifierShPlonkCode, "utf8");
    
    console.log("Solidity files generated correctly");

}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});
