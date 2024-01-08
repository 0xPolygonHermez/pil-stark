const { assert } = require("chai");
const LinearHash = require("../linearhash/linearhash");
const LinearHashGPU = require("../linearhash/linearhash_gpu.js");

buildPoseidon = require("../poseidon/poseidon");

module.exports = class {

    constructor(poseidon, splitLinearHash = false) {
        this.poseidon = poseidon;
        this.F = poseidon.F;
        this.splitLinearHash = splitLinearHash;
        this.lh = splitLinearHash ? new LinearHashGPU(poseidon) : new LinearHash(poseidon);
    }

    async merkelize(vals, elementSize, elementsInLinear, nLinears, interleaved) {
        const poseidon = this.poseidon;
        const lh = this.lh;

        const buff = new BigUint64Array(3 + elementsInLinear*nLinears*elementSize + 4*(nLinears*2-1));
        let p=0;
        buff[p++] = BigInt(elementSize);
        buff[p++] = BigInt(elementsInLinear);
        buff[p++] = BigInt(nLinears);
        if (vals.length == elementsInLinear) {
            for (let j=0; j<elementsInLinear; j++) {
                if (vals[j].length != nLinears) throw new Error("Invalid Element size");
            }

            for (let i=0; i<nLinears; i++) {
                for (let j=0; j<elementsInLinear; j++) {
                    if (Array.isArray(vals[j][i])) {
                        if (vals[j][i].length != elementSize) throw new Error("Invalid Element size");
                        for (let k=0; k<elementSize; k++) {
                            buff[p++] = BigInt(vals[j][i][k]);
                        }
                    } else {
                        if (elementSize != 1) throw new Error("Invalid Element size");
                        buff[p++] = BigInt(vals[j][i]);
                    }
                }
            }
        } else if (vals.length == nLinears*elementsInLinear) {
            for (let i=0; i<nLinears; i++) {
                for (let j=0; j<elementsInLinear; j++) {
                    const s = interleaved ? i*elementsInLinear + j : j*nLinears + i;

                    if (Array.isArray(vals[s])) {
                        if (vals[s].length != elementSize) throw new Error("Invalid Element size");
                        for (let k=0; k<elementSize; k++) {
                            buff[p++] = BigInt(vals[s][k]);
                        }
                    } else {
                        if (elementSize != 1) throw new Error("Invalid Element size");
                        buff[p++] = BigInt(vals[s]);
                    }
                }
            }
        } else {
            throw new Error("Invalid vals format");
        }

        let o=3;
        let nextO = p;

        for (let i=0; i<nLinears; i++) {
            if (i%10000 == 0) console.log(`Hashing... ${i+1}/${nLinears}`);
            const a = buff.slice(o, o+elementsInLinear*elementSize);
            const h = lh.hash(a);
            for (let k=0; k<4; k++) buff[p++] = h[k];
            o += elementsInLinear*elementSize;
        }


        o=nextO;

        let n = nLinears;
        let nextN = Math.floor((n-1)/2)+1;
        while (n>1) {
            nextO = p;
            for (let i=0; i<nextN; i++) {
                const ih = [...buff.slice(o+i*8, o+Math.min(i+1, n)*8)];
                while (ih.length<8) ih.push(0n);
                const h = this.poseidon(ih);
                for (let k=0; k<4; k++) buff[p++] = h[k];
            }
            n = nextN;
            nextN = Math.floor((n-1)/2)+1;
            o = nextO;
        }

        assert(buff.length == p);

        return buff;
    }

    // idx is the root of unity
    getElement(tree, idx, subIdx) {
        const elementSize = Number(tree[0]);
        const elementsInLinear = Number(tree[1]);
        const nLinears = Number(tree[2]);

        if ((idx<0)||(idx>=nLinears)) throw new Error("Out of range");
        if (elementSize == 1) {
            return tree[3 + idx*elementsInLinear + subIdx];
        } else {
            const res = [];
            for (let k=0; k<elementSize; k++) {
                res.push(tree[3 + (idx*elementsInLinear + subIdx)*elementSize + k]);
            }
            return res;
        }
    }


    getGroupProof(tree, idx) {
        const elementSize = Number(tree[0]);
        const elementsInLinear = Number(tree[1]);
        const nLinears = Number(tree[2]);

        if ((idx<0)||(idx>=nLinears)) throw new Error("Out of range");

        const v = new Array(elementsInLinear);
        for (let i=0; i<elementsInLinear; i++) {
            v[i] = this.getElement(tree, idx, i);
        }

        const mp = merkle_genMerkleProof(tree, idx, 3 + elementsInLinear*nLinears*elementSize, nLinears);

        return [v, mp];

        function merkle_genMerkleProof(tree, idx, offset, n) {
            if (n<=1) return [];
            const nextIdx = idx >> 1;

            const si =  (idx^1)*4;
            let a;
            if (si>=n*4) {
                a = [0n, 0n, 0n, 0n];
            } else {
                a = [...tree.slice( offset + si ,  offset + si +4 )];
            }

            return [a, ...merkle_genMerkleProof(tree, nextIdx, offset+n*4, Math.floor((n-1)/2)+1 )];
        }
    }

    calculateRootFromGroupProof(mp, idx, vals) {

        const poseidon = this.poseidon;
        const lh = this.lh;

        const a = [];
        for (let i=0; i<vals.length; i++) {
            if (Array.isArray(a[i])) {
                for (j=0; j<vals[i].length; j++) {
                    a.push(vals[i][j]);
                }
            } else {
                a.push(vals[i]);
            }
        }

        const h = lh.hash(a);

        return merkle_calculateRootFromProof(mp, idx, h)

        function merkle_calculateRootFromProof(mp, idx, value, offset) {
            offset = offset || 0;
            if (mp.length == offset) {
                return value;
            }

            const curIdx = idx & 1;
            const nextIdx = Math.floor(idx / 2);

            let nextValue;
            if (curIdx == 0) {
                nextValue = poseidon([...value, ...mp[offset]])
            } else {
                nextValue = poseidon([ ...mp[offset], ...value])
            }

            return merkle_calculateRootFromProof(mp, nextIdx, nextValue, offset+1);
        }

    }

    eqRoot(r1, r2) {
        const poseidon = this.poseidon;
        for (let k=0; k<4; k++) {
            if (!poseidon.F.eq(r1[k], r2[k])) return false;
        }
        return true;
    }

    verifyGroupProof(root, mp, idx, groupElements) {
        const cRoot = this.calculateRootFromGroupProof(mp, idx, groupElements);
        return this.eqRoot(cRoot, root);
    }

    root(tree) {
        return [...tree.slice(-4)];
    }
}


