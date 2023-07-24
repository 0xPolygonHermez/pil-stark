const fs = require("fs"); 
const { fflonkVerificationKey } = require("../..");
const { readPilFflonkZkeyFile } = require("./zkey/zkey_pilfflonk");
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

    const options = {logger: console};

    // Load zkey file
    if (options.logger) options.logger.info("> Reading zkey file");
    const zkey = await readPilFflonkZkeyFile(zkeyFile, {logger: options.logger, vk: true});

    const verificationKey = await fflonkVerificationKey(zkey, options);
    
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
