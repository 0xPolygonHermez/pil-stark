const fs = require("fs");
const version = require("../../package").version;

const { compile, newCommitPolsArray } = require("pilcom");
const F3g = require("../../src/helpers/f3g.js");
const { log2 } = require("pilcom/src/utils.js");
const binFileUtils = require("@iden3/binfileutils");


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


    const { nAdds, nSMap, addsBuff, sMapBuff } = await readExecFile(execFile);

    const pil = await compile(F, pilFile, null, pilConfig);

    const cmPols = newCommitPolsArray(pil);

    const Nbits = log2(nSMap -1) +1;
    const N = 1 << Nbits;

    const w = await readWtns(wtnsFile);

    for (let i=0; i<nAdds; i++) {
        w.push( F.add( F.mul( w[addsBuff[i*4]], addsBuff[i*4 + 2]), F.mul( w[addsBuff[i*4+1]],  addsBuff[i*4+3]  )));
    }

    for (let i=0; i<nSMap; i++) {
        for (let j=0; j<3; j++) {
            if (sMapBuff[3*i+j] != 0) {
                cmPols.PlonkCircuit.a[j][i] = w[sMapBuff[3*i+j]];
            } else {
                cmPols.PlonkCircuit.a[j][i] = 0n;
            }
        }
    }

    for (let i=nSMap; i<N; i++) {
        for (let j=0; j<3; j++) {
            cmPols.PlonkCircuit.a[j][i] = 0n;
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


async function readExecFile(execFile) {

    const fd =await fs.promises.open(execFile, "r");
    const buffH = new BigUint64Array(2);
    await fd.read(buffH, 0, 2*8);
    const nAdds= Number(buffH[0]);
    const nSMap= Number(buffH[1]);


    const addsBuff = new BigUint64Array(nAdds*4);
    await fd.read(addsBuff, 0, nAdds*4*8);

    const sMapBuff = new BigUint64Array(nSMap*3);
    await fd.read(sMapBuff, 0, nSMap*3*8);

    await fd.close();

    return { nAdds, nSMap, addsBuff, sMapBuff };

}


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
