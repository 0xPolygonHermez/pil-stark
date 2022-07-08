const { assert } = require("chai");
const LinearHash = require("./linearhash");
const workerpool = require("workerpool");

const {linearHash, merkelizeLevel} = require("./merklehash_worker");

buildPoseidon = require("./poseidon");

module.exports = class {

    constructor(poseidon) {
        this.poseidon = poseidon;
        this.F = poseidon.F;
        this.lh = new LinearHash(poseidon);
    }

    _getNNodes(n) {
        let nextN = (Math.floor((n-1)/8)+1)*4;
        let acc = nextN*2;
        while (n>4) {
            // FIll with zeros if n nodes in the leve is not even
            n = nextN;
            nextN = (Math.floor((n-1)/8)+1)*4;
            if (n>4) {
                acc += nextN*2;
            } else {
                acc +=4;
            }
        }
        return acc;
    }

    async merkelize(buff, posIn, width, height) {
        const nodesBuffer = new SharedArrayBuffer(this._getNNodes(height*4)*8)
        const tree = {
            elements: new BigUint64Array(buff.buffer, posIn, width*height),
            nodes: new BigUint64Array(nodesBuffer),
            width: width,
            height: height
        };

        const pool = workerpool.pool(__dirname + '/merklehash_worker.js');
//const pool = {maxWorkers: 15};

        const promisesLH = [];
        const nPerThreadF = Math.floor((height-1)/pool.maxWorkers)+1;
        for (let i=0; i< height; i+=nPerThreadF) {
            const curN = Math.min(nPerThreadF, height-i);
            if (height*width < 1<<16) {
                await linearHash(buff, posIn + i*width*8, width, curN, tree.nodes, i*4*8);
            } else {
                promisesLH.push(pool.exec("linearHash", [buff, posIn + i*width*8, width, curN, tree.nodes, i*4*8]));
            }
        }

        await Promise.all(promisesLH);


        const buff8 = new Uint8Array(tree.nodes.buffer);
        let pIn = 0;
        let n64 = height*4;
        let nextN64 = (Math.floor((n64-1)/8)+1)*4;
        let pOut = pIn + nextN64*2*8;
        while (n64>4) {
            // FIll with zeros if n nodes in the leve is not even
            await _merkelizeLevel(tree.nodes, pIn, nextN64/4, pOut);

            n64 = nextN64;
            nextN64 = (Math.floor((n64-1)/8)+1)*4;
            pIn = pOut;
            pOut = pIn + nextN64*2*8;
        }

        pool.terminate();

        return tree;

        async function _merkelizeLevel(buff, pIn, nOps, pOut) {
            const promises = [];
            const nOpsPerThread = Math.floor((nOps-1)/pool.maxWorkers)+1;
            for (let i=0; i< nOps; i+=nOpsPerThread) {
                const curNOps = Math.min(nOpsPerThread, nOps-i);
                if (nOps < 2<<15) {
                    await merkelizeLevel(buff, pIn + i*8*8, curNOps, pOut + i*4*8);
                } else {
                    promisesLH.push(pool.exec("merkelizeLevel", [buff, pIn + i*8*8, curNOps, pOut + i*4*8]));
                }
            }

            await Promise.all(promisesLH);
        }
    }

    // idx is the root of unity
    getElement(tree, idx, subIdx) {

        return tree.elements[tree.width*idx + subIdx];
    }


    getGroupProof(tree, idx) {
        if ((idx<0)||(idx>=tree.height)) throw new Error("Out of range");

        const v = new Array(tree.width);
        for (let i=0; i<tree.width; i++) {
            v[i] = this.getElement(tree, idx, i);
        }

        const mp = merkle_genMerkleProof(tree, idx, 0, tree.height*4);

        return [v, mp];

        function merkle_genMerkleProof(tree, idx, offset, n) {
            const buff64 = new BigUint64Array(tree.nodes);
            if (n<=4) return [];
            const nextIdx = idx >> 1;

            const si =  (idx^1)*4;
            const a = [];
            for (let i=0; i<4; i++) a[i] = buff64[offset + si + i];

            const nextN = (Math.floor((n-1)/8)+1)*4;


            return [a, ...merkle_genMerkleProof(tree, nextIdx, offset+nextN*2, nextN )];
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
        return [...tree.nodes.slice(-4)];
    }
}


