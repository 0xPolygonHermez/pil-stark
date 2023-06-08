const ejs = require("ejs");
const path = require("path");
const fs = require("fs");
const { getOrderedEvals, lcm } = require("shplonkjs");
const {Keccak} = require("sha3");

module.exports = async function exportSolidityVerifier(vk, curve, fflonkInfo, options = {}) {
    const logger = options.logger;

    let constantCommits = [];

    for(let i = 0; i < vk.f.length; ++i) {
        if(vk.f[i].stages.length === 1 && vk.f[i].stages[0].stage === 0) {
            constantCommits.push({index: vk.f[i].index, commit: curve.G1.toObject(vk.f[i].commit)});
        }
    }

    // Sort f by index
    vk.f.sort((a, b) => a.index - b.index);

    if (logger) logger.info("PILFFLONK EXPORT SOLIDITY VERIFIER STARTED");

    let orderedEvals = getOrderedEvals(vk.f);

    orderedEvals = orderedEvals. filter(e => e.name !== "Q");

    orderedEvals.push({name: "inv"});

    orderedEvals = orderedEvals.map(e => e.name.replace(".", "_"));

    const powerW = lcm(Object.keys(vk).filter(k => k.match(/^w\d+$/)).map(wi => wi.slice(1)));

    vk.powerW = powerW;

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
    
    let nBytesCommits = (vk.f.filter(fi => fi.stages.length !== 1 || fi.stages[0].stage !== 0).length + 2) * 2 + orderedEvals.length;
    const signatureStr = `verifyCommitments(bytes32[${nBytesCommits}],bytes32,bytes32[1])`;
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

    return ejs.render(template, obj); 
}

