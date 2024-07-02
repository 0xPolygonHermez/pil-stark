const fs = require("fs");
const version = require("../package").version;

const { calculateIntermediatePolynomials } = require("./pil_info/imPolsCalculation/imPolynomials");

const argv = require("yargs")
    .version(version)
    .usage("node main_calculateimpols.js -f <infopil.json> -m <impols.json>")
    .alias("f", "infopil")
    .alias("m", "impols")
    .argv;

async function run() {
    const infoPilFile = typeof(argv.infopil) === "string" ?  argv.infopil.trim() : "mycircuit.infopil.json";
    const imPolsFile = typeof(argv.impols) === "string" ?  argv.impols.trim() : "mycircuit.impols.json";

    const infoPil = JSON.parse(await fs.promises.readFile(infoPilFile, "utf8"));

    const expressions = infoPil.expressions;
    const maxDeg  = infoPil.maxDeg;
    const cExpId = infoPil.cExpId;
    const qDim = infoPil.qDim;

    const imPols = calculateIntermediatePolynomials(expressions, cExpId, maxDeg, qDim);

    await fs.promises.writeFile(imPolsFile, JSON.stringify(imPols, null, 1), "utf8");

    console.log("files Generated Correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});

