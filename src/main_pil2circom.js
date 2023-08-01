const fs = require("fs");
const version = require("../package").version;

const pil2circom = require("./pil2circom.js");
const F3g = require("./helpers/f3g.js");
const { compile } = require("pilcom");
const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true });



const argv = require("yargs")
    .version(version)
    .usage("node main_pil2circom.js -o <verifier.circom> -p <pil.json> [-P <pilconfig.json>] -v <verification_key.json> -s <starkinfo.json> [--skipMain] [--enableInput] [--verkeyInput] [--custom] [--arity]")
    .alias("p", "pil")
    .alias("P", "pilconfig")
    .alias("s", "starkinfo")
    .alias("v", "verkey")
    .alias("o", "output")
    .string("arity")
    .argv;

async function run() {
    const F = new F3g();

    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const pilConfig = typeof(argv.pilconfig) === "string" ? JSON.parse(fs.readFileSync(argv.pilconfig.trim())) : {};
    const starkInfoFIle = typeof(argv.starkinfo) === "string" ?  argv.starkinfo.trim() : "starkinfo.json";
    const verKeyFile = typeof(argv.verkey) === "string" ?  argv.verkey.trim() : "mycircuit.verkey.json";
    const outputFile = typeof(argv.output) === "string" ?  argv.output.trim() : "mycircuit.verifier.circom";

    const pil = await compile(F, pilFile, null, pilConfig);
    const verKey = JSONbig.parse(await fs.promises.readFile(verKeyFile, "utf8"));
    const constRoot = verKey.constRoot;

    const starkInfo = JSON.parse(await fs.promises.readFile(starkInfoFIle, "utf8"));

    const options = {
        skipMain: argv.skipMain || false,
        enableInput: argv.enableInput || false,
        verkeyInput: argv.verkeyInput || false,
        custom: argv.custom || false,
    }

    if(starkInfo.starkStruct.verificationHashType === "BN128") {
        options.arity =  Number(argv.arity) || 16;
        options.transcriptArity = 16;
        console.log(`Arity: ${options.arity}, transcriptArity: ${options.transcriptArity}, Custom: ${options.custom}`);
    }

    const verifier = await pil2circom(pil, constRoot, starkInfo, options);

    await fs.promises.writeFile(outputFile, verifier, "utf8");

    console.log("file Generated Correctly");

}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});

