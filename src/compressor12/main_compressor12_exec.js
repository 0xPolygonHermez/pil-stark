const fs = require("fs");
const version = require("../../package").version;

const { exportPolynomials, compile, createCommitedPols } = require("pilcom");
const F1Field = require("../f3g.js");
const { WitnessCalculatorBuilder } = require("circom_runtime");
const JSONbig = require('json-bigint')({ useNativeBigInt: true, alwaysParseAsBig: true });
const { log2 } = require("../utils.js")


const argv = require("yargs")
    .version(version)
    .usage("node main_compressor12_exec.js -r <r1cs.circom> -p <pil.json> -v <verification_key.json>")
    .alias("i", "input")
    .alias("w", "wasm")
    .alias("p", "pil")
    .alias("e", "exec")
    .alias("m", "commit")
    .argv;

async function run() {
    const F = new F1Field();

    const inputFile = typeof(argv.input) === "string" ?  argv.input.trim() : "mycircuit.proof.zkin.json";
    const wasmFile = typeof(argv.wasm) === "string" ?  argv.wasm.trim() : "mycircuit.verifier.wasm";
    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.c12.pil";
    const execFile = typeof(argv.exec) === "string" ?  argv.exec.trim() : "mycircuit.c12.exec";
    const commitFile = typeof(argv.commit) === "string" ?  argv.commit.trim() : "mycircuit.c12.exec";

    const input = JSONbig.parse(await fs.promises.readFile(inputFile, "utf8"));

    const { nAdds, nSMap, addsBuff, sMapBuff } = await readExecFile(execFile);

    const fd =await fs.promises.open(wasmFile, "r");
    const st =await fd.stat();
    const wasm = new Uint8Array(st.size);
    await fd.read(wasm, 0, st.size);
    await fd.close();

    const pil = await compile(F, pilFile);

    const [cmPols, cmPolsArray, cmPolsDef, cmPolsDefArray] = createCommitedPols(pil);

    const wc = await WitnessCalculatorBuilder(wasm);
    const w = await wc.calculateWitness(input);

    for (let i=0; i<nAdds; i++) {
        w.push( F.add( F.mul( w[addsBuff[i*4]], addsBuff[i*4 + 2]), F.mul( w[addsBuff[i*4+1]],  addsBuff[i*4+3]  )));
    }

    const Nbits = log2(nSMap -1) +1;
    const N = 1 << Nbits

    for (let i=0; i<nSMap; i++) {
        for (let j=0; j<12; j++) {
            if (sMapBuff[12*i+j] != 0) {
                cmPols.Compressor.a[j][i] = w[sMapBuff[12*i+j]];
            } else {
                cmPols.Compressor.a[j][i] = 0n;
            }
        }
    }

    for (let i=nSMap; i<N; i++) {
        for (let j=0; j<12; j++) {
            cmPols.Compressor.a[j][i] = 0n;
        }
    }

    await exportPolynomials(F, commitFile, cmPolsArray, cmPolsDefArray);

    console.log("files Generated Correctly");

}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});


async function readExecFile(execFile) {

    const fd =await fs.promises.open(execFile, "r");
    const buffH = new BigUint64Array(2);
    await fd.read(buffH, 0, 2*8);
    const nAdds= Number(buffH[0]);
    const nSMap= Number(buffH[1]);


    const addsBuff = new BigUint64Array(nAdds*4);
    await fd.read(addsBuff, 0, nAdds*4*8);

    const sMapBuff = new BigUint64Array(nSMap*12);
    await fd.read(sMapBuff, 0, nSMap*12*8);

    await fd.close();

    return { nAdds, nSMap, addsBuff, sMapBuff };

}
