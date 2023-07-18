const path = require("path");
const version = require("../../../package").version;
const { newConstantPolsArray, compile } = require("pilcom");

const smSimple = require("./sm_simple.js");

const F3g = require("../../../src/helpers/f3g");
const { F1Field, getCurveFromName } = require("ffjavascript");


const argv = require("yargs")
    .version(version)
    .usage("node main_genconst_simple.js -o <simple.const>")
    .alias("o", "output")
    .argv;

async function run() {

    const outputFile = typeof(argv.output) === "string" ?  argv.output.trim() : "simple.const";

    if(argv.curve && !["gl", "bn128"].includes(argv.curve)) throw new Error("Curve not supported");
    
    const curveName = argv.curve || "gl";
    const F = curveName === "gl" ? new F3g() : new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);

    if(argv.simple && !["1","2","2p","3","4","4p"].includes(argv.simple.toString())) throw new Error("Simple " + argv.simple.toString() + " does not exist" );
    const simple = argv.simple.toString() || "2";
    const pil = await compile(F, path.join(__dirname, "simple" + simple + ".pil"));

    const constPols = newConstantPolsArray(pil, F);

    let maxPilPolDeg = 0;
    for (const polRef in pil.references) {
        maxPilPolDeg = Math.max(maxPilPolDeg, pil.references[polRef].polDeg);
    }
    const N = 2**(log2(maxPilPolDeg - 1) + 1);
    await smSimple.buildConstants(N, constPols.Simple);

    if(curveName === "gl"){
        await constPols.saveToFile(outputFile);
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

