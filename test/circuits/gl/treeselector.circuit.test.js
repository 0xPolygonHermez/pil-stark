const chai = require("chai");
const path = require("path");
const tmp = require('temporary');
const fs = require("fs");
const ejs = require("ejs");
const assert = chai.assert;

const wasm_tester = require("circom_tester").wasm;

function getBits(idx, nBits) {
    res = [];
    for (let i=0; i<nBits; i++) {
        res[i] = (idx >> i)&1 ? 1n : 0n;
    }
    return res;
}

describe("TreeSelector Circuit Test", function () {
    let circuit = [];

    this.timeout(10000000);

    before( async() => {
        const template = await fs.promises.readFile(path.join(__dirname, "circom", "treeselector.test.circom.ejs"), "utf8");
        
        for(let i = 0; i <= 7; ++i) {
            const content = ejs.render(template, {nBits: i, dirName:path.join(__dirname, "circom")});
            const circuitFile = path.join(new tmp.Dir().path, "circuit.circom");
            await fs.promises.writeFile(circuitFile, content);
            circuit[i] = await wasm_tester(circuitFile, {O:1, prime: "goldilocks"});
        }
        
    });

    for (let i=0;i<=7;i++) {
        it(`Should calculate tree selector with ${i} levels`, async () => {
            const nBits = i;
            const N = 1 << nBits;
    
            const values = [];
            for (let j=0; j<N; j++) {
                values[j] = [];
                for (let k=0; k<3; k++) {
                    values[j][k] = BigInt(k*100+j);
                }
            }
    
            for(let j = 0; j < N; ++j) {
                const input={
                    values: values,
                    key: getBits(j, nBits)
                };
                
                const w1 = await circuit[i].calculateWitness(input, true);
                
                await circuit[i].assertOut(w1, {out: values[j]});
            }
        });
    };
});