const fs = require("fs");
const version = require("../package").version;
const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true });


const F1Field = require("./f3g");
const { newConstantPolsArray, compile } = require("pilcom");
const buildMerkleHashGL = require("./merklehash_p.js");
const buildMerkleHashBN128 = require("./merklehash_bn128_p.js");
const {interpolate} = require("./fft_p");

const argv = require("yargs")
    .version(version)
    .usage("node main_buildconsttree.js -c const.bin -p <pil.json> -s <starkstruct.json> -t <consttree.bin>  -v <verification_key.json>")
    .alias("c", "const")
    .alias("p", "pil")
    .alias("s", "starkstruct")
    .alias("t", "consttree")
    .alias("v", "verkey")
    .argv;

async function run() {
    const F = new F1Field();

    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const constFile = typeof(argv.const) === "string" ?  argv.const.trim() : "mycircuit.const";
    const starkStructFile = typeof(argv.starkstruct) === "string" ?  argv.starkstruct.trim() : "mycircuit.stark_struct.json";
    const constTreeFile = typeof(argv.consttree) === "string" ?  argv.consttree.trim() : "mycircuit.consttree";
    const verKeyFile = typeof(argv.verkey) === "string" ?  argv.verkey.trim() : "mycircuit.verkey.json";

    const starkStruct = JSON.parse(await fs.promises.readFile(starkStructFile, "utf8"));
    const pil = await compile(F, pilFile);

    const nBits = starkStruct.nBits;
    const nBitsExt = starkStruct.nBitsExt;
    const n = 1 << nBits;
    const nExt = 1 << nBitsExt;

    const constPols = newConstantPolsArray(pil);
    await constPols.loadFromFile(constFile);

    const constBuff  = constPols.writeToBuff();

    const constPolsArrayEbuff = new ArrayBuffer(nExt*pil.nConstants*8);
    const constPolsArrayE = new BigUint64Array(constPolsArrayEbuff);

    await interpolate(constBuff, 0, pil.nConstants, nBits, constPolsArrayE, 0, nBitsExt );


    let MH;
    if (starkStruct.verificationHashType == "GL") {
        MH = await buildMerkleHashGL();
    } else if (starkStruct.verificationHashType == "BN128") {
        MH = await buildMerkleHashBN128();
    } else {
        throw new Error("Invalid Hash Type: "+ starkStruct.verificationHashType);
    }

    const constTree = await MH.merkelize(constPolsArrayE, 0, pil.nConstants, nExt);

    const constRoot = MH.root(constTree);

    const verKey = {
        constRoot: constRoot
    };

    await fs.promises.writeFile(verKeyFile, JSONbig.stringify(verKey, null, 1), "utf8");

    await MH.writeToFile(constTree, constTreeFile);

    console.log("files Generated Correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});

