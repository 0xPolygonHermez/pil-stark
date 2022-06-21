const fs = require("fs");
const version = require("../package").version;
const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true });


const F1Field = require("./f3g");
const { createConstantPols, compile, importPolynomials } = require("zkpil");
const { extendPol } = require("./polutils");
const MerkleHashGL = require("./merklehash.js");
const MerkleHashBN128 = require("./merklehash.bn128.js");
const buildPoseidonGL = require("./poseidon");
const buildPoseidonBN128 = require("circomlibjs").buildPoseidon;


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

    const pil = await compile(F, pilFile);
    const [ , , , constPolsArrayDef] =  createConstantPols(pil);
    const starkStruct = JSON.parse(await fs.promises.readFile(starkStructFile, "utf8"));

    const constPolsArray = await importPolynomials(F, constFile, constPolsArrayDef);


    const constPolsArrayE = [];
    for (let i=0; i<constPolsArray.length; i++) {
        console.log(`Extending polynomial ${i+1}/${constPolsArray.length}`);
        constPolsArrayE[i] = await extendPol(F, constPolsArray[i], starkStruct.nBitsExt - starkStruct.nBits);
    }

    let MH;
    if (starkStruct.hashType == "GL") {
        const poseidonGL = await buildPoseidonGL();
        MH = new MerkleHashGL(poseidonGL);
    } else if (starkStruct.hashType == "BN128") {
        const poseidonBN128 = await buildPoseidonBN128();
        MH = new MerkleHashBN128(poseidonBN128);
    } else {
        throw new Error("Invalid Hash Type: "+ starkStruct.hashType);
    }

    const constTree = await MH.merkelize(constPolsArrayE, 1, constPolsArrayE.length, constPolsArrayE[0].length);

    const constRoot = MH.root(constTree);

    const verKey = {
        constRoot: constRoot
    };

    await fs.promises.writeFile(verKeyFile, JSONbig.stringify(verKey, null, 1), "utf8");

    const fd =await fs.promises.open(constTreeFile, "w+");

    const MAX_WRITE_SIZE=2**24;
    let pending = constTree.byteLength;
    let offset = 0;
    while (pending) {
        const n= Math.min(MAX_WRITE_SIZE, pending);
        await fd.write(constTree, offset, n);
        offset += n;
        pending -= n;
    }
    await fd.write(constTree);
    await fd.close();

    console.log("files Generated Correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});

