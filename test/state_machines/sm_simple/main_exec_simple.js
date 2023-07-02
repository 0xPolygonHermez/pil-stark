const fs = require("fs");
const path = require("path");
const version = require("../../../package").version;

const smSimple = require("./sm_simple.js");

const F3g = require("../../../src/helpers/f3g");
const { F1Field } = require("ffjavascript");
const { newCommitPolsArray, compile } = require("pilcom");


const argv = require("yargs")
    .version(version)
    .usage("node main_exec_simple.js -o <simple.commit.bin>")
    .alias("o", "output")
    .argv;

async function run() {

    const outputFile = typeof(argv.output) === "string" ?  argv.output.trim() : "simple.commit";

    if(argv.curve && !["gl", "bn128"].includes(argv.curve)) throw new Error("Curve not supported");
    
    const curveName = argv.curve || "gl";
    const F = curveName === "gl" ? new F3g : new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);

    const pil = await compile(F, path.join(__dirname, "simple2.pil"));

    const cmPols =  newCommitPolsArray(pil, F);

    await smSimple.execute(F, cmPols.Simple);

    if(curveName === "gl"){
        await cmPols.saveToFile(outputFile);
    } else {
        await cmPols.saveToFileFr(outputFile);
    }

    console.log("file Generated Correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});

