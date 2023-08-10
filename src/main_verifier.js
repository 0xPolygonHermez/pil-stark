const fs = require("fs");
const version = require("../package").version;
const starkVerify = require("./stark/stark_verify.js");
var JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true });;

const Logger = require('logplease');

const argv = require("yargs")
    .version(version)
    .usage("node main_verifier.js -s <starkinfo.json> -v <verkey.json> -o <proof.json> -b <public.json>")
    .alias("s", "starkinfo")
    .alias("v", "verkey")
    .alias("o", "proof")
    .alias("b", "public")
    .string("arity")
    .argv;

async function run() {
    const starkinfoFile = typeof(argv.starkinfo) === "string" ?  argv.starkinfo.trim() : "starkinfo.json";
    const verKeyFile = typeof(argv.verkey) === "string" ?  argv.verkey.trim() : "verkey.json";
    const proofFile = typeof(argv.proof) === "string" ?  argv.proof.trim() : "verkey.json";
    const publicFile = typeof(argv.public) === "string" ?  argv.public.trim() : "verkey.json";

    const starkInfo = JSON.parse(await fs.promises.readFile(starkinfoFile, "utf8"));
    const verkey = JSONbig.parse(await fs.promises.readFile(verKeyFile, "utf8"));
    let proof = JSONbig.parse(await fs.promises.readFile(proofFile, "utf8"));
    const public = JSONbig.parse(await fs.promises.readFile(publicFile, "utf8"));

    const constRoot = verkey.constRoot;

    proof = str2bigInt(proof);

    const logger = Logger.create("pil-stark", {showTimestamp: false});
    Logger.setLogLevel("DEBUG");

    let options = {logger};
    if (starkInfo.starkStruct.verificationHashType === "BN128") {
        options.arity = Number(argv.arity) || 16;
        options.custom = argv.custom || false;
        console.log(`Arity: ${options.arity}, Custom: ${options.custom}`);

    } 
    
    const resV = await starkVerify(proof, public, constRoot, starkInfo, options);

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
