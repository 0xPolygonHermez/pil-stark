const fs = require("fs");
const version = require("../../package").version;

const { compile, newCommitPolsArray } = require("pilcom");
const { F1Field, getCurveFromName } = require("ffjavascript");
const { WitnessCalculatorBuilder } = require("circom_runtime");
const { readExecFile } = require("./exec_helpers");
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

    const nCommittedPols = cmPols.Final.a.length;
    
    const curve = await getCurveFromName("bn128");

    const Fr = curve.Fr;

    await curve.terminate();

    const { nAdds, nSMap, addsBigInt, addsFr, sMap } = await readExecFile(Fr, execFile, nCommittedPols);

    const wc = await WitnessCalculatorBuilder(wasm);
    const w = await wc.calculateWitness(input);

    for (let i=0; i<nAdds; i++) {
        w.push( F.add( F.mul( w[addsBigInt[i*2]], addsFr[i*2]), F.mul( w[addsBigInt[i*2+1]],  addsFr[i*2+1]  )));
    }

    for (let i=0; i<nSMap; i++) {
        for (let j=0; j<nCommittedPols; j++) {
            if (sMap[nCommittedPols*i+j] != 0n) {
                cmPols.Final.a[j][i] = w[sMap[nCommittedPols*i+j]];
            } else {
                cmPols.Final.a[j][i] = 0n;
            }
        }
    }

    await cmPols.saveToFileFr(commitFile, Fr);

    console.log("files Generated Correctly");

}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});

