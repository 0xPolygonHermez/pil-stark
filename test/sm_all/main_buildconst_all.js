const fs = require("fs");
const path = require("path");
const version = require("../../package").version;
const { createConstantPols, compile, exportPolynomials } = require("zkpil");

const smGlobal = require("../../src/sm/sm_global.js");
const smPlookup = require("../sm_plookup/sm_plookup.js");
const smFibonacci = require("../sm_fibonacci/sm_fibonacci.js");
const smPermutation = require("../sm_permutation/sm_permutation.js");
const smConnection = require("../sm_connection/sm_connection.js");

const F1Field = require("../../src/f3g");


const argv = require("yargs")
    .version(version)
    .usage("node main_genconst_all.js -o <all.const>")
    .alias("o", "output")
    .argv;

async function run() {

    const outputFile = typeof(argv.output) === "string" ?  argv.output.trim() : "all.const";

    const F = new F1Field();
    const pil = await compile(F, path.join(__dirname, "all_main.pil"));
    const [constPols, constPolsArray, constPolsDef, constPolsArrayDef] =  createConstantPols(pil);

    await smGlobal.buildConstants(constPols.Global, constPolsDef.Global);
    await smPlookup.buildConstants(constPols.Plookup, constPolsDef.Plookup);
    await smFibonacci.buildConstants(constPols.Fibonacci, constPolsDef.Fibonacci);
    await smPermutation.buildConstants(constPols.Permutation, constPolsDef.Permutation);
    await smConnection.buildConstants(constPols.Connection, constPolsDef.Connection);

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

