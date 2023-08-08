const fs = require("fs");
const version = require("../../package").version;

const {newCommitPolsArray, compile } = require("pilcom");
const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true, storeAsString: true });
const { F1Field } = require("ffjavascript");
const fflonkProve = require("./helpers/fflonk_prover");
const { readPilFflonkZkeyFile } = require("./zkey/zkey_pilfflonk");

const Logger = require('logplease');

const argv = require("yargs")
    .version(version)
    .usage("node main_prover.js -m commit.bin -p <pil.json> [-P <pilconfig.json>] -t <ptau> -z <circuit.zkey> -f <fflonkinfo.json> -o <proof.json> -b <public.json>")
    .alias("t", "tau")
    .alias("m", "commit")
    .alias("p", "pil")
    .alias("P", "pilconfig")
    .alias("f", "fflonkinfo")
    .alias("z", "zkey")
    .alias("o", "proof")
    .alias("b", "public")
    .string("proverAddr")
    .argv;

async function run() {
    const ptauFile = typeof(argv.tau) === "string" ?  argv.tau.trim() : "mycircuit.ptau";
    const commitFile = typeof(argv.commit) === "string" ?  argv.commit.trim() : "mycircuit.commit";
    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const pilConfig = typeof(argv.pilconfig) === "string" ? JSON.parse(fs.readFileSync(argv.pilconfig.trim())) : {};
    const fflonkInfoFile = typeof(argv.fflonkinfo) === "string" ?  argv.fflonkinfo.trim() : "mycircuit.fflonkInfo.json";
    const zkeyFile = typeof(argv.zkey) === "string" ?  argv.zkey.trim() : "mycircuit.zkey";
    const proofFile = typeof(argv.proof) === "string" ?  argv.proof.trim() : "mycircuit.proof.json";
    const publicFile = typeof(argv.public) === "string" ?  argv.public.trim() : "mycircuit.public.json";

    const logger = Logger.create("pil-fflonk", {showTimestamp: false});
        Logger.setLogLevel("DEBUG");

    const options = {logger};

    // Load zkey file
    if (options.logger) options.logger.info("> Reading zkey file");
    const zkey = await readPilFflonkZkeyFile(zkeyFile, options);

    const F = new F1Field(zkey.r);

    const pil = await compile(F, pilFile, null, pilConfig);
    const fflonkInfo = JSON.parse(await fs.promises.readFile(fflonkInfoFile, "utf8"));

    const cmPols =  newCommitPolsArray(pil, F);
    await cmPols.loadFromFileFr(commitFile, zkey.curve.Fr);


    const resP = await fflonkProve(zkey, cmPols, fflonkInfo, ptauFile, options);
    
    await fs.promises.writeFile(proofFile, JSONbig.stringify(resP.proof, null, 1), "utf8");

    await fs.promises.writeFile(publicFile, JSONbig.stringify(resP.publicSignals, null, 1), "utf8");

    console.log("files Generated Correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});
