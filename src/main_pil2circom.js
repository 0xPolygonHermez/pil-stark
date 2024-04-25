const fs = require("fs");
const version = require("../package").version;

const pil2circom = require("./pil2circom.js");
const F3g = require("./helpers/f3g.js");
const { compile } = require("pilcom");
const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true });



const argv = require("yargs")
    .version(version)
    .usage("node main_pil2circom.js -o <verifier.circom> -v <verification_key.json> -s <starkinfo.json> [--skipMain] [--enableInput] [--verkeyInput]")
    .alias("s", "starkinfo")
    .alias("v", "verkey")
    .alias("o", "output")
    .string("index")
    .argv;

async function run() {
    const starkInfoFile = typeof(argv.starkinfo) === "string" ?  argv.starkinfo.trim() : "starkinfo.json";
    const outputFile = typeof(argv.output) === "string" ?  argv.output.trim() : "mycircuit.verifier.circom";
    
    const starkInfo = JSON.parse(await fs.promises.readFile(starkInfoFile, "utf8"));

    const options = {
        skipMain: argv.skipMain || false,
        enableInput: argv.enableInput || false,
        verkeyInput: argv.verkeyInput || false
    }

    let constRoot;
    if(!options.verkeyInput ) {
        const verKeyFile = typeof(argv.verkey) === "string" ?  argv.verkey.trim() : "mycircuit.verkey.json";
        const verKey = JSONbig.parse(await fs.promises.readFile(verKeyFile, "utf8"));

        constRoot = verKey.constRoot;

    }

    if(argv.index) {
        options.index = Number(argv.index);
    }

    const verifier = await pil2circom(constRoot, starkInfo, options);

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

