const path = require("path");
const version = require("../../../package").version;
const { newConstantPolsArray, compile } = require("pilcom");

const smFibonacci = require("./sm_fibonacci.js");

const F3g = require("../../../src/helpers/f3g");


const argv = require("yargs")
    .version(version)
    .usage("node main_genconst_fibonacci.js -o <fibonacci.const>")
    .alias("o", "output")
    .argv;

async function run() {

    const outputFile = typeof(argv.output) === "string" ?  argv.output.trim() : "fibonacci.const";

    const F = new F3g();
    const pil = await compile(F, path.join(__dirname, "fibonacci_main.pil"));

    const constPols = newConstantPolsArray(pil);

    await smFibonacci.buildConstants(constPols.Fibonacci);

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

