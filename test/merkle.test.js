const Merkle = require("../src/merkle.js");
const buildPoseidon = require("../src/poseidon.js");
const chai = require("chai");
const assert = chai.assert;

describe("merkle Goldilocks", async function () {
    let poseidon;
    let F;
    this.timeout(10000000);

    before(async () => { 
        poseidon = await buildPoseidon();
        F = poseidon.F;
    })

    it("It should merkelize and return the right number of elements", async () => {
        const M = new Merkle(poseidon);
        const arr = [];
        for (let i=0; i<13; i++) {
            arr.push([F.e(i), F.e(i+1), F.e(i+2), F.e(i+3) ] );
        }

        const tree = M.merkelize(arr);

        assert(M.nElements(tree) === 13);
    });
    it("It should test short merkle proofs", async () => {
        const M = new Merkle(poseidon);
        const N= 3;
        const idx = 2;
        const arr = [];
        for (let i=0; i<N; i++) {
            arr.push([F.e(i+1000), F.zero, F.zero, F.zero]);
        }

        const tree = M.merkelize(arr);

        assert(M.nElements(tree) === N);

        const mp = M.genMerkleProof(tree, idx);

        assert(M.verifyMerkleProof(M.root(tree), mp, idx, [F.e(idx+1000), F.zero, F.zero, F.zero] ));
    });
    it("It should test long merkle proofs", async () => {
        const M = new Merkle(poseidon);
        const N= 832;
        const idx = 774;
        const arr = [];
        for (let i=0; i<N; i++) {
            arr.push([F.e(i+1000), F.zero, F.zero, F.zero]);
        }

        const tree = M.merkelize(arr);

        assert(M.nElements(tree) === N);

        const mp = M.genMerkleProof(tree, idx);

        assert(M.verifyMerkleProof(M.root(tree), mp, idx, [F.e(idx+1000), F.zero, F.zero, F.zero] ));
    });
    it("It should test all combinatrions of MT", async () => {
        const M = new Merkle(poseidon);
        for (let N= 1; N<32; N++) {
            const arr = [];
            for (let i=0; i<N; i++) {
                arr.push([F.e(i+1000), F.e(i+2000), F.e(i+3000), F.e(i+4000)]);
            }
            const tree = M.merkelize(arr);
            for (let idx = 0; idx<N; idx++) {
                const mp = M.genMerkleProof(tree, idx);

                assert(M.verifyMerkleProof(M.root(tree), mp, idx, arr[idx]));            
            }
        }
    });
});
