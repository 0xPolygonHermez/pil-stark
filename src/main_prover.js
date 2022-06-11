const fs = require("fs");
const version = require("../package").version;

const F1Field = require("./f3g");
const { createCommitedPols, createConstantPols, compile, importPolynomials } = require("zkpil");
const starkGen = require("../src/stark_gen.js");
const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true });

const argv = require("yargs")
    .version(version)
    .usage("node main_prover.js -m commit.bin -c <const.bin> -t <consttree.bin> -p <pil.json> -s <starkstruct.json> -o <proof.json> -b <public.json>")
    .alias("m", "commit")
    .alias("c", "const")
    .alias("t", "consttree")
    .alias("p", "pil")
    .alias("s", "starkstruct")
    .alias("o", "proof")
    .alias("b", "public")
    .argv;

async function run() {
    const F = new F1Field();

    const commitFile = typeof(argv.commit) === "string" ?  argv.commit.trim() : "commit.bin";
    const constFile = typeof(argv.const) === "string" ?  argv.const.trim() : "consttree.bin";
    const constTreeFile = typeof(argv.consttree) === "string" ?  argv.consttree.trim() : "consttree.bin";
    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "main.pil.json";
    const starkStructFile = typeof(argv.starkstruct) === "string" ?  argv.starkstruct.trim() : "stark_struct.json";
    const proofFile = typeof(argv.proof) === "string" ?  argv.proof.trim() : "verkey.json";
    const publicFile = typeof(argv.public) === "string" ?  argv.public.trim() : "verkey.json";

    const pil = await compile(F, pilFile);
    const starkStruct = JSON.parse(await fs.promises.readFile(starkStructFile, "utf8"));

    const fd =await fs.promises.open(constTreeFile, "r");
    const st =await fd.stat();
    const constTree = new BigUint64Array(st.size/8)
    await fd.read(constTree, 0, st.size);
    await fd.close();


    const [ , , , cmPolsArrayDef] =  createCommitedPols(pil);
    const [ , , , constPolsArrayDef] =  createConstantPols(pil);

    const constPolsArray = await importPolynomials(F, constFile, constPolsArrayDef);
    const cmPolsArray = await importPolynomials(F, commitFile, cmPolsArrayDef);

    const resP = await starkGen(cmPolsArray, constPolsArray, constTree, pil, starkStruct);

    await fs.promises.writeFile(proofFile, JSONbig.stringify(resP.proof, null, 1), "utf8");
    await fs.promises.writeFile(publicFile, JSONbig.stringify(resP.publics, null, 1), "utf8");

    console.log("files Generated Correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});

