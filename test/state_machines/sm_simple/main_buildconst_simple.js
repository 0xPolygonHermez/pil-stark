const path = require("path");
const version = require("../../../package").version;
const { newConstantPolsArray, compile } = require("pilcom");

const smSimple = require("./sm_simple.js");

const F3g = require("../../../src/helpers/f3g");
const { F1Field } = require("ffjavascript");


const argv = require("yargs")
    .version(version)
    .usage("node main_genconst_simple.js -o <simple.const>")
    .alias("o", "output")
    .argv;

async function run() {

    const outputFile = typeof(argv.output) === "string" ?  argv.output.trim() : "simple.const";

    if(argv.curve && !["gl", "bn128"].includes(argv.curve)) throw new Error("Curve not supported");
    
    const curveName = argv.curve || "gl";
    const F = curveName === "gl" ? new F3g : new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);

    const pil = await compile(F, path.join(__dirname, "simple2.pil"));

    const constPols = newConstantPolsArray(pil, F);

    await smSimple.buildConstants(constPols.Simple);

    if(curveName === "gl"){
        await constPols.saveToFile(outputFile);
    } else {
        await constPols.saveToFileFr(outputFile);
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

