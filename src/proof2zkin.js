
module.exports.proof2zkin = function proof2zkin(p) {
    const zkin = {};
    zkin.root1 = p.root1;
    zkin.root2 = p.root2;
    zkin.root3 = p.root3;
    zkin.root4 = p.root4;
    zkin.evals = p.evals;

    const friProof = p.fri;

    zkin.friRoots = [];
    for (let i=0; i<friProof.length-2; i++) {
        zkin.friRoots[i] = friProof[i].root2;
    }

/*
    zkin.s0_valsUp1 = [];
    zkin.s0_valsUp2 = [];
    zkin.s0_valsUp3 = [];
    zkin.s0_valsUpC = [];
    zkin.s0_valsUp1p = [];
    zkin.s0_valsUp2p = [];
    zkin.s0_valsUp3p = [];
    zkin.s0_valsUpCp = [];
    zkin.s0_siblingsUp1 = [];
    zkin.s0_siblingsUp2 = [];
    zkin.s0_siblingsUp3 = [];
    zkin.s0_siblingsUpC = [];
    zkin.s0_siblingsUp1p = [];
    zkin.s0_siblingsUp2p = [];
    zkin.s0_siblingsUp3p = [];
    zkin.s0_siblingsUpCp = [];
    zkin.s0_valsDown = [];
    zkin.s0_siblingsDownL = [];
    zkin.s0_siblingsDownH = [];

    let stepProof = friProof[0];
    zkin.s0_rootDown = stepProof.root2;
    for (let i=0; i<stepProof.polQueries.length; i++) {

        zkin.s0_valsUp1[i] = stepProof.polQueries[i][0][0];
        zkin.s0_valsUp2[i] = stepProof.polQueries[i][1][0];
        zkin.s0_valsUp3[i] = stepProof.polQueries[i][2][0];
        zkin.s0_valsUpC[i] = stepProof.polQueries[i][3][0];
        zkin.s0_valsUp1p[i] = stepProof.polQueries[i][4][0];
        zkin.s0_valsUp2p[i] = stepProof.polQueries[i][5][0];
        zkin.s0_valsUp3p[i] = stepProof.polQueries[i][6][0];
        zkin.s0_valsUpCp[i] = stepProof.polQueries[i][7][0];


        zkin.s0_siblingsUp1[i] = stepProof.polQueries[i][0][1];
        zkin.s0_siblingsUp2[i] = stepProof.polQueries[i][1][1];
        zkin.s0_siblingsUp3[i] = stepProof.polQueries[i][2][1];
        zkin.s0_siblingsUpC[i] = stepProof.polQueries[i][3][1];
        zkin.s0_siblingsUp1p[i] = stepProof.polQueries[i][4][1];
        zkin.s0_siblingsUp2p[i] = stepProof.polQueries[i][5][1];
        zkin.s0_siblingsUp3p[i] = stepProof.polQueries[i][6][1];
        zkin.s0_siblingsUpCp[i] = stepProof.polQueries[i][7][1];

        zkin.s0_valsDown[i] = stepProof.pol2Queries[i][0];
        zkin.s0_siblingsDownL[i] = stepProof.pol2Queries[i][1][0];
        zkin.s0_siblingsDownH[i] = stepProof.pol2Queries[i][1][1];
    }

    const nSteps = p.length - 4;

    for (s=1; s<p[3].length-1; s++) {
        let stepProof = friProof[s];
        zkin[`s${s}_valsUp`] = [];
        zkin[`s${s}_siblingsUp`] = [];
        zkin[`s${s}_valsDown`] = [];
        zkin[`s${s}_siblingsDownL`] = [];
        zkin[`s${s}_siblingsDownH`] = [];

        zkin[`s${s}_rootDown`] = stepProof.root2;

        for (let i=0; i<stepProof.polQueries.length; i++) {

            zkin[`s${s}_valsUp`][i] = stepProof.polQueries[i][0];
            zkin[`s${s}_siblingsUp`][i] = stepProof.polQueries[i][1];

            zkin[`s${s}_valsDown`][i] = stepProof.pol2Queries[i][0];
            zkin[`s${s}_siblingsDownL`][i] = stepProof.pol2Queries[i][1][0];
            zkin[`s${s}_siblingsDownH`][i] =  stepProof.pol2Queries[i][1][1];
        }
    }

*/
    zkin.finalPol = friProof[friProof.length-1];

    return zkin;
}

module.exports.zkin2proof = function zkin2proof(zkin) {
    const p = [];
    p[0] = zkin.s0_rootUp1;
    p[1] = zkin.s0_rootUp2;
    p[2] = zkin.s0_rootUp3;
    p[3] = [];

    const pStep = {};
    pStep.root2 = zkin.s0_rootDown;
    pStep.polQueries = [];
    pStep.pol2Queries = [];
    for (let i=0; i<zkin.s0_valsUp1.length; i++) {
        pStep.polQueries[i] = [
            [ zkin.s0_valsUp1[i], zkin.s0_siblingsUp1[i] ],
            [ zkin.s0_valsUp2[i], zkin.s0_siblingsUp2[i] ],
            [ zkin.s0_valsUp3[i], zkin.s0_siblingsUp3[i] ],
            [ zkin.s0_valsUpC[i], zkin.s0_siblingsUpC[i] ],
            [ zkin.s0_valsUp1p[i], zkin.s0_siblingsUp1p[i] ],
            [ zkin.s0_valsUp2p[i], zkin.s0_siblingsUp2p[i] ],
            [ zkin.s0_valsUp3p[i], zkin.s0_siblingsUp3p[i] ],
            [ zkin.s0_valsUpCp[i], zkin.s0_siblingsUpCp[i] ]
        ];
        pStep.pol2Queries[i] = [
            zkin.s0_valsDown[i],
            [zkin.s0_siblingsDownL[i], zkin.s0_siblingsDownH[i]]
        ];
    }
    p[3].push(pStep);

    for (let s=1; typeof (zkin[`s${s}_rootDown`]) != "undefined"; s++) {
        const pStep = {};
        pStep.root2 = zkin[`s${s}_rootDown`];
        pStep.polQueries = [];
        pStep.pol2Queries = [];
        for (let i=0; i<zkin[`s${s}_valsUp`].length; i++) {
            pStep.polQueries[i] = [ zkin[`s${s}_valsUp`][i], zkin[`s${s}_siblingsUp`][i] ];

            pStep.pol2Queries[i] = [
                zkin[`s${s}_valsDown`][i],
                [zkin[`s${s}_siblingsDownL`][i], zkin[`s${s}_siblingsDownH`][i]]
            ];
        }
        p[3].push(pStep);
    }

    p[3].push(zkin.lastVals);

    return p;
}
