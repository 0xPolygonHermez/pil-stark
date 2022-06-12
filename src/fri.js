const { assert } = require("chai");
const MerkleHash = require("./merkle_hash.js");
const {polMulAxi, evalPol} = require("./polutils");
const {log2} = require("./utils");

class FRI {

    constructor(poseidon, starkStruct) {
        this.F = poseidon.F;
        this.inNBits = starkStruct.nBitsExt;
        this.maxDegNBits = starkStruct.nBits;
        this.nQueries = starkStruct.nQueries;
        if (starkStruct) {
            this.steps = starkStruct.steps;
        } else {
            throw new Error("stark struct not defined");
        }
    }

    prove(transcript, pol, queryPol) {
        const proof = [];
        const F = this.F;

        let polBits = log2(pol.length);
        assert(1<<polBits == pol.length, "Invalid poluynomial size");    // Check the input polynomial is a power of 2
        assert(polBits == this.inNBits, "Invalid polynomial size");

        let shiftInv = F.shiftInv;
        let shift = F.shift;
        let tree = [];

        for (let si = 0; si<this.steps.length; si++) proof[si] = {};
        for (let si = 0; si<this.steps.length; si++) {
            const reductionBits = polBits - this.steps[si].nBits;

            const pol2N = 1 << (polBits - reductionBits);
            const nX = pol.length / pol2N;

            const pol2_e = new Array(pol2N);

            let special_x = transcript.getField();

            let sinv = shiftInv;
            const wi = F.inv(F.w[polBits]);
            for (let g = 0; g<pol.length/nX; g++) {
                const ppar = new Array(nX);
                for (let i=0; i<nX; i++) {
                    ppar[i] = pol[(i*pol2N)+g];
                }
                const ppar_c = F.ifft(ppar);
                polMulAxi(F, ppar_c, F.one, sinv);    // Multiplies coefs by 1, shiftInv, shiftInv^2, shiftInv^3, ......

                pol2_e[g] = evalPol(F, ppar_c, special_x);
                sinv = F.mul(sinv, wi);
            }


            if (si < this.steps.length-1) {
                const nGroups = 1<< this.steps[si+1].nBits;

                let groupSize = (1 << this.steps[si].nBits) / nGroups;

                tree[si] = MerkleHash.merkelize(pol2_e, 3, groupSize, nGroups);

                proof[si+1].root= MerkleHash.root(tree[si]);
                transcript.put(MerkleHash.root(tree[si]));
            } else {
                for (let i=0; i<pol2_e.length; i++) {
                    transcript.put(pol2_e[i]);
                }
            }

            pol = pol2_e;
            polBits = polBits-reductionBits;

            for (let j=0; j<reductionBits; j++) {
                shiftInv = F.mul(shiftInv, shiftInv);
                shift = F.mul(shift, shift);
            }
        }
        proof.push(pol);



        const ys = transcript.getPermutations(this.nQueries, this.steps[0].nBits);

        for (let si = 0; si<this.steps.length; si++) {

            proof[si].polQueries = [];
            for (let i=0; i<ys.length; i++) {
                const gIdx =
                proof[si].polQueries.push(queryPol(ys[i]));
            }


            if (si < this.steps.length -1) {
                queryPol = (idx) => {
                    return MerkleHash.getGroupProof(tree[si], idx);
                }

                for (let i=0; i<ys.length; i++) {
                    ys[i] = ys[i] % (1 << this.steps[si+1].nBits);
                }
            }
        }

        return proof;
    }

    verify(transcript, proof, checkQuery) {

        const F = this.F;
        const GMT = [];

        assert(proof.length == this.steps.length+1, "Invalid proof size");


        let special_x = [];

        for (let si=0; si<this.steps.length; si++) {
            special_x[si] = transcript.getField();

            if (si < this.steps.length-1) {
                const nGroups = 1<< this.steps[si+1].nBits;

                let groupSize = (1 << this.steps[si].nBits) / nGroups;
                transcript.put(proof[si+1].root);
            } else {
                for (let i=0; i<proof[proof.length-1].length; i++) {
                    transcript.put(proof[proof.length-1][i]);
                }
            }
        }


        const nQueries = this.nQueries;
        const ys = transcript.getPermutations(this.nQueries, this.steps[0].nBits);

        let polBits = this.inNBits;
        let shift = F.shift;
        for (let si=0; si<this.steps.length; si++) {

            const proofItem=proof[si];

            const reductionBits = polBits - this.steps[si].nBits;

            for (let i=0; i<nQueries; i++) {
                const pgroup_e = checkQuery(proofItem.polQueries[i], ys[i]);
                if (!pgroup_e) return false;

                const pgroup_c = F.ifft(pgroup_e);
                const sinv = F.inv(F.mul( shift, F.exp(  F.w[polBits], ys[i])));
//                polMulAxi(F, pgroup_c, F.one, sinv);    // Multiplies coefs by 1, shiftInv, shiftInv^2, shiftInv^3, ......
//                const ev = evalPol(F, pgroup_c, special_x[si]);
                const ev = evalPol(F, pgroup_c, F.mul(special_x[si], sinv));

                if (si < this.steps.length - 1) {
                    const nextNGroups = 1 << this.steps[si+1].nBits
                    const groupIdx  =Math.floor(ys[i] / nextNGroups);
                    if (!F.eq(proof[si+1].polQueries[i][0][groupIdx], ev)) return false;
                } else {
                    if (!F.eq(proof[si+1][ys[i]], ev)) return false;
                }
            }

            checkQuery = (query, idx) => {
                const res = MerkleHash.verifyGroupProof(proof[si+1].root, query[1], idx, query[0]);
                if (!res) return false;
                return query[0];
            }

            polBits = this.steps[si].nBits;
            for (let j=0; j<reductionBits; j++) shift = F.mul(shift, shift);

            if (si < this.steps.length -1) {
                for (let i=0; i<ys.length; i++) {
                    ys[i] = ys[i] % (1 << this.steps[si+1].nBits);
                }
            }

        }

        const lastPol_e = proof[proof.length-1];

        let maxDeg;
        if (( polBits - (this.inNBits - this.maxDegNBits)) <0) {
            maxDeg =0;
        } else {
            maxDeg = 1 <<  ( polBits - (this.inNBits - this.maxDegNBits));
        }

        const lastPol_c = F.ifft(lastPol_e);
        // We don't need to divide by shift as we just need to check for zeros

        for (let i=maxDeg+1; i< lastPol_c.length; i++) {
            if (!F.isZero(lastPol_c[i])) return false;
        }

        return true;

    }
}

module.exports = FRI;


