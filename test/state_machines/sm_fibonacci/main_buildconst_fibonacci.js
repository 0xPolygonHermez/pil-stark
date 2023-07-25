const path = require("path");
const version = require("../../../package").version;
const { newConstantPolsArray, compile } = require("pilcom");

const smFibonacci = require("./sm_fibonacci.js");

const F3g = require("../../../src/helpers/f3g");
const { F1Field, getCurveFromName } = require("ffjavascript");
const { log2 } = require("pilcom/src/utils");

const argv = require("yargs")
    .version(version)
    .usage("node main_genconst_fibonacci.js -o <fibonacci.const>")
    .alias("o", "output")
    .string("curve")
    .argv;

async function run() {

    const outputFile = typeof(argv.output) === "string" ?  argv.output.trim() : "fibonacci.const";

    if(argv.curve && !["gl", "bn128"].includes(argv.curve)) throw new Error("Curve not supported");
    
    const curveName = argv.curve || "gl";
    const F = curveName === "gl" ? new F3g() : new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);
    
    const pil = await compile(F, path.join(__dirname, "fibonacci_main.pil"));

    const constPols = newConstantPolsArray(pil, F);
    
    let maxPilPolDeg = 0;
    for (const polRef in pil.references) {
        maxPilPolDeg = Math.max(maxPilPolDeg, pil.references[polRef].polDeg);
    }
    const N = 2**(log2(maxPilPolDeg - 1) + 1);

    await smFibonacci.buildConstants(N, constPols.Fibonacci);

    if(curveName === "gl"){
        await constPols.saveToFile(outputFile);
    } else {
        const curve = await getCurveFromName("bn128");

    	const Fr = curve.Fr;

    	await curve.terminate();

        await constPols.saveToFileFr(outputFile, Fr);
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

