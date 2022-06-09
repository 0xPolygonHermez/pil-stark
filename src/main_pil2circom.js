const fs = require("fs");
const version = require("../package").version;

const pil2circom = require("./pil2circom.js");
const F1Field = require("./f3g.js");
const { compile } = require("zkpil");


const argv = require("yargs")
    .version(version)
    .usage("node main_pil2circom.js -o <verifier.circom> -p <pil.json> -v <verification_key.json>")
    .alias("p", "pil")
    .alias("s", "starkStruct")
    .alias("v", "verkey")
    .alias("o", "output")
    .argv;

async function run() {
    const F = new F1Field();

    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "main.pil.json";
    const verKeyFile = typeof(argv.verkey) === "string" ?  argv.verkey.trim() : "verification_key.json";
    const outputFile = typeof(argv.output) === "string" ?  argv.output.trim() : "verifier.circom";
    const starkStructFile = typeof(argv.starkStruct) === "string" ?  argv.starkStruct.trim() : "stark_struct.json";

    const pil = await compile(F, pilFile);
    const verKey = JSON.parse(await fs.promises.readFile(verKeyFile, "utf8"));
    const constRoot = [];
    for (let i=0; i<4; i++) {
        constRoot[i] = BigInt(verKey.constRoot[i]);
    }
    const template = await fs.promises.readFile("./circuitsGL/stark_verifier.circom.ejs", "utf8");
    const starkStruct = JSON.parse(await fs.promises.readFile(starkStructFile, "utf8"));

    const verifier = await pil2circom(template, pil, constRoot, starkStruct);

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

