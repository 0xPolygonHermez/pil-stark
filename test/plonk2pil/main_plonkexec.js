const fs = require("fs");
const version = require("../../package").version;

const { compile, newCommitPolsArray } = require("pilcom");
const F3g = require("../../src/helpers/f3g.js");
const binFileUtils = require("@iden3/binfileutils");
const { readExecFile } = require("../../src/compressor/exec_helpers");
const { readExecFile: readExecFileFr } = require("../../src/final/exec_helpers");
const { F1Field, getCurveFromName } = require("ffjavascript");


const argv = require("yargs")
    .version(version)
    .usage("node main_plonkexec.js -w <circuit.wtns> -e <circuit.exec> -m <circuit.commit>")
    .alias("w", "wtns")
    .alias("p", "pil")
    .alias("P", "pilconfig")
    .alias("e", "exec")
    .alias("m", "commit")
    .string("curve")
    .argv;

async function run() {

    const curveName = argv.curve || "gl";

    const F = curveName === "gl" ? new F3g() : new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);

    const wtnsFile = typeof(argv.wtns) === "string" ?  argv.wtns.trim() : "witness.wtns";
    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const pilConfig = typeof(argv.pilconfig) === "string" ? JSON.parse(fs.readFileSync(argv.pilconfig.trim())) : {};
    const execFile = typeof(argv.exec) === "string" ?  argv.exec.trim() : "mycircuit.exec";
    const commitFile = typeof(argv.commit) === "string" ?  argv.commit.trim() : "mycircuit.exec";

    const pil = await compile(F, pilFile, null, pilConfig);

    const cmPols = newCommitPolsArray(pil, F);

    const nCommittedPols = cmPols.PlonkCircuit.a.length;

    let Fr;
    if(curveName !== "gl"){
        const curve = await getCurveFromName("bn128");

    	Fr = curve.Fr;

    	await curve.terminate();
    }

    let res;
    if(curveName === "gl"){
        res = await readExecFile(execFile, nCommittedPols);
    } else {
        res = await readExecFileFr(Fr, execFile, nCommittedPols);
    }

    const { nAdds, nSMap, addsBigInt, addsFr, sMap } = res;

    const w = await readWtns(wtnsFile);

    for (let i=0; i<nAdds; i++) {
        w.push( F.add( F.mul( w[addsBigInt[i*2]], addsFr[i*2]), F.mul( w[addsBigInt[i*2+1]],  addsFr[i*2+1]  )));
    }

    for (let i=0; i<nSMap; i++) {
        for (let j=0; j<nCommittedPols; j++) {
            if (sMap[nCommittedPols*i+j] != 0) {
                cmPols.PlonkCircuit.a[j][i] = w[sMap[nCommittedPols*i+j]];
            } else {
                cmPols.PlonkCircuit.a[j][i] = 0n;
            }
        }
    }

    if(curveName === "gl") {
        await cmPols.saveToFile(commitFile);
    } else {
        await cmPols.saveToFileFr(commitFile, Fr);
    }

    console.log("files Generated Correctly");

}

run().then(()=> {
    process.exit(0);
}, (err) => {
    console.log(err.message);
    console.log(err.stack);
    process.exit(1);
});


async function readWtns(fileName) {

    const {fd, sections} = await binFileUtils.readBinFile(fileName, "wtns", 2);

    const {n8, nWitness} = await readHeader(fd, sections);

    await binFileUtils.startReadUniqueSection(fd, sections, 2);
    const res = [];
    for (let i=0; i<nWitness; i++) {
        const v = await binFileUtils.readBigInt(fd, n8);
        res.push(v);
    }
    await binFileUtils.endReadSection(fd);

    await fd.close();

    return res;


    async function readHeader(fd, sections) {

        await binFileUtils.startReadUniqueSection(fd, sections, 1);
        const n8 = await fd.readULE32();
        const q = await binFileUtils.readBigInt(fd, n8);
        const nWitness = await fd.readULE32();
        await binFileUtils.endReadSection(fd);

        return {n8, q, nWitness};

    }
}
