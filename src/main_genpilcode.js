const fs = require("fs");
const version = require("../package").version;

const { generatePilCode } = require("./pil_info/generatePilCode");
const { addIntermediatePolynomials } = require("./pil_info/imPolsCalculation/imPolynomials");
const map = require("./pil_info/map");
const { compile } = require("pilcom");
const F3g = require("./helpers/f3g");

const argv = require("yargs")
    .version(version)
    .usage("node main_genpilcode.js -f <infopil.json> -p <pil.json> -m <impols.json> -i <starkinfo.json>")
    .alias("p", "pil")
    .alias("f", "infopil")
    .alias("m", "impols")
    .alias("i", "starkinfo")
    .argv;

async function run() {
    const F = new F3g();

    const infoPilFile = typeof(argv.infopil) === "string" ?  argv.infopil.trim() : "mycircuit.infopil.json";
    const imPolsFile = typeof(argv.impols) === "string" ?  argv.impols.trim() : "mycircuit.impols.json";

    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const pil = await compile(F, pilFile);

    const starkInfoFile = typeof(argv.starkinfo) === "string" ?  argv.starkinfo.trim() : "mycircuit.starkinfo.json";

    const infoPil = JSON.parse(await fs.promises.readFile(infoPilFile, "utf8"));
    const imPols = JSON.parse(await fs.promises.readFile(imPolsFile, "utf8"));

    const res = infoPil.res;
    const expressions = imPols.newExpressions;
    const qDeg = imPols.qDeg;
    const imExps = imPols.imExps;
    
    addIntermediatePolynomials(res, expressions, imExps, qDeg);
    
    generatePilCode(res, pil, expressions);

    map(res, expressions);       

    console.log("--------------------- POLINOMIALS INFO ---------------------")
    console.log(`Columns stage 1: ${res.nCm1} -> Columns in the basefield: ${res.mapSectionsN.cm1_2ns}`);
    console.log(`Columns stage 2: ${res.nCm2} -> Columns in the basefield: ${res.mapSectionsN.cm2_2ns}`);
    console.log(`Columns stage 3: ${res.nCm3} (${res.nImPols} intermediate polinomials) -> Columns in the basefield: ${res.mapSectionsN.cm3_2ns}`);
    console.log(`Columns stage 4: ${res.nCm4} -> Columns in the basefield: ${res.mapSectionsN.cm4_2ns}`);
    console.log(`Total Columns: ${res.nCm1 + res.nCm2 + res.nCm3 + res.nCm4} -> Total Columns in the basefield: ${res.mapSectionsN.cm1_2ns + res.mapSectionsN.cm2_2ns + res.mapSectionsN.cm3_2ns + res.mapSectionsN.cm4_2ns}`);
    console.log(`Total Constraints: ${res.nConstraints}`)
    console.log(`Number of evaluations: ${res.evMap.length}`)
    console.log("------------------------------------------------------------")

    await fs.promises.writeFile(starkInfoFile, JSON.stringify(res, null, 1), "utf8");

    console.log("files Generated Correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});

