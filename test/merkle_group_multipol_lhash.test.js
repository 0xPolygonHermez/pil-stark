const Merkle = require("../src/merkle.js");
const LinearHash = require("../src/linearhash.js");
const MerkleGroupMultiPolLHash = require("../src/merkle_group_multipol_lhash.js")
const buildPoseidon = require("../src/poseidon");
const chai = require("chai");
const assert = chai.assert;

describe("merkle group multipol lhash", async function () {
    let poseidon;
    let F;
    this.timeout(10000000);

    before(async () => { 
        poseidon = await buildPoseidon();
        F = poseidon.F;
    })

    it("It should merkelize and return the right number of elements", async () => {
        const poseidon = await buildPoseidon();
        const F = poseidon.F;
        const LH = new LinearHash(poseidon);
        const M = new Merkle(poseidon);
        const N = 256;
        const nGroups = 16;
        const idx = 3;
        const groupSize = N/nGroups;
        const nPols = 2;
        const MGP = new MerkleGroupMultiPolLHash(LH, M, nGroups, groupSize, 2);

        const pols = [];
        for (let i=0; i<nPols; i++) pols[i] = [];
        for (let i=0; i<N; i++) {
            for (let j=0; j<nPols; j++) {
                pols[j].push(F.e(i + j*1000));
            }
        }

        const tree = MGP.merkelize(pols);

        const [groupElements, mp] = MGP.getGroupProof(tree, idx);
        const root = MGP.root(tree);

        assert(MGP.verifyGroupProof(root, mp, idx, groupElements));

        const ep = MGP.getElementsProof(tree, idx);

        assert(MGP.verifyElementProof(root, ep[1], idx, ep[0]));
    });
});