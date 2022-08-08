const fs = require("fs");
const version = require("../package").version;

const F1Field = require("./f3g");
const { compile } = require("pilcom");
const starkVerify = require("../src/stark_verify.js");
const starkInfoGen = require("../src/starkinfo.js");
var JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true });;

const argv = require("yargs")
    .version(version)
    .usage("node main_verifier.js -p <pil.json> [-P <pilconfig.json>] -s <starkstruct.json> -v <verkey.json> -o <proof.json> -b <public.json>")
    .alias("p", "pil")
    .alias("P", "pilconfig")
    .alias("s", "starkstruct")
    .alias("v", "verkey")
    .alias("o", "proof")
    .alias("b", "public")
    .argv;

async function run() {
    const F = new F1Field();

    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "main.pil.json";
    const pilConfig = typeof(argv.pilconfig) === "string" ? JSON.parse(fs.readFileSync(argv.pilconfig.trim())) : {};
    const starkStructFile = typeof(argv.starkstruct) === "string" ?  argv.starkstruct.trim() : "stark_struct.json";
    const verKeyFile = typeof(argv.verkey) === "string" ?  argv.verkey.trim() : "verkey.json";
    const proofFile = typeof(argv.proof) === "string" ?  argv.proof.trim() : "verkey.json";
    const publicFile = typeof(argv.public) === "string" ?  argv.public.trim() : "verkey.json";

    const pil = await compile(F, pilFile, null, pilConfig);
    const starkStruct = JSON.parse(await fs.promises.readFile(starkStructFile, "utf8"));
    const verkey = JSONbig.parse(await fs.promises.readFile(verKeyFile, "utf8"));
    let proof = JSONbig.parse(await fs.promises.readFile(proofFile, "utf8"));
    const public = JSONbig.parse(await fs.promises.readFile(publicFile, "utf8"));

    const constRoot = verkey.constRoot;

    proof = str2bigInt(proof);

    const starkInfo = starkInfoGen(pil, starkStruct);

    const resV = await starkVerify(proof, public, constRoot, starkInfo);

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


function str2bigInt(obj) {
    if (typeof obj === "object") {
        for (k in obj) {
            obj[k] = str2bigInt(obj[k]);
        }
        return obj;
    } else if (Array.isArray(obj)) {
        for (let i=0; i<obj.length; i++) {
            obj[i] = str2bigInt(obj[i]);
        }
        return obj;
    } else if (typeof obj == "string") {
        return BigInt(obj);
    } else {
        return obj;
    }
}
