const { getOrderedEvals } = require("shplonkjs");
const {getCurveFromName, utils} = require("ffjavascript");
const { fromObjectVk, fromObjectProof } = require("../helpers/helpers");

const {unstringifyBigInts} = utils;

function i2hex(i) {
    return ("0" + i.toString(16)).slice(-2);
}

module.exports = async function exportFflonkCalldata(vk, proof, publicSignals, options = {}) {

    const logger = options.logger; 

    const curve = await getCurveFromName(vk.curve);

    vk = fromObjectVk(curve, vk);

    proof = fromObjectProof(curve, proof);

    publicSignals = unstringifyBigInts(publicSignals);

    const nonCommittedPols = [];
    if(vk.maxQDegree === 0) {
        nonCommittedPols.push("Q");    
    }

    // Sort f by index
    vk.f.sort((a, b) => a.index - b.index);

    const G1 = curve.G1;
    const Fr = curve.Fr;

    // Store the polynomial commits to its corresponding fi
    for(let i = 0; i < vk.f.length; ++i) {
        if(!proof.polynomials[`f${vk.f[i].index}`]) throw new Error(`f${vk.f[i].index} commit is missing`);
        vk.f[i].commit = proof.polynomials[`f${vk.f[i].index}`];
    }

    // Check which of the fi are committed into the proof and which ones are part of the setup. 
    // A committed polynomial fi will be considered part of the setup if all its polynomials composing it are from the stage 0
    const fCommitted = vk.f.filter(fi => fi.stages[0].stage !== 0).sort((a, b) => a.index >= b.index ? 1 : -1);

    // Order the evaluations. It is important to keep this order to then be consistant with the solidity verifier
    const  orderedEvals = getOrderedEvals(vk.f, proof.evaluations);

    const orderedEvalsCommitted = orderedEvals.filter(e => !nonCommittedPols.includes(e.name));

    const nG1 = fCommitted.length + 2;
    const nFr = Object.keys(orderedEvalsCommitted).length + 2;

    // Define the non Committed evals buffer
    const nonCommittedEvalsBuff = new Uint8Array(Fr.n8 * nonCommittedPols.length);

    // Define the proof buffer
    const proofBuff = new Uint8Array(G1.F.n8 * 2 * nG1 + Fr.n8 * nFr);

    // Add W and W' as the first two elements of the proof
    G1.toRprUncompressed(proofBuff, 0, G1.e(proof.polynomials.W));
    G1.toRprUncompressed(proofBuff, G1.F.n8 * 2, G1.e(proof.polynomials.Wp));

    // Add all the fi commits that goes into the proof buffer sorted by index
    for(let i = 0; i < fCommitted.length; ++i) {
        G1.toRprUncompressed(proofBuff, G1.F.n8 * 2 * (i + 2), G1.e(fCommitted[i].commit));
    }

    // Add committed evaluations into the proof buffer
    for(let i = 0; i < orderedEvalsCommitted.length; ++i) {
        Fr.toRprBE(proofBuff, G1.F.n8 * 2 * nG1 + Fr.n8 * i, orderedEvalsCommitted[i].evaluation);
    }

    // Add the montgomery batched inverse evaluation at the end of the buffer
    Fr.toRprBE(proofBuff, G1.F.n8 * 2 * nG1 + Fr.n8 * (nFr - 2), proof.evaluations.inv);

    // Add the montgomery batched inverse evaluation of zH at the end of the buffer
    Fr.toRprBE(proofBuff, G1.F.n8 * 2 * nG1 + Fr.n8 * (nFr - 1), proof.evaluations.invZh);

    // Add non committed evaluations into the proof buffer
    for(let i = 0; i < nonCommittedPols.length; ++i) {
        Fr.toRprBE(nonCommittedEvalsBuff, Fr.n8 * i, orderedEvals.find(e => e.name === nonCommittedPols[i]).evaluation);
    }
    
    const proofStringHex = Array.from(proofBuff).map(i2hex).join("");
    const proofHex = [];
    const proofSize = nG1*2 + nFr;
    for(let i = 0; i < proofSize; ++i) {
        proofHex.push(`0x${proofStringHex.slice(i*64, (i+1)*64).padStart(64, '0')}`);
    }
     
    const inputString = JSON.stringify(proofHex);
    
    let publicInputs = [];
    for (let i = 0; i < publicSignals.length; i++) {
       publicInputs.push(`0x${publicSignals[i].toString(16).padStart(64, '0')}`);
    }

    let publicInputsString = JSON.stringify(publicInputs);

    let calldata = `${inputString}`;
    if(publicSignals.length > 0) calldata += `,${publicInputsString}`;
    return calldata;
}
