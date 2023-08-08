const proofGen = require("../../prover/prover.js")

const parallelExec = true;
const useThreads = false;

module.exports = async function fflonkProve(zkey, cmPols, pilInfo, options = {}) {
    options.parallelExec = parallelExec;
    options.useThreads = useThreads;

    return proofGen(cmPols, pilInfo, null, null, zkey, options);
}