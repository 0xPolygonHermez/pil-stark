const fs = require("fs");
const version = require("../package").version;

const F1Field = require("./f3g");
const { createCommitedPols, createConstantPols, compile, importPolynomials } = require("zkpil");
const starkVerify = require("../src/stark_verify.js");
var JSONbig = require('json-bigint')({ useNativeBigInt: true });;

const argv = require("yargs")
    .version(version)
    .usage("node main_verifier.js -p <pil.json>  -s <starkstruct.json> -v <verkey.json> -o <proof.json> -b <public.json>")
    .alias("p", "pil")
    .alias("s", "starkstruct")
    .alias("v", "verkey")
    .alias("o", "proof")
    .alias("b", "public")
    .argv;

async function run() {
    const F = new F1Field();

    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "main.pil.json";
    const starkStructFile = typeof(argv.starkstruct) === "string" ?  argv.starkstruct.trim() : "stark_struct.json";
    const verKeyFile = typeof(argv.verkey) === "string" ?  argv.verkey.trim() : "verkey.json";
    const proofFile = typeof(argv.proof) === "string" ?  argv.proof.trim() : "verkey.json";
    const publicFile = typeof(argv.public) === "string" ?  argv.public.trim() : "verkey.json";

    const pil = await compile(F, pilFile);
    const starkStruct = JSON.parse(await fs.promises.readFile(starkStructFile, "utf8"));
    const verkey = JSON.parse(await fs.promises.readFile(verKeyFile, "utf8"));
    const proof = JSONbig.parse(await fs.promises.readFile(proofFile, "utf8"));
    const public = JSONbig.parse(await fs.promises.readFile(publicFile, "utf8"));

    const constRoot = [];
    constRoot[0] = BigInt(verkey.constRoot[0]);
    constRoot[1] = BigInt(verkey.constRoot[1]);
    constRoot[2] = BigInt(verkey.constRoot[2]);
    constRoot[3] = BigInt(verkey.constRoot[3]);

    const resV = await starkVerify(proof, public, pil, constRoot, starkStruct);

    if (resV === true) {
        console.log("Verification Ok!!")
        return 0;
    } else {
        console.log("FAIL!")
        return 1;
    }
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});

