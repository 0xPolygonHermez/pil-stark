const fs = require("fs"); 
const { fflonkVerificationKey } = require("../..");
const version = require("../../package").version;

const argv = require("yargs")
    .version(version)
    .usage("node main_exportverificationkey.js -z <circuit.zkey> -v <verificationkey.json>")
    .alias("z", "zkey")
    .alias("v", "verificationkey")
    .argv;

async function run() {
    const zkeyFile = typeof(argv.zkey) === "string" ?  argv.zkey.trim() : "mycircuit.zkey";
    const verificationKeyFile = typeof(argv.verificationkey) === "string" ?  argv.verificationkey.trim() : "verificationkey.json";   

    const verificationKey = await fflonkVerificationKey(zkeyFile, {});
    
    await fs.promises.writeFile(verificationKeyFile, JSON.stringify(verificationKey, null, 1), "utf8");
    
    console.log("Verification Key generated correctly");

}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});
