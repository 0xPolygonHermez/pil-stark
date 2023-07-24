const {utils } = require("ffjavascript");
const { unstringifyBigInts } = utils;

module.exports.fromObjectVk = function fromObjectVk(curve, vk) {

    vk = unstringifyBigInts(vk);

    const res = vk;
    res.w = curve.Fr.fromObject(vk.w);
    const ws = Object.keys(vk).filter(k => k.match(/^w\d/));    
    for(let i = 0; i < ws.length; ++i) {
        res[ws[i]] = curve.Fr.fromObject(vk[ws[i]]);
    }
    res.X_2 = curve.G2.fromObject(vk.X_2);
    const fs = Object.keys(vk).filter(k => k.match(/^f\d/));  
    for(let i = 0; i < fs.length; ++i) {
        res[fs[i]] = curve.G1.fromObject(vk[fs[i]]);
    }
    return res;
}

module.exports.fromObjectProof = function fromObjectProof(curve, proof) {
    proof = unstringifyBigInts(proof);

    Object.keys(proof.polynomials).forEach(key => {
        proof.polynomials[key] = curve.G1.fromObject(proof.polynomials[key]);
    });

    Object.keys(proof.evaluations).forEach(key => {
        proof.evaluations[key] = curve.Fr.fromObject(proof.evaluations[key]);
    });

    return proof;
}