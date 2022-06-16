const fs = require("fs");
const path = require("path");
const version = require("../../package").version;
const { createCommitedPols, compile, exportPolynomials } = require("zkpil");

const smFibonacci = require("./sm_fibonacci.js");
const F1Field = require("../../src/f3g");


const argv = require("yargs")
    .version(version)
    .usage("node main_exec_fibonacci.js -o <fibonacci.commit.bin> -i <input.json>")
    .alias("o", "output")
    .alias("i", "input")
    .argv;

async function run() {

    const outputFile = typeof(argv.output) === "string" ?  argv.output.trim() : "fibonacci.commit";
    const inputFile = typeof(argv.input) === "string" ?  argv.input.trim() : "input.json";

    const F = new F1Field();
    const pil = await compile(F, path.join(__dirname, "fibonacci.pil"));

    const input = JSON.parse(await fs.promises.readFile(inputFile, "utf8"));
    const [cmPols, cmPolsArray, cmPolsDef, cmPolsArrayDef] =  createCommitedPols(pil);

    const result = await smFibonacci.execute(cmPols.Fibonacci, cmPolsDef.Fibonacci, input);
    console.log("Result: " + result);

    await exportPolynomials(F, outputFile, cmPolsArray, cmPolsArrayDef);

    console.log("file Generated Correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});

