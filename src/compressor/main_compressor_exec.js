const fs = require("fs");
const version = require("../../package").version;

const { compile } = require("pilcom");
const F3g = require("../helpers/f3g.js");
const { compressorExec, readExecFile } = require("./compressor_exec");
const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true });


const argv = require("yargs")
    .version(version)
    .usage("node main_compressor_exec.js -r <r1cs.circom> -p <pil.json> [-P <pilconfig.json] -v <verification_key.json>")
    .alias("i", "input")
    .alias("w", "wasm")
    .alias("p", "pil")
    .alias("P", "pilconfig")
    .alias("e", "exec")
    .alias("m", "commit")
    .argv;

async function run() {
    const F = new F3g();

    const inputFile = typeof(argv.input) === "string" ?  argv.input.trim() : "mycircuit.proof.zkin.json";
    const wasmFile = typeof(argv.wasm) === "string" ?  argv.wasm.trim() : "mycircuit.verifier.wasm";
    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.c12.pil";
    const pilConfig = typeof(argv.pilconfig) === "string" ? JSON.parse(fs.readFileSync(argv.pilconfig.trim())) : {};
    const execFile = typeof(argv.exec) === "string" ?  argv.exec.trim() : "mycircuit.c12.exec";
    const commitFile = typeof(argv.commit) === "string" ?  argv.commit.trim() : "mycircuit.c12.exec";

    const input = JSONbig.parse(await fs.promises.readFile(inputFile, "utf8"));

    const pil = await compile(F, pilFile, null, pilConfig);

    
    const exec = await readExecFile(execFile, pil.references["Compressor.a"].len);

    const fd =await fs.promises.open(wasmFile, "r");
    const st =await fd.stat();
    const wasm = new Uint8Array(st.size);
    await fd.read(wasm, 0, st.size);
    await fd.close();

    const cmPols = await compressorExec(F, pil, wasm, input, exec);

    await cmPols.saveToFile(commitFile);

    console.log("files Generated Correctly");

}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});