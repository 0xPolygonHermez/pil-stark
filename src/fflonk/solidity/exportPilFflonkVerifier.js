const ejs = require("ejs");
const path = require("path");
const fs = require("fs");
const { getOrderedEvals, exportSolidityShPlonkVerifier } = require("shplonkjs");
const {getCurveFromName} = require("ffjavascript");
const {Keccak} = require("sha3");
const { fromObjectVk } = require("../helpers/helpers");


module.exports = async function exportPilFflonkVerifier(vk, fflonkInfo, options = {}) {
    const logger = options.logger;

    const curve = await getCurveFromName(vk.curve);

    vk = fromObjectVk(curve, vk);
    
    let constantCommits = [];

    for(let i = 0; i < vk.f.length; ++i) {
        if(vk.f[i].stages.length === 1 && vk.f[i].stages[0].stage === 0) {
            vk.f[i].commit = vk[`f${vk.f[i].index}`];
            constantCommits.push({index: vk.f[i].index, commit: curve.G1.toObject(vk.f[i].commit)});
        }
    }

    // Sort f by index
    vk.f.sort((a, b) => a.index - b.index);

    if (logger) logger.info("PILFFLONK EXPORT SOLIDITY VERIFIER STARTED");

    let orderedEvals = getOrderedEvals(vk.f);

    const nonCommittedPols = [];
    if(vk.maxQDegree === 0) {
        orderedEvals = orderedEvals. filter(e => e.name !== "Q");
        nonCommittedPols.push("Q");
    }

    orderedEvals.push({name: "inv"});

    orderedEvals.push({name: "invZh"});


    orderedEvals = orderedEvals.map(e => e.name.replace(".", "_"));

    const evNames = {};
    for(let i = 0; i < fflonkInfo.evIdx.cm.length; ++i) {
        for(const polId in fflonkInfo.evIdx.cm[i]) {
            let polName = i === 0 ? vk.polsMap.cm[polId] : i === 1 ? vk.polsMap.cm[polId] + "w" : vk.polsMap.cm[polId] + `w${i}`;
            const evalIndex = fflonkInfo.evIdx.cm[i][polId];
            evNames[evalIndex] = polName.replace(".", "_");
        }
    }

    for(let i = 0; i < fflonkInfo.evIdx.const.length; ++i) {
        for(const polId in fflonkInfo.evIdx.const[i]) {
            let polName = i === 0 ? vk.polsMap.const[polId] : i === 1 ? vk.polsMap.const[polId] + "w" : vk.polsMap.const[polId] + `w${i}`;
            const evalIndex = fflonkInfo.evIdx.const[i][polId];
            evNames[evalIndex] = polName.replace(".", "_");
        }
    }
    
    let nBytesCommits = (vk.f.filter(fi => fi.stages.length !== 1 || fi.stages[0].stage !== 0).length + 2) * 2 + (orderedEvals.length - 1);

    const signatureStr = vk.maxQDegree == 0 ? `verifyCommitments(bytes32[${nBytesCommits}],bytes32,bytes32[1])` : `verifyCommitments(bytes32[${nBytesCommits}],bytes32)`;
    const signatureBytes = `0x${new Keccak(256).update(signatureStr).digest("hex").substring(0,8)}`;

    const obj = {
        vk,
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
    const verifierShPlonkCode = await exportSolidityShPlonkVerifier(vk, curve, {...options, nonCommittedPols, xiSeed: true, checkInputs: false });

    return {verifierPilFflonkCode, verifierShPlonkCode}; 
}
