const fs = require("fs");
const path = require("path");
const version = require("../../../package").version;

const smSimple = require("./sm_simple.js");

const F3g = require("../../../src/helpers/f3g");
const { newCommitPolsArray, compile } = require("pilcom");


const argv = require("yargs")
    .version(version)
    .usage("node main_exec_simple.js -o <simple.commit.bin>")
    .alias("o", "output")
    .argv;

async function run() {

    const outputFile = typeof(argv.output) === "string" ?  argv.output.trim() : "simple.commit";

    const F = new F3g();
    const pil = await compile(F, path.join(__dirname, "simple1.pil"));

    const cmPols =  newCommitPolsArray(pil);

    await smSimple.execute(cmPols.Simple);

    await cmPols.saveToFile(outputFile);

    console.log("file Generated Correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});

