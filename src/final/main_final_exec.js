const fs = require("fs");
const version = require("../../package").version;

const { compile, newCommitPolsArray } = require("pilcom");
const { F1Field } = require("ffjavascript");
const { WitnessCalculatorBuilder } = require("circom_runtime");
const BigArray = require("@iden3/bigarray");
const { readExecFile } = require("./final_exec_helpers");
const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true });

const argv = require("yargs")
    .version(version)
    .usage("node main_final_exec.js -r <r1cs.circom> -p <pil.json> [-P <pilconfig.json] -v <verification_key.json>")
    .alias("i", "input")
    .alias("w", "wasm")
    .alias("p", "pil")
    .alias("P", "pilconfig")
    .alias("e", "exec")
    .alias("m", "commit")
    .argv;

async function run() {
    const F = new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);
    const inputFile = typeof(argv.input) === "string" ?  argv.input.trim() : "final.proof.zkin.json";
    const wasmFile = typeof(argv.wasm) === "string" ?  argv.wasm.trim() : "final.wasm";
    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "final.pil";
    const pilConfig = typeof(argv.pilconfig) === "string" ? JSON.parse(fs.readFileSync(argv.pilconfig.trim())) : {};
    const execFile = typeof(argv.exec) === "string" ?  argv.exec.trim() : "final.exec";
    const commitFile = typeof(argv.commit) === "string" ?  argv.commit.trim() : "final.commit";

    const input = JSONbig.parse(await fs.promises.readFile(inputFile, "utf8"));

    const fd =await fs.promises.open(wasmFile, "r");
    const st =await fd.stat();
    const wasm = new Uint8Array(st.size);
    await fd.read(wasm, 0, st.size);
    await fd.close();

    const pil = await compile(F, pilFile, null, pilConfig);

    const cmPols = newCommitPolsArray(pil, F);

    const N = cmPols.Final.a[0].length;

    const L = cmPols.Final.a.length;
    
    const { nAdds, nSMap, adds, sMap } = await readExecFile(F, execFile, L);

    const wc = await WitnessCalculatorBuilder(wasm);
    const w = await wc.calculateWitness(input);

    for (let i=0; i<nAdds; i++) {
        w.push( F.add( F.mul(w[adds[i][0]], adds[i][2]), F.mul( w[adds[i][1]], adds[i][3] )));
    }

    for (let i=0; i<nSMap; i++) {
        for (let j=0; j<L; j++) {
            if (sMap[j][i] != 0) {
                cmPols.Final.a[j][i] = w[sMap[j][i]];
            } else {
                cmPols.Final.a[j][i] = 0n;
            }
        }
    }

    for (let i=nSMap; i<N; i++) {
        for (let j=0; j<L; j++) {
            cmPols.Final.a[j][i] = 0n;
        }
    }

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

