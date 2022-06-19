const fs = require("fs");
const version = require("../package").version;

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
    } else if (starkStruct.hashType == "GL") {
        const poseidonBN128 = await buildPoseidonBN128();
        MH = new MerkleHashBN128(poseidonBN128);
    } else {
        throw new Error("Invalid Hash Type: "+ starkStruct.hashType);
    }

    const constTree = await MH.merkelize(constPolsArrayE, 1, constPolsArrayE.length, constPolsArrayE[0].length);

    const constRoot = MH.root(constTree);
    const verKey = {
        constRoot: [
            constRoot[0].toString(),
            constRoot[1].toString(),
            constRoot[2].toString(),
            constRoot[3].toString(),
        ]
    };

    await fs.promises.writeFile(verKeyFile, JSON.stringify(verKey, null, 1), "utf8");

    const fd =await fs.promises.open(constTreeFile, "w+");
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

