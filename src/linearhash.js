
module.exports = class LinearHash {

    constructor(poseidon) {
        this.H = poseidon;
    }

    _hash(flatVals) {
        let inHash = [];
        let st = [0n, 0n, 0n, 0n];
        if (flatVals.length<=4) {
            for (let i=0; i<flatVals.length;i++) {
                st[i] = flatVals[i];
            }
            return st;
        }
        for (let i=0; i<flatVals.length;i++) {
            inHash.push(flatVals[i]);
            if (inHash.length == 8) {
                st = this.H(inHash, st);
                inHash.length = 0;
            }
        }
        if (inHash.length>0) {
            while (inHash.length<8) inHash.push(0n);
            st = this.H(inHash, st);
        }
        return st;
    }

    hash(vals, batchSize) {
        const flatVals = [];
        for (let i=0; i<vals.length; i++) {
            if (Array.isArray(vals[i])) {
                for (let j=0; j<vals[i].length; j++) {
                    flatVals.push(vals[i][j]);
                }
            } else {
                flatVals.push(vals[i]);
            }
        }
        if (typeof batchSize === "undefined") {
            batchSize = Math.floor(Math.max(8,(flatVals.length+3)/4));
        }

        if (flatVals.length <= 4) {
            const st = [0n, 0n, 0n, 0n];
            for (let i=0; i<flatVals.length;i++)  {
                st[i] = flatVals[i];
            }
            return st;
        }
        const hashes = [];
        for (let b=0; b<flatVals.length; b+= batchSize) {
            const size = Math.min(batchSize, flatVals.length-b);
            const a = flatVals.slice(b, b+size);
            hashes.push(...this._hash(a));
        }
        if (hashes.length <= 4) {
            const st = [0n, 0n, 0n, 0n];
            for (let i=0; i<hashes.length;i++)  {
                st[i] = hashes[i];
            }
            return st;
        } else {
            return this._hash(hashes);
        }
    }
}