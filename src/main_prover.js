const fs = require("fs");
const version = require("../package").version;

const { newConstantPolsArray, newCommitPolsArray, compile } = require("pilcom");
const starkGen = require("./stark/stark_gen.js");
const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true, storeAsString: true });
const { proof2zkin } = require("./proof2zkin");
const buildMerklehashGL = require("./helpers/hash/merklehash/merklehash_p.js");
const buildMerkleHashBN128 = require("./helpers/hash/merklehash/merklehash_bn128_p.js");

const F3g = require("./helpers/f3g.js");
const { createHash } = require("crypto");



const argv = require("yargs")
    .version(version)
    .usage("node main_prover.js -m commit.bin -c <const.bin> -t <consttree.bin> -p <pil.json> [-P <pilconfig.json>] -s <starkinfo.json> -o <proof.json> -b <public.json>")
    .alias("m", "commit")
    .alias("c", "const")
    .alias("t", "consttree")
    .alias("p", "pil")
    .alias("P", "pilconfig")
    .alias("s", "starkinfo")
    .alias("o", "proof")
    .alias("z", "zkin")
    .alias("b", "public")
    .string("proverAddr")
    .argv;

async function run() {
    const F = new F3g();

    const commitFile = typeof(argv.commit) === "string" ?  argv.commit.trim() : "mycircuit.commit";
    const constFile = typeof(argv.const) === "string" ?  argv.const.trim() : "mycircuit.const";
    const constTreeFile = typeof(argv.consttree) === "string" ?  argv.consttree.trim() : "mycircuit.consttree";
    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const pilConfig = typeof(argv.pilconfig) === "string" ? JSON.parse(fs.readFileSync(argv.pilconfig.trim())) : {};
    const starkInfoFile = typeof(argv.starkinfo) === "string" ?  argv.starkinfo.trim() : "mycircuit.starkinfo.json";
    const proofFile = typeof(argv.proof) === "string" ?  argv.proof.trim() : "mycircuit.proof.json";
    const zkinFile = typeof(argv.zkin) === "string" ?  argv.zkin.trim() : "mycircuit.proof.zkin.json";
    const publicFile = typeof(argv.public) === "string" ?  argv.public.trim() : "mycircuit.public.json";

    const pil = await compile(F, pilFile, null, pilConfig);
    const starkInfo = JSON.parse(await fs.promises.readFile(starkInfoFile, "utf8"));


    const constPols =  newConstantPolsArray(pil);
    await constPols.loadFromFile(constFile);

    const cmPols =  newCommitPolsArray(pil);
    await cmPols.loadFromFile(commitFile);

    let MH;
    if (starkInfo.starkStruct.verificationHashType == "GL") {
        MH = await buildMerklehashGL();
    } else if (starkInfo.starkStruct.verificationHashType == "BN128") {
        console.log(`Merkle Tree Arity: ${starkInfo.merkleTreeArity}`);
        MH = await buildMerkleHashBN128(starkInfo.merkleTreeArity);
    } else {
        throw new Error("Invalid Hash Type: "+ starkInfo.starkStruct.verificationHashType);
    }

    const constTree = await MH.readFromFile(constTreeFile);

    const resP = await starkGen(cmPols, constPols, constTree, starkInfo);

    await fs.promises.writeFile(proofFile, JSONbig.stringify(resP.proof, null, 1), "utf8");

    const zkIn = proof2zkin(resP.proof);
    zkIn.publics = resP.publics;

    await fs.promises.writeFile(publicFile, JSONbig.stringify(resP.publics, null, 1), "utf8");
    if (starkInfo.starkStruct.verificationHashType == "BN128") {

        if (!argv.proverAddr) throw new Error("Prover Address not specified");
        zkIn.proverAddr = BigInt(argv.proverAddr);


        let b= zkIn.proverAddr.toString(16);
        while (b.length < 40) b = "0" + b;

        for (let i=0; i<resP.publics.length; i++) {
            let b2 = resP.publics[i].toString(16);
            while (b2.length<16) b2 = "0" + b2;
            b = b + b2;
        }

        const publicsHash = BigInt("0x" + createHash('sha256').update(b, 'hex').digest("hex")) % 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

        console.log(`Publics Hash: 0x${publicsHash.toString()}`);
    }


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
