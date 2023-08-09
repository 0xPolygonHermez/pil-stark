const proofGen  = require("../prover/prover.js")

const parallelExec = true;
const useThreads = true;

module.exports = async function starkGen(cmPols, constPols, constTree, pilInfo, options = {}) {
    options.parallelExec = parallelExec;
    options.useThreads = useThreads;

    return proofGen(cmPols, pilInfo, constTree, constPols, null, options);
}
