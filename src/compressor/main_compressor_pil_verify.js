const fs = require("fs");
const version = require("../../package").version;

const { compile, verifyPil, newConstantPolsArray, newCommitPolsArray } = require("pilcom");
const F3g = require("../helpers/f3g");

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

    const F = new F3g();


    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "main.pil.json";
    const publics = typeof(argv.publics) === "string" ?  JSON.parse(fs.readFileSync(argv.publics.trim())) : false;
    const constantFile = typeof(argv.constant) === "string" ?  argv.constant.trim() : "constant.bin";
    const commitFile = typeof(argv.commit) === "string" ?  argv.commit.trim() : "commit.bin";

    const config = typeof(argv.config) === "string" ? JSON.parse(fs.readFileSync(argv.config.trim())) : {};

    const pil = await compile(F, pilFile, null, config);

    const constPols = newConstantPolsArray(pil, F);
    const cmPols =  newCommitPolsArray(pil, F);

    await constPols.loadFromFile(constantFile);
    await cmPols.loadFromFile(commitFile);

    const res = await verifyPil(F, pil, cmPols, constPols, {publics});

    if (res.length != 0) {
        for (let i=0; i<res.length; i++) {
            console.log(res[i]);
        }
        throw new Error("Pil does not pass");
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