
module.exports = class LinearHash {

    constructor(poseidon) {
        this.H = poseidon;
    }

    hash(vals) {
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
       

        let st = [0n, 0n, 0n, 0n];
        if (flatVals.length <= 4) {
            const st = [0n, 0n, 0n, 0n];
            for (let i=0; i<flatVals.length;i++)  {
                st[i] = flatVals[i];
            }
            return st;
        }
        let inHash = [];
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
}