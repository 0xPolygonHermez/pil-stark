const fs = require("fs");
const path = require("path");
const version = require("../../package").version;
const { createConstantPols, compile, exportPolynomials } = require("pilcom");

const smFibonacci = require("./sm_fibonacci.js");
const F1Field = require("../../src/f3g");


const argv = require("yargs")
    .version(version)
    .usage("node main_genconst_fibonacci.js -o <fibonacci.const>")
    .alias("o", "output")
    .argv;

async function run() {

    const outputFile = typeof(argv.output) === "string" ?  argv.output.trim() : "fibonacci.const";

    const F = new F1Field();
    const pil = await compile(F, path.join(__dirname, "fibonacci_main.pil"));
    const [constPols, constPolsArray, constPolsDef, constPolsArrayDef] =  createConstantPols(pil);

    await smFibonacci.buildConstants(constPols.Fibonacci, constPolsDef.Fibonacci);

    await exportPolynomials(F, outputFile, constPolsArray, constPolsArrayDef);

    console.log("file Generated Correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});

