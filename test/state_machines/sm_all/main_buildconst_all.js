const path = require("path");
const version = require("../../../package").version;
const { newConstantPolsArray, compile } = require("pilcom");

const smGlobal = require("../sm/sm_global.js");
const smPlookup = require("../sm_plookup/sm_plookup.js");
const smFibonacci = require("../sm_fibonacci/sm_fibonacci.js");
const smPermutation = require("../sm_permutation/sm_permutation.js");
const smConnection = require("../sm_connection/sm_connection.js");

const F3g = require("../../../src/helpers/f3g.js");
const { log2 } = require("pilcom/src/utils");


const argv = require("yargs")
    .version(version)
    .usage("node main_genconst_all.js -o <all.const>")
    .alias("o", "output")
    .argv;

async function run() {

    const outputFile = typeof(argv.output) === "string" ?  argv.output.trim() : "all.const";

    const F = new F3g();
    const pil = await compile(F, path.join(__dirname, "all_main.pil"));

    const constPols = newConstantPolsArray(pil, F);

    let maxPilPolDeg = 0;
    for (const polRef in pil.references) {
        maxPilPolDeg = Math.max(maxPilPolDeg, pil.references[polRef].polDeg);
    }
    const N = 2**(log2(maxPilPolDeg - 1) + 1);
    await smGlobal.buildConstants(N,constPols.Global);
    await smPlookup.buildConstants(N, constPols.Plookup);
    await smFibonacci.buildConstants(N, constPols.Fibonacci);
    await smPermutation.buildConstants(N, constPols.Permutation);
    await smConnection.buildConstants(N, constPols.Connection, F);

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

