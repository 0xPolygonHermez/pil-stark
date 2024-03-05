
class Transcript {
    constructor(poseidon, nInputs) {
        this.poseidon = poseidon;
        this.nInputs = nInputs;
        this.F = poseidon.F;
        this.state = this.F.zero;
        this.pending = [];
        this.out = [];
        this.out3 = [];
    }

    getField() {
        return [
            this.getFields1(),
            this.getFields1(),
            this.getFields1()
        ];
    }

    getFields1() {
        if (this.out3.length > 0) {
            return this.out3.shift();
        }
        if (this.out.length > 0) {
            const v = this.F.toObject(this.out.shift());
            this.out3[0] = v & 0xFFFFFFFFFFFFFFFFn;
            this.out3[1] = (v >> 64n) & 0xFFFFFFFFFFFFFFFFn;
            this.out3[2] = (v >> 128n) & 0xFFFFFFFFFFFFFFFFn;
            return this.getFields1();
        }
        this.updateState();
        return this.getFields1();
    }

    getFields253() {
        if (this.out.length > 0) {
            return this.out.shift();
        }
        this.updateState();
        return this.getFields253();
    }

    updateState() {
        while (this.pending.length<this.nInputs) {
            this.pending.push(this.F.zero);
        }
        this.out = this.poseidon(this.pending, this.state, this.nInputs + 1);
        this.out3 = [];
        this.pending = [];
        this.state = this.out[0];
    }

    put(a) {
        if (Array.isArray(a)) {
            for (let i=0; i<a.length; i++) {
                this._add1(a[i]);
            }
        } else {
            this._add1(a);
        }
    }

    _add1(a) {
        this.out = [];
        this.pending.push(this.F.e(a));
        if (this.pending.length == this.nInputs) {
            this.updateState();
        }
    }

    getPermutations(n, nBits) {
        const res = [];
        const F = this.F;
        const totalBits = n*nBits;
        const NFields = Math.floor((totalBits - 1)/253)+1;
        const fields = [];
        for (let i=0; i<NFields; i++) {
            fields[i] = this.F.toObject(this.getFields253());
        }
        let curField =0;
        let curBit =0n;
        for (let i=0; i<n; i++) {
            let a = 0;
            for (let j=0; j<nBits; j++) {
                const bit = (fields[curField] >> curBit) & 1n;
                if (bit) a = a + (1<<j);
                curBit ++;
                if (curBit == 253) {
                    curBit = 0n;
                    curField ++;
                }
            }
            res.push(a);
        }
        return res;
    }

}

module.exports = Transcript;
