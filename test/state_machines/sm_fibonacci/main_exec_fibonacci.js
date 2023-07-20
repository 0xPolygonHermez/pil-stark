const fs = require("fs");
const path = require("path");
const version = require("../../../package").version;

const smFibonacci = require("./sm_fibonacci.js");

const F3g = require("../../../src/helpers/f3g");
const { F1Field, getCurveFromName } = require("ffjavascript");

const { newCommitPolsArray, compile } = require("pilcom");
const { log2 } = require("pilcom/src/utils");


const argv = require("yargs")
    .version(version)
    .usage("node main_exec_fibonacci.js -o <fibonacci.commit.bin> -i <input.json>")
    .alias("o", "output")
    .alias("i", "input")
    .string("curve")
    .argv;

async function run() {

    const outputFile = typeof(argv.output) === "string" ?  argv.output.trim() : "fibonacci.commit";
    const inputFile = typeof(argv.input) === "string" ?  argv.input.trim() : "input.json";

    if(argv.curve && !["gl", "bn128"].includes(argv.curve)) throw new Error("Curve not supported");
    
    const curveName = argv.curve || "gl";
    const F = curveName === "gl" ? new F3g() : new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);
    
    const pil = await compile(F, path.join(__dirname, "fibonacci_main.pil"));

    const input = JSON.parse(await fs.promises.readFile(inputFile, "utf8"));
    const cmPols =  newCommitPolsArray(pil, F);

    let maxPilPolDeg = 0;
    for (const polRef in pil.references) {
        maxPilPolDeg = Math.max(maxPilPolDeg, pil.references[polRef].polDeg);
    }
    const N = 2**(log2(maxPilPolDeg - 1) + 1);

    const result = await smFibonacci.execute(N, cmPols.Fibonacci, input, F);
    console.log("Result: " + result);

    if(curveName === "gl"){
        await cmPols.saveToFile(outputFile);
    } else {
       const curve = await getCurveFromName("bn128");

    	const Fr = curve.Fr;

    	await curve.terminate();

        await cmPols.saveToFileFr(outputFile, Fr);
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

