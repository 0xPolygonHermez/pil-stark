const path = require("path");
const version = require("../../../package").version;

const smPlookup = require("../sm_plookup/sm_plookup.js");
const smFibonacci = require("../sm_fibonacci/sm_fibonacci.js");
const smPermutation = require("../sm_permutation/sm_permutation.js");
const smConnection = require("../sm_connection/sm_connection.js");

const F3g = require("../../../src/helpers/f3g.js");
const { newCommitPolsArray, compile } = require("pilcom");


const argv = require("yargs")
    .version(version)
    .usage("node main_exec_all.js -o <all.commit> -i <input.json>")
    .alias("o", "output")
    .alias("i", "input")
    .argv;

async function run() {

    const outputFile = typeof(argv.output) === "string" ?  argv.output.trim() : "all.commit";

    const F = new F3g();
    const pil = await compile(F, path.join(__dirname, "all_main.pil"));
    const cmPols =  newCommitPolsArray(pil);

    await smPlookup.execute(cmPols.Plookup);
    await smFibonacci.execute(cmPols.Fibonacci, [1,2]);
    await smPermutation.execute(cmPols.Permutation);
    await smConnection.execute(cmPols.Connection);

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

