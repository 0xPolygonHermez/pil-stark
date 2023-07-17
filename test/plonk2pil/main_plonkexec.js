const fs = require("fs");
const version = require("../../package").version;

const { compile, newCommitPolsArray } = require("pilcom");
const F3g = require("../../src/helpers/f3g.js");
const { log2 } = require("pilcom/src/utils.js");
const binFileUtils = require("@iden3/binfileutils");
const { readExecFile } = require("../../src/compressor/exec_helpers");


const argv = require("yargs")
    .version(version)
    .usage("node main_plonkexec.js -w <circuit.wtns> -e <circuit.exec> -m <circuit.commit>")
    .alias("w", "wtns")
    .alias("p", "pil")
    .alias("P", "pilconfig")
    .alias("e", "exec")
    .alias("m", "commit")
    .argv;

async function run() {
    const F = new F3g();

    const wtnsFile = typeof(argv.wtns) === "string" ?  argv.wtns.trim() : "witness.wtns";
    const pilFile = typeof(argv.pil) === "string" ?  argv.pil.trim() : "mycircuit.pil";
    const pilConfig = typeof(argv.pilconfig) === "string" ? JSON.parse(fs.readFileSync(argv.pilconfig.trim())) : {};
    const execFile = typeof(argv.exec) === "string" ?  argv.exec.trim() : "mycircuit.exec";
    const commitFile = typeof(argv.commit) === "string" ?  argv.commit.trim() : "mycircuit.exec";

    const pil = await compile(F, pilFile, null, pilConfig);

    const cmPols = newCommitPolsArray(pil, F);

    const nCommittedPols = cmPols.Final.a.length;

    const { nAdds, nSMap, adds, sMap } = await readExecFile(execFile, nCommittedPols);

    const Nbits = log2(nSMap -1) +1;
    const N = 1 << Nbits;

    const w = await readWtns(wtnsFile);

    for (let i=0; i<nAdds; i++) {
        w.push( F.add( F.mul( w[adds[i][0]], adds[i][2]), F.mul( w[adds[i][1]],  adds[i][3]  )));
    }

    for (let i=0; i<nSMap; i++) {
        for (let j=0; j<nCommittedPols; j++) {
            if (sMap[j][i] != 0) {
                cmPols.PlonkCircuit.a[j][i] = w[sMap[j][i]];
            } else {
                cmPols.PlonkCircuit.a[j][i] = 0n;
            }
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
