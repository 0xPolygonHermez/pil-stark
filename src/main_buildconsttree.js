const fs = require("fs");
const version = require("../package").version;
const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true });

const F3g = require("./helpers/f3g.js");
const { newConstantPolsArray, compile } = require("pilcom");
const { buildConstTree } = require("./stark/stark_buildConstTree");

const argv = require("yargs")
    .version(version)
    .usage("node main_buildconsttree.js -c const.bin -p <pil.json> [-P <pilconfig.json>] -s <starkinfo.json> -t <consttree.bin>  -v <verification_key.json>")
    .alias("c", "const")
    .alias("p", "pil")
    .alias("P", "pilconfig")
    .alias("s", "starkinfo")
    .alias("t", "consttree")
    .alias("v", "verkey")
    .argv;

async function run() {
    const F = new F3g();

    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const pilConfig = typeof(argv.pilconfig) === "string" ? JSON.parse(fs.readFileSync(argv.pilconfig.trim())) : {};
    const constFile = typeof(argv.const) === "string" ?  argv.const.trim() : "mycircuit.const";
    const starkInfoFile = typeof(argv.starkinfo) === "string" ?  argv.starkinfo.trim() : "mycircuit.stark_struct.json";
    const constTreeFile = typeof(argv.consttree) === "string" ?  argv.consttree.trim() : "mycircuit.consttree";
    const verKeyFile = typeof(argv.verkey) === "string" ?  argv.verkey.trim() : "mycircuit.verkey.json";

    const starkInfo = JSON.parse(await fs.promises.readFile(starkInfoFile, "utf8"));
    const pil = await compile(F, pilFile, null, pilConfig);

    const constPols = newConstantPolsArray(pil, F);
    await constPols.loadFromFile(constFile);

    const {MH, constTree, verKey} = await buildConstTree(starkInfo, pil, constPols);

    await fs.promises.writeFile(verKeyFile, JSONbig.stringify(verKey, null, 1), "utf8");

    await MH.writeToFile(constTree, constTreeFile);

    console.log("files Generated Correctly");
}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});