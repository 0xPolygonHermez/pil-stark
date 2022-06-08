const fs = require("fs");
const version = require("../package").version;

const F1Field = require("./f3g");
const { createConstantPols, compile, importPolynomials } = require("zkpil");
const { extendPol } = require("./polutils");
const MerkleHash = require("./merkle_hash.js");


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

    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "main.pil.json";
    const constFile = typeof(argv.const) === "string" ?  argv.const.trim() : "const.bin";
    const starkStructFile = typeof(argv.starkstruct) === "string" ?  argv.starkstruct.trim() : "stark_struct.json";
    const constTreeFile = typeof(argv.consttree) === "string" ?  argv.consttree.trim() : "consttree.bin";
    const verKeyFile = typeof(argv.verkey) === "string" ?  argv.verkey.trim() : "verkey.json";

    const pil = await compile(F, pilFile);
    const [ , , , constPolsArrayDef] =  createConstantPols(pil);
    const starkStruct = JSON.parse(await fs.promises.readFile(starkStructFile, "utf8"));

    const constPolsArray = await importPolynomials(F, constFile, constPolsArrayDef);


    const constPolsArrayE = [];
    for (let i=0; i<constPolsArray.length; i++) {
        constPolsArrayE[i] = await extendPol(F, constPolsArray[i], starkStruct.nBitsExt - starkStruct.nBits);
    }

    const constTree = MerkleHash.merkelize(constPolsArrayE, 1, constPolsArrayE.length, constPolsArrayE[0].length);

    const constRoot = MerkleHash.root(constTree);
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

