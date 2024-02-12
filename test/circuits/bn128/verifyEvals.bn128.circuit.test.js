const path = require("path");
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const starkInfo = require("./verifyEvals.starkInfo.json");

const F3g = require("../../../src/helpers/f3g");

const wasm_tester = require("circom_tester").wasm;

describe("Verify Evals Goldilocks Circuit Test", function () {
    this.timeout(10000000);

    let circuitVerifyEvals;
    let circuitVerifyEvalsMin;

    let F;

    let p;
    let q;

    let ctx;

    before(async() => {
        circuitVerifyEvals = await wasm_tester(path.join(__dirname, "circom", "verifyEvals.bn128.test.circom"), {O:1, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
        circuitVerifyEvalsMin = await wasm_tester(path.join(__dirname, "circom", "verifyEvalsMin.bn128.test.circom"), {O:1, include: ["circuits.bn128", "node_modules/circomlib/circuits"]});
    
        F = new F3g();

        p = 18446744069414584321n; // Goldilocks
        q = 18446744073709551616n; // 2^64
    
        ctx = {
            challenges: [],
            publics: [],
            evals: [],
        };
    
        ctx.challenges[2] = [q - 1n, q - 1n, q - 1n];
        ctx.challenges[3] = [q - 1n, q - 1n, q - 1n];
        ctx.challenges[4] = [q - 1n, q - 1n, q - 1n];
        ctx.challenges[7] = [q - 1n, q - 1n, q - 1n];
    
        ctx.publics[0] = p - 1n;
        ctx.publics[1] = p - 1n;
        ctx.publics[2] = p - 1n;
    
        for(let i = 0; i < 115; ++i) {
            ctx.evals[i] = [p - 1n, p - 1n, p - 1n];
        }
    });

    it("Should check that verify eval calculates proper output if all inputs are set to max value", async () => {
    
        const res = executeCode(F, ctx, starkInfo.verifierCode.code);

        const w1 = await circuitVerifyEvals.calculateWitness({}, true);

        await circuitVerifyEvals.assertOut(w1, {out: res});

    });

    it("Should check that verify eval calculates proper output if all inputs are set to max value and all subs are zero", async () => {
        
        const res = executeCode(F, ctx, starkInfo.verifierCode.code, true);

        const w2 = await circuitVerifyEvalsMin.calculateWitness({}, true);

        await circuitVerifyEvalsMin.assertOut(w2, {out: res});
    });

    function executeCode(F, ctx, code, min) {
        const tmp = [];
        for (let i=0; i<code.length; i++) {
            const src = [];
            for (k=0; k<code[i].src.length; k++) {
                src.push(getRef(code[i].src[k]));
            }
            let res;
            switch (code[i].op) {
                case 'add': res = F.add(src[0], src[1]); break;
                case 'sub': {
                    if(min) {
                        res = F.sub(src[0], 0n);
                    } else {
                        res = F.sub(src[0], src[1]);
                    }
                    break;
                }
                case 'mul': res = F.mul(src[0], src[1]); break;
                case 'muladd': res = F.add(F.mul(src[0], src[1]), src[2]); break;
                case 'copy': res = src[0]; break;
                default: throw new Error("Invalid op:"+ code[i].op);
            }
            setRef(code[i].dest, res);
        }
        return getRef(code[code.length-1].dest);
    
    
        function getRef(r) {
            switch (r.type) {
                case "tmp": return tmp[r.id];
                case "eval": return ctx.evals[r.id];
                case "number": return BigInt(r.value);
                case "public": return BigInt(ctx.publics[r.id]);
                case "challenge": return ctx.challenges[r.id];
                case "x": return ctx.challenges[7];
                default: throw new Error("Invalid reference type get: " + r.type);
            }
        }
    
        function setRef(r, val) {
            switch (r.type) {
                case "tmp": tmp[r.id] = val; return;
                default: throw new Error("Invalid reference type set: " + r.type);
            }
        }
    
    }
});
