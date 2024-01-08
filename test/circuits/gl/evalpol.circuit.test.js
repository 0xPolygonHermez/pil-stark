const path = require("path");
const {evalPol} = require("../../../src/helpers/polutils");
const F3g = require("../../../src/helpers/f3g");
const tmp = require('temporary');
const fs = require("fs");
const ejs = require("ejs");

const wasm_tester = require("circom_tester").wasm;


describe("EvalPol Circuit Test", function () {
    let circuit = [];

    this.timeout(10000000);

    async function testEvPol(N) {
        const F = new F3g();

        const pol = [];
        for (let j=0; j<N; j++) {
            pol[j] = [];
            for (let k=0; k<3; k++) {
                pol[j][k] = BigInt(k*100+j);
            }
        }
        const x = [555n, 666n, 777n];

        const input={
            pol: pol,
            x: x
        };

        const w1 = await circuit[N].calculateWitness(input, true);

        let res = evalPol(F, pol, x);

        if (!Array.isArray(res)) res = [res, 0n, 0n];

        await circuit[N].assertOut(w1, {out: res});
    }

    before( async() => {
        for (let i=0;i<=16;i++) {
            const template = await fs.promises.readFile(path.join(__dirname, "circom", "evalpol.test.circom.ejs"), "utf8");
            const content = ejs.render(template, {n: i, dirName:path.join(__dirname, "circom")});
            const circuitFile = path.join(new tmp.Dir().path, "circuit.circom");
            await fs.promises.writeFile(circuitFile, content);
            circuit[i] = await wasm_tester(circuitFile, {O:1, prime: "goldilocks"});
        }
    });

    for (let i=0;i<=16;i++) {
        it(`Should calculate polynomial evaluation n = ${i}`, async () => {
            await testEvPol(i);
        });
    };
});
