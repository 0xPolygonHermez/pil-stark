const fs = require("fs");
const path = require("path");
const version = require("../../../package").version;

const smFibonacci = require("./sm_fibonacci.js");

const F3g = require("../../../src/helpers/f3g");
const { newCommitPolsArray, compile } = require("pilcom");


const argv = require("yargs")
    .version(version)
    .usage("node main_exec_fibonacci.js -o <fibonacci.commit.bin> -i <input.json>")
    .alias("o", "output")
    .alias("i", "input")
    .argv;

async function run() {

    const outputFile = typeof(argv.output) === "string" ?  argv.output.trim() : "fibonacci.commit";
    const inputFile = typeof(argv.input) === "string" ?  argv.input.trim() : "input.json";

    const F = new F3g();
    const pil = await compile(F, path.join(__dirname, "fibonacci_main.pil"));

    const input = JSON.parse(await fs.promises.readFile(inputFile, "utf8"));
    const cmPols =  newCommitPolsArray(pil);

    const result = await smFibonacci.execute(cmPols.Fibonacci, input);
    console.log("Result: " + result);

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

