


module.exports = class LinearHash {

    constructor(poseidon) {
        this.H = poseidon;
    }

    hash(vals) {
        if (vals.length == 0) return [];
        let st = [0n, 0n, 0n, 0n];
        let inHash = [];
        for (let i=0; i<vals.length;i++) {
            if (Array.isArray(vals[i])) {
                for (let k=0; k<vals[i].length; k++) {
                    inHash.push(vals[i][k]);
                    if (inHash.length == 8) {
                        st = this.H(inHash, st);
                        inHash.length = 0;
                    }
                }
            } else {
                inHash.push(vals[i]);
                if (inHash.length == 8) {
                    st = this.H(inHash, st);
                    inHash.length = 0;
                }
            }
        }
        if (inHash.length>0) {
            while (inHash.length<8) inHash.push(0n);
            st = this.H(inHash, st);
        }
        return st;
    }
}