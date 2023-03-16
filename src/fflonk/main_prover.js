const fs = require("fs");
const version = require("../../package").version;

const { newConstantPolsArray, newCommitPolsArray, compile } = require("pilcom");
const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true, storeAsString: true });
const { proof2zkin } = require("../proof2zkin");
const { F1Field } = require("ffjavascript");
const {fflonkProve} = require("./helpers/fflonk_prover");



const argv = require("yargs")
    .version(version)
    .usage("node main_prover.js -m commit.bin -c <const.bin> -p <pil.json> [-P <pilconfig.json>] -t <ptau> - k <zkey.json> -f <fflonkinfo.json> -o <proof.json> -b <public.json>")
    .alias("t", "tau")
    .alias("m", "commit")
    .alias("c", "const")
    .alias("p", "pil")
    .alias("P", "pilconfig")
    .alias("f", "fflonkinfo")
    .alias("k", "zkey")
    .alias("o", "proof")
    .alias("z", "zkin")
    .alias("b", "public")
    .string("proverAddr")
    .argv;

async function run() {
    const F = new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);

    const ptauFile = typeof(argv.tau) === "string" ?  argv.tau.trim() : "mycircuit.ptau";
    const commitFile = typeof(argv.commit) === "string" ?  argv.commit.trim() : "mycircuit.commit";
    const constFile = typeof(argv.const) === "string" ?  argv.const.trim() : "mycircuit.const";
    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const pilConfig = typeof(argv.pilconfig) === "string" ? JSON.parse(fs.readFileSync(argv.pilconfig.trim())) : {};
    const fflonkInfoFile = typeof(argv.starkinfo) === "string" ?  argv.starkinfo.trim() : "mycircuit.starkinfo.json";
    const zkeyFile = typeof(argv.zkey) === "string" ?  argv.zkey.trim() : "mycircuit_zkey.json";
    const proofFile = typeof(argv.proof) === "string" ?  argv.proof.trim() : "mycircuit.proof.json";
    const zkinFile = typeof(argv.zkin) === "string" ?  argv.zkin.trim() : "mycircuit.proof.zkin.json";
    const publicFile = typeof(argv.public) === "string" ?  argv.public.trim() : "mycircuit.public.json";

    const pil = await compile(F, pilFile, null, pilConfig);
    const fflonkInfo = JSON.parse(await fs.promises.readFile(fflonkInfoFile, "utf8"));
    const zkey = JSON.parse(await fs.promises.readFile(zkeyFile, "utf8"));

    console.log(zkey);

    const constPols =  newConstantPolsArray(pil, F);
    await constPols.loadFromFile(constFile);

    const cmPols =  newCommitPolsArray(pil, F);
    await cmPols.loadFromFile(commitFile);

    const options = {F, logger: console};
    const resP = await fflonkProve(cmPols, constPols, fflonkInfo, ptauFile, options);
    
    console.log("files Generated Correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});

