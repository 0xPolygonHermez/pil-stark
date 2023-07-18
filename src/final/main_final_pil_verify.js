const fs = require("fs");
const version = require("../../package").version;

const { compile, verifyPil, newConstantPolsArray, newCommitPolsArray } = require("pilcom");

const { F1Field, getCurveFromName } = require("ffjavascript");

const argv = require("yargs")
    .version(version)
    .usage("main_pilverifier.js -t <commit.bin> -p <pil.json> -c <constant.bin> [-u <publics.json>]")
    .alias("p", "pil")
    .alias("t", "commit")
    .alias("c", "constant")
    .alias("P", "config")
    .alias("v", "verbose")
    .alias("u", "publics")
    .argv;

async function run() {

    const F = new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);


    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "main.pil.json";
    const publics = typeof(argv.publics) === "string" ?  JSON.parse(fs.readFileSync(argv.publics.trim())) : false;
    const constantFile = typeof(argv.constant) === "string" ?  argv.constant.trim() : "constant.bin";
    const commitFile = typeof(argv.commit) === "string" ?  argv.commit.trim() : "commit.bin";

    const config = typeof(argv.config) === "string" ? JSON.parse(fs.readFileSync(argv.config.trim())) : {};

    const pil = await compile(F, pilFile, null, config);

    const constPols = newConstantPolsArray(pil, F);
    const cmPols =  newCommitPolsArray(pil, F);

    const curve = await getCurveFromName("bn128");

    const Fr = curve.Fr;

    await curve.terminate();

    await constPols.loadFromFileFr(constantFile, Fr);
    await cmPols.loadFromFileFr(commitFile, Fr);

    const res = await verifyPil(F, pil, cmPols, constPols, {publics});

    if (res.length != 0) {
        console.log("Pil does not pass");
        for (let i=0; i<res.length; i++) {
            console.log(res[i]);
        }
    } else {
        console.log("PIL OK!!")
    }
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});