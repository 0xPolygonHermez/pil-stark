const fs = require("fs");
const version = require("../package").version;

const pil2circom = require("./pil2circom.js");
const F1Field = require("./f3g.js");
const { compile } = require("pilcom");
const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true });



const argv = require("yargs")
    .version(version)
    .usage("node main_pil2circom.js -o <verifier.circom> -p <pil.json> [-P <pilconfig.json>] -v <verification_key.json> [--skipMain] [--enableInput] [--verkeyInput]")
    .alias("p", "pil")
    .alias("P", "pilconfig")
    .alias("s", "starkStruct")
    .alias("v", "verkey")
    .alias("o", "output")
    .argv;

async function run() {
    const F = new F1Field();

    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const pilConfig = typeof(argv.pilconfig) === "string" ? JSON.parse(fs.readFileSync(argv.pilconfig.trim())) : {};
    const starkStructFile = typeof(argv.starkStruct) === "string" ?  argv.starkStruct.trim() : "stark_struct.json";
    const verKeyFile = typeof(argv.verkey) === "string" ?  argv.verkey.trim() : "mycircuit.verkey.json";
    const outputFile = typeof(argv.output) === "string" ?  argv.output.trim() : "mycircuit.verifier.circom";

    const pil = await compile(F, pilFile, null, pilConfig);
    const verKey = JSONbig.parse(await fs.promises.readFile(verKeyFile, "utf8"));
    const constRoot = verKey.constRoot;

    const starkStruct = JSON.parse(await fs.promises.readFile(starkStructFile, "utf8"));

    const options = {
        skipMain: argv.skipMain || false,
        enableInput: argv.enableInput || false,
        verkeyInput: argv.verkeyInput || false
    }

    const verifier = await pil2circom(pil, constRoot, starkStruct, options);

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

