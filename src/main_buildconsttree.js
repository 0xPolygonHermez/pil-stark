const fs = require("fs");
const version = require("../package").version;
const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true });

const F3g = require("./helpers/f3g.js");
const { newConstantPolsArray, compile } = require("pilcom");
const { buildConstTree } = require("./stark/stark_buildConstTree");

const argv = require("yargs")
    .version(version)
    .usage("node main_buildconsttree.js -c const.bin -p <pil.json> [-P <pilconfig.json>] -s <starkstruct.json> -t <consttree.bin>  -v <verification_key.json>")
    .alias("c", "const")
    .alias("p", "pil")
    .alias("P", "pilconfig")
    .alias("s", "starkstruct")
    .alias("t", "consttree")
    .alias("v", "verkey")
    .string("arity")
    .argv;

async function run() {
    const F = new F3g();

    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const pilConfig = typeof(argv.pilconfig) === "string" ? JSON.parse(fs.readFileSync(argv.pilconfig.trim())) : {};
    const constFile = typeof(argv.const) === "string" ?  argv.const.trim() : "mycircuit.const";
    const starkStructFile = typeof(argv.starkstruct) === "string" ?  argv.starkstruct.trim() : "mycircuit.stark_struct.json";
    const constTreeFile = typeof(argv.consttree) === "string" ?  argv.consttree.trim() : "mycircuit.consttree";
    const verKeyFile = typeof(argv.verkey) === "string" ?  argv.verkey.trim() : "mycircuit.verkey.json";

    const starkStruct = JSON.parse(await fs.promises.readFile(starkStructFile, "utf8"));
    const pil = await compile(F, pilFile, null, pilConfig);

    const constPols = newConstantPolsArray(pil, F);
    await constPols.loadFromFile(constFile);

    let arity = Number(argv.arity) || 16;
    const {MH, constTree, verKey} = await buildConstTree(starkStruct, pil, constPols, arity);

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