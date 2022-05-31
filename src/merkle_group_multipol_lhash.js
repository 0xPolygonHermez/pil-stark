
// This function is very useful for building fri.
// It a tree of a tree of a tree

// In each group we chack all the evaluations of all the polinomials for a
// given root of unity of the next FRI level
// Each group is itself of a tree of the roots of unity
// And for each root of unity there is another tree with the field elements
// of each polynomial in that specific root of unity.

/*
root ---| group_{0}
        | .
        | group_{i} --------| idx_{0}
        |                   | .
        |                   | idx_{j} --- | polEv_{0}
        |                   |             | .
        |                   |             | polEv_{k}
        |                   |             | .
        |                   |             | poñEv_{nPols-1}
        |                   | .
        |                   | idx_{groupSize-1}
        | .
        | group_{nGroups-1}

*/

const { assert } = require("chai");

class MerkleGroupMultipol {

    constructor(LH, M, nGroups, groupSize, nPols) {
        this.groupSize = groupSize;
        this.nGroups = nGroups;
        this.nPols = nPols;
        this.M = M;
        this.LH = LH;
    }

    merkelize(vals) {
        assert(vals.length == this.nPols, "Invalid Number of polynomials");
        for (let i=0; i<vals.length; i++) {
            assert(this.nGroups*this.groupSize == vals[i].length, "MerkleGroupMultipol: size of vals must be a multiple of group Size" );
        }

        const res = {
            mainTree: null,
            groupTrees: new Array(this.nGroups),
            polLHashes: new Array(this.nGroups)
        };

        const groupRoots = new Array(this.nGroups);
        for (let i=0; i<this.nGroups; i++) {
            console.log(`Merkeling group: ${i} of ${this.nGroups}`);
            res.groupTrees[i] = new Array(this.groupSize);
            res.polLHashes[i] = new Array(this.groupSize);
            const polRoots = new Array(this.groupSize);
            for (let j=0; j<this.groupSize; j++) {
                res.polLHashes[i][j] = new Array(this.groupSize);
                const elements = new Array(this.nPols);
                for (let k=0; k<this.nPols; k++) {
                    elements[k] = vals[k][j*this.nGroups + i];
                }
                res.polLHashes[i][j] = elements;
                polRoots[j] = this.LH.hash(res.polLHashes[i][j]);
            }
            res.groupTrees[i] = this.M.merkelize(polRoots);
            groupRoots[i] = this.M.root(res.groupTrees[i]);
        }

        res.mainTree = this.M.merkelize(groupRoots);

        return res;
    }

    // idx is the root of unity 
    getElementsProof(tree, idx) {   // --> [val, MP]

        const group = idx % this.nGroups;
        const groupIdx = Math.floor(idx / this.nGroups); 

        const v = tree.polLHashes[group][groupIdx];
        const mpL = this.M.genMerkleProof(tree.groupTrees[group], groupIdx);
        const mpH = this.M.genMerkleProof(tree.mainTree, group);

        return [v, [mpL, mpH]];
    }

    // idx is the root of unity 
    getElement(tree, polIdx, idx) {  

        const group = idx % this.nGroups;
        const groupIdx = Math.floor(idx / this.nGroups); 

        const v = tree.polLHashes[group][groupIdx][polIdx];

        return v;
    }
    
    getGroupProof(tree, idx) {   //  --> [[groupElement0, groupElement1, ......], MP]

        const v = new Array(this.groupSize);
        for (let j=0; j<this.groupSize; j++) {
            v[j] = tree.polLHashes[idx][j];
        }
        const mp = this.M.genMerkleProof(tree.mainTree, idx);

        return [v, mp];
    }

    calculateRootFromElementProof(mp, idx, val) {
        const group = idx % this.nGroups;
        const groupIdx = Math.floor(idx / this.nGroups); 

        const rootPol = this.LH.hash(val);
        const rootGroup = this.M.calculateRootFromProof(mp[0], groupIdx, rootPol);
        const rootMain = this.M.calculateRootFromProof(mp[1], group, rootGroup);
        return rootMain;
    }

    verifyElementProof(root, mp, idx, val) {
        const cRoot = this.calculateRootFromElementProof(mp, idx, val);
        return this.M.eqRoot(cRoot, root);
    }

    calculateRootFromGroupProof(mp, groupIdx, groupElements) {
        const polLHashes = new Array(this.groupSize);
        for (let j=0; j<this.groupSize; j++) {
            polLHashes[j] = this.LH.hash(groupElements[j]);
        }
        const groupTree = this.M.merkelize(polLHashes);
        const rootGroup = this.M.root(groupTree);
        const rootMain = this.M.calculateRootFromProof(mp, groupIdx, rootGroup);
        return rootMain;
    }

    verifyGroupProof(root, mp, idx, groupElements) {
        const cRoot = this.calculateRootFromGroupProof(mp, idx, groupElements);
        return this.M.eqRoot(cRoot, root);
    }

    root(tree) {
        return this.M.root(tree.mainTree);
    }

}

module.exports = MerkleGroupMultipol;