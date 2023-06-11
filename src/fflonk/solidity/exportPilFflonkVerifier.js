const ejs = require("ejs");
const path = require("path");
const fs = require("fs");
const { getOrderedEvals, lcm, exportSolidityShPlonkVerifier } = require("shplonkjs");
const {getCurveFromName} = require("ffjavascript");
const {Keccak} = require("sha3");
const { readPilFflonkZkeyFile } = require("../zkey/zkey_pilfflonk");

module.exports = async function exportPilFflonkVerifier(zkeyFilename, fflonkInfo, options = {}) {
    const logger = options.logger;

    // Load zkey file
    const zkey = await readPilFflonkZkeyFile(zkeyFilename, {logger});

    const curve = await getCurveFromName("bn128");

    let constantCommits = [];

    for(let i = 0; i < zkey.f.length; ++i) {
        if(zkey.f[i].stages.length === 1 && zkey.f[i].stages[0].stage === 0) {
            zkey.f[i].commit = zkey[`f${zkey.f[i].index}_0`];
            constantCommits.push({index: zkey.f[i].index, commit: curve.G1.toObject(zkey.f[i].commit)});
        }
    }

    // Sort f by index
    zkey.f.sort((a, b) => a.index - b.index);

    if (logger) logger.info("PILFFLONK EXPORT SOLIDITY VERIFIER STARTED");

    let orderedEvals = getOrderedEvals(zkey.f);

    orderedEvals = orderedEvals. filter(e => e.name !== "Q");

    orderedEvals.push({name: "inv"});

    orderedEvals.push({name: "invZh"});


    orderedEvals = orderedEvals.map(e => e.name.replace(".", "_"));

    const powerW = lcm(Object.keys(zkey).filter(k => k.match(/^w\d+$/)).map(wi => wi.slice(1)));

    zkey.powerW = powerW;

    const evNames = {};
    for(let i = 0; i < fflonkInfo.evIdx.cm.length; ++i) {
        for(const polId in fflonkInfo.evIdx.cm[i]) {
            let polName = i === 0 ? zkey.polsMap.cm[polId] : i === 1 ? zkey.polsMap.cm[polId] + "w" : zkey.polsMap.cm[polId] + `w${i}`;
            const evalIndex = fflonkInfo.evIdx.cm[i][polId];
            evNames[evalIndex] = polName.replace(".", "_");
        }
    }

    for(let i = 0; i < fflonkInfo.evIdx.const.length; ++i) {
        for(const polId in fflonkInfo.evIdx.const[i]) {
            let polName = i === 0 ? zkey.polsMap.const[polId] : i === 1 ? zkey.polsMap.const[polId] + "w" : zkey.polsMap.const[polId] + `w${i}`;
            const evalIndex = fflonkInfo.evIdx.const[i][polId];
            evNames[evalIndex] = polName.replace(".", "_");
        }
    }
    
    let nBytesCommits = (zkey.f.filter(fi => fi.stages.length !== 1 || fi.stages[0].stage !== 0).length + 2) * 2 + (orderedEvals.length - 1);
    const signatureStr = `verifyCommitments(bytes32[${nBytesCommits}],bytes32,bytes32[1])`;
    const signatureBytes = `0x${new Keccak(256).update(signatureStr).digest("hex").substring(0,8)}`;

    const obj = {
        vk: zkey,
        constantCommits,
        orderedEvals, 
        fflonkInfo,
        evNames,
        signatureStr,
        signatureBytes,
    };
    if (logger) logger.info("PILFFLONK EXPORT SOLIDITY VERIFIER FINISHED");

    const template = await fs.promises.readFile(path.resolve(__dirname, "verifier_pilfflonk.sol.ejs"), "utf-8");

    const verifierPilFflonkCode = ejs.render(template, obj);
    const verifierShPlonkCode = await exportSolidityShPlonkVerifier(zkey, curve, {nonCommittedPols: ["Q"], xiSeed: true, checkInputs: false });

    return {verifierPilFflonkCode, verifierShPlonkCode}; 
}
