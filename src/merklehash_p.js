const { assert } = require("chai");
const LinearHash = require("./linearhash");
const workerpool = require("workerpool");
const fs = require("fs");

const {linearHash, merkelizeLevel} = require("./merklehash_worker");

buildPoseidon = require("./poseidon");

module.exports = async function buildMerkleHash() {
    const poseidon = await buildPoseidon();
    const MH = new MerkleHash(poseidon);
    return MH;
}

class MerkleHash {

    constructor(poseidon) {
        this.poseidon = poseidon;
        this.F = poseidon.F;
        this.lh = new LinearHash(poseidon);
        this.useThreads = true;
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
        const self = this;
        const tree = {
            elements: new BigUint64Array(buff.buffer, posIn, width*height),
            nodes: new BigUint64Array(this._getNNodes(height*4)),
            width: width,
            height: height
        };

        const pool = workerpool.pool(__dirname + '/merklehash_worker.js');


        const maxNPerThread = 1 << 18;
        const minNPerThread = 1 << 12;

        const promisesLH = [];
        let res = [];
        let nPerThreadF = Math.floor((height-1)/pool.maxWorkers)+1;
        const maxCorrected = Math.floor(maxNPerThread / (width/8));
        const minCorrected = Math.floor(minNPerThread / (width/8));

        if (nPerThreadF>maxCorrected) nPerThreadF = maxCorrected;
        if (nPerThreadF<minCorrected) nPerThreadF = minCorrected;
        for (let i=0; i< height; i+=nPerThreadF) {
            const curN = Math.min(nPerThreadF, height-i);
            console.log("slicing buff "+i);
            const bb = tree.elements.slice(i*width, (i+curN)*width);
//            const bb = new BigUint64Array(tree.elements.buffer, tree.elements.byteOffset + i*width*8, curN*width);
            if (self.useThreads) {
                console.log("creating thread "+i);
                promisesLH.push(pool.exec("linearHash", [bb, width, i, curN]));
            } else {
                res.push(await linearHash(bb, width, i, curN));
            }
        }
        if (self.useThreads) {
            console.log("waiting..");
            res = await Promise.all(promisesLH)
        }
        for (let i=0; i<res.length; i++) {
            tree.nodes.set(res[i], i*nPerThreadF*4);
        }

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
            let res = [];
            const promises = [];
            let nOpsPerThread = Math.floor((nOps-1)/pool.maxWorkers)+1;
            const maxNPerThread = 1<<18;
            const minNPerThread = 1<<12;
            if (nOpsPerThread>maxNPerThread) nOpsPerThread = maxNPerThread;
            if (nOpsPerThread<minNPerThread) nOpsPerThread = minNPerThread;
            for (let i=0; i< nOps; i+=nOpsPerThread) {
                const curNOps = Math.min(nOpsPerThread, nOps-i);
                const bb = new BigUint64Array(tree.nodes.buffer, pIn + i*8*8, curNOps*8);
                if (self.useThreads) {
                    promises.push(pool.exec("merkelizeLevel", [bb, i, nOps]));
                } else {
                    res.push(await merkelizeLevel(bb, i, nOps));
                }
            }
            if (self.useThreads) {
                res = await Promise.all(promises);
            }
            for (let i=0; i<res.length; i++) {
                tree.nodes.set(res[i], pOut/8 + i*nOpsPerThread*4 );
            }
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

    async writeToFile(tree, fileName) {
        const fd =await fs.promises.open(fileName, "w+");
        const header = new BigUint64Array(2);
        header[0]= BigInt(tree.width);
        header[1]= BigInt(tree.height);
        await fd.write(header);
        await writeBigBuffer(fd, tree.elements);
        await writeBigBuffer(fd, tree.nodes);
        await fd.close();

        async function writeBigBuffer(fd, buff8) {
            const MaxBuffSize = 1024*1024*32;  //  256Mb
            for (let i=0; i<buff8.byteLength; i+= MaxBuffSize) {
                console.log(`writting tree.. ${i/MaxBuffSize} / ${Math.floor((buff8.byteLength-1)/MaxBuffSize )+1}`);
                const n = Math.min(buff8.byteLength -i, MaxBuffSize);
                const sb = new Uint8Array(buff8.buffer, buff8.byteOffset+i, n);
                await fd.write(sb);
            }
        }
    }

    async readFromFile(fileName) {
        const fd =await fs.promises.open(fileName, "r");
        const header = new BigUint64Array(2);
        await fd.read(header, {offset:0, length: 16, position:0});
        const tree = {
            width: Number(header[0]),
            height: Number(header[1])
        }
        tree.elements = new BigUint64Array(tree.width*tree.height);
        tree.nodes = new BigUint64Array(this._getNNodes(tree.height*4));
        await readBigBuffer(fd, tree.elements, 16);
        await readBigBuffer(fd, tree.nodes, 16+ tree.elements.byteLength);
        await fd.close();

        async function  readBigBuffer(fd, buff, pos) {
            const MaxBuffSize = 1024*1024*32;  //  256Mb
            for (let i=0; i<buff.byteLength; i+= MaxBuffSize) {
                const n = Math.min(buff.byteLength -i, MaxBuffSize);
                const buff8 = new Uint8Array(buff.buffer, i, n);
                await fd.read(buff8, {offset: 0, length:n, position:pos + i});
            }
        }

        return tree;
    }
}


