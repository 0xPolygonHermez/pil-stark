class Transcript {
    constructor() {
        this.state = ["0", "0", "0", "0"];
        this.pending = [];
        this.out = [];
        this.stCnt =0;
        this.hCnt =0;
        this.n2bCnt =0;

        this.code = [];
    }


    getField(v) {
        this.code.push(`${v}[0] <== this.getFields1();`);
        this.code.push(`${v}[1] <== this.getFields1();`);
        this.code.push(`${v}[2] <== this.getFields1();`);
    }

    getFields1() {
        if (this.out.length == 0) {
            while (this.pending.length<8) {
                this.pending.push("0");
            }
            this.code.push(`component tcHahs_${this.hCnt++} = Poseidon();`);
            for (let i=0; i<8; i++) {
                this.code.push(`tcHahs_${this.hCnt-1}.in[${i}] <== ${this.pending[i]}`);
            }
            for (let i=0; i<4; i++) {
                this.code.push(`tcHahs_${this.hCnt-1}.capacity[${i}] <== ${this.state[i]}`);
                this.state[i] = `tcHahs_${this.hCnt-1}.out[${i}]`;
            }
            this.pending = [];
            this.out = this.state.slice();
        }
        const res = this.out.shift();
        return res;
    }

    put(a, l) {
        if (typeof l !== "undefined") {
            for (let i=0; i<l; i++) {
                this._add1(`${a}[${i}]`);
            }
        } else {
            this._add1(a);
        }
    }

    _add1(a) {
        this.out = [];
        this.pending.push(a);
        if (this.pending.length == 8) {
            this.code.push(`component tcHahs_${this.hCnt++} = Poseidon();`);
            for (let i=0; i<8; i++) {
                this.code.push(`tcHahs_${this.hCnt-1}.in[${i}] <== ${this.pending[i]}`);
            }
            for (let i=0; i<4; i++) {
                this.code.push(`tcHahs_${this.hCnt-1}.capacity[${i}] <== ${this.state[i]}`);
                this.state[i] = `tcHahs_${this.hCnt-1}.out[${i}]`;
            }
            this.pending = [];
            this.out = this.state.slice();
        }
    }

    getPermutations(v, n, nBits) {
        const totalBits = n*nBits;
        const NFields = Math.floor((totalBits - 1)/63)+1;
        const n2b = [];
        for (let i=0; i<NFields; i++) {
            const f = this.getFields1();
            n2b[i] = `tcN2b_${this.n2bCnt++}`;
            this.code.push(`component ${n2b[i]} = Num2Bit_strict();`);
            this.code.push(`${n2b[i]}.in <== ${f}`);
        }
        let curField =0;
        let curBit =0n;
        for (let i=0; i<n; i++) {
            let a = 0;
            for (let j=0; j<nBits; j++) {
                this.code.push(`${v}[i][j] <== ${n2b[curField]}.out[$curBit];`);
                curBit ++;
                if (curBit == 63) {
                    curBit = 0n;
                    curField ++;
                }
            }
            res.push(a);
        }
    }

    getCode() {
        for (let i=0; i<this.code.length; i++) this.code[i] = "    "+this.code[i];
        return this.code.join("\n");
    }

}
