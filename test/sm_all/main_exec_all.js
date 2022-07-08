const fs = require("fs");
const path = require("path");
const version = require("../../package").version;
const { createCommitedPols, compile, exportPolynomials } = require("pilcom");

const smPlookup = require("../sm_plookup/sm_plookup.js");
const smFibonacci = require("../sm_fibonacci/sm_fibonacci.js");
const smPermutation = require("../sm_permutation/sm_permutation.js");
const smConnection = require("../sm_connection/sm_connection.js");
const F1Field = require("../../src/f3g");


const argv = require("yargs")
    .version(version)
    .usage("node main_exec_all.js -o <all.commit> -i <input.json>")
    .alias("o", "output")
    .alias("i", "input")
    .argv;

async function run() {

    const outputFile = typeof(argv.output) === "string" ?  argv.output.trim() : "all.commit";
    const inputFile = typeof(argv.input) === "string" ?  argv.input.trim() : "input.json";

    const F = new F1Field();
    const pil = await compile(F, path.join(__dirname, "all_main.pil"));

    const input = JSON.parse(await fs.promises.readFile(inputFile, "utf8"));
    const [cmPols, cmPolsArray, cmPolsDef, cmPolsArrayDef] =  createCommitedPols(pil);

    await smPlookup.execute(cmPols.Plookup, cmPolsDef.Plookup);
    await smFibonacci.execute(cmPols.Fibonacci, cmPolsDef.Fibonacci, [1,2]);
    await smPermutation.execute(cmPols.Permutation, cmPolsDef.Permutation);
    await smConnection.execute(cmPols.Connection, cmPolsDef.Connection);

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

