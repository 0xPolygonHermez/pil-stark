const fs = require("fs");
const version = require("../package").version;

const { newConstantPolsArray, newCommitPolsArray, compile } = require("pilcom");
const starkInfoGen = require("../src/starkinfo.js");
const { starkGen, starkGen_allocate } = require("../src/stark_gen.js");
const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true, storeAsString: true });
const { proof2zkin } = require("./proof2zkin");
const buildMerklehashGL = require("../src/merklehash_p.js");
const buildMerklehashBN128 = require("../src/merklehash.bn128.js");
const GL3 = require("./f3g.js");



const argv = require("yargs")
    .version(version)
    .usage("node main_prover.js -m commit.bin -c <const.bin> -t <consttree.bin> -p <pil.json> -s <starkstruct.json> -o <proof.json> -b <public.json>")
    .alias("m", "commit")
    .alias("c", "const")
    .alias("t", "consttree")
    .alias("p", "pil")
    .alias("s", "starkstruct")
    .alias("o", "proof")
    .alias("z", "zkin")
    .alias("b", "public")
    .argv;

async function run() {
    const F = new GL3();

    const commitFile = typeof(argv.commit) === "string" ?  argv.commit.trim() : "mycircuit.commit";
    const constFile = typeof(argv.const) === "string" ?  argv.const.trim() : "mycircuit.const";
    const constTreeFile = typeof(argv.consttree) === "string" ?  argv.consttree.trim() : "mycircuit.consttree";
    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const starkStructFile = typeof(argv.starkstruct) === "string" ?  argv.starkstruct.trim() : "mycircuit.stark_struct.json";
    const proofFile = typeof(argv.proof) === "string" ?  argv.proof.trim() : "mycircuit.proof.json";
    const zkinFile = typeof(argv.zkin) === "string" ?  argv.zkin.trim() : "mycircuit.proof.zkin.json";
    const publicFile = typeof(argv.public) === "string" ?  argv.public.trim() : "mycircuit.public.json";

    const pil = await compile(F, pilFile);
    const starkStruct = JSON.parse(await fs.promises.readFile(starkStructFile, "utf8"));

    const nBits = starkStruct.nBits;
    const n = 1 << nBits;

    const constPols =  newConstantPolsArray(pil);
    await constPols.loadFromFile(constFile);

    const cmPols =  newCommitPolsArray(pil);
    await cmPols.loadFromFile(commitFile);

    let MH;
    if (starkStruct.verificationHashType == "GL") {
        MH = await buildMerklehashGL();
    } else if (starkStruct.verificationHashType == "BN128") {
        MH = await buildMerklehashBN128();
    } else {
        throw new Error("Invalid Hash Type: "+ starkStruct.verificationHashType);
    }

    const constTree = await MH.readFromFile(constTreeFile);

    const starkInfo = starkInfoGen(pil, starkStruct);

    const resP = await starkGen(cmPols, constPols, constTree, pil, starkInfo);

    await fs.promises.writeFile(proofFile, JSONbig.stringify(resP.proof, null, 1), "utf8");
    await fs.promises.writeFile(publicFile, JSONbig.stringify(resP.publics, null, 1), "utf8");

    const zkIn = proof2zkin(resP.proof);
    zkIn.publics = resP.publics;
    await fs.promises.writeFile(zkinFile, JSONbig.stringify(zkIn, (k, v) => {
        if (typeof(v) === "bigint") {
            return v.toString();
        } else {
            return v;
        }
    }, 1), "utf8");

    console.log("files Generated Correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});

