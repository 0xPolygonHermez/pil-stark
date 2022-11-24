const path = require("path");
const version = require("../../package").version;
const { newConstantPolsArray, compile } = require("pilcom");

const smSimple = require("./sm_simple.js");

const F1Field = require("../../src/f3g");


const argv = require("yargs")
    .version(version)
    .usage("node main_genconst_simple.js -o <simple.const>")
    .alias("o", "output")
    .argv;

async function run() {

    const outputFile = typeof(argv.output) === "string" ?  argv.output.trim() : "simple.const";

    const F = new F1Field();
    const pil = await compile(F, path.join(__dirname, "simple_main.pil"));

    const constPols = newConstantPolsArray(pil);

    await smSimple.buildConstants(constPols.Simple);

    await constPols.saveToFile(outputFile);

    console.log("file Generated Correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});

