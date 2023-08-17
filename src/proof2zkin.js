
module.exports.proof2zkin = function proof2zkin(p, starkInfo) {
    const zkin = {};
    zkin.root1 = p.root1;
    for(let i = 0; i < starkInfo.nLibStages; ++i) {
        const stage = i + 2;
        zkin[`root${stage}`] = p[`root${stage}`];
    }
    zkin.rootQ = p.rootQ;
    zkin.evals = p.evals;

    const friProof = p.fri;

    for (let i=1; i<friProof.length-1; i++) {
        zkin[`s${i}_root`] = friProof[i].root;
        zkin[`s${i}_vals`] = [];
        zkin[`s${i}_siblings`] = [];
        for (let q=0; q<friProof[0].polQueries.length; q++) {
            zkin[`s${i}_vals`][q] =friProof[i].polQueries[q][0];
            zkin[`s${i}_siblings`][q] =friProof[i].polQueries[q][1];
        }
    }

    zkin.s0_valsC = [];
    zkin.s0_vals1 = [];

    for(let i = 0; i < starkInfo.nLibStages; ++i) {
        const stage = i + 2;
        zkin[`s0_vals${stage}`] = [];
    }
    zkin.s0_valsQ = [];

    zkin.s0_siblingsC = [];
    zkin.s0_siblings1 = [];
    for(let i = 0; i < starkInfo.nLibStages; ++i) {
        const stage = i + 2;
        zkin[`s0_siblings${stage}`] = [];
    }
    zkin.s0_siblingsQ = [];

    for (let i=0; i<friProof[0].polQueries.length; i++) {

        zkin.s0_valsC[i] = friProof[0].polQueries[i][0][0];
        zkin.s0_siblingsC[i] = friProof[0].polQueries[i][0][1];

        zkin.s0_vals1[i] = friProof[0].polQueries[i][1][0];
        zkin.s0_siblings1[i] = friProof[0].polQueries[i][1][1];

        for(let j = 0; j < starkInfo.nLibStages; ++j) {
            const stage = j + 2;
            zkin[`s0_vals${stage}`][i] = friProof[0].polQueries[i][stage][0];
            zkin[`s0_siblings${stage}`][i] = friProof[0].polQueries[i][stage][1];
        }

        zkin.s0_valsQ[i] = friProof[0].polQueries[i][starkInfo.nLibStages + 2][0];
        zkin.s0_siblingsQ[i] = friProof[0].polQueries[i][starkInfo.nLibStages + 2][1];

    }

    zkin.finalPol = friProof[friProof.length-1];

    return zkin;
}