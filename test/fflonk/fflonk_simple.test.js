const chai = require("chai");
const assert = chai.assert;
const {F1Field} = require("ffjavascript");
const path = require("path");
const { fflonkSetup } = require("../../src/fflonk/helpers/fflonk_setup.js");
const { fflonkProve } = require("../../src/fflonk/helpers/fflonk_prover.js");

const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");

const smSimple = require("../state_machines/sm_simple/sm_simple.js");
const { fflonkInfoGen } = require("../../src/fflonk/helpers/fflonk_info.js");
const { fflonkVerify } = require("../../src/fflonk/helpers/fflonk_verify.js");


describe("simple sm", async function () {
    this.timeout(10000000);

    it("Simple1", async () => {
        await runTest("simple1.pil");
    });
    it.only("Simple2", async () => {
        await runTest("simple2.pil");
    });
    it("Simple2p", async () => {
        await runTest("simple2p.pil");
    });
    it("Simple3", async () => {
        await runTest("simple3.pil");
    });
    it("Simple4", async () => {
        await runTest("simple4.pil");
    });
    it("Simple4p", async () => {
        await runTest("simple4p.pil");
    });

    async function runTest(pilFile) {
        const F = new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);
    
        const pil = await compile(F, path.join(__dirname, "../state_machines/", "sm_simple", pilFile));
        const constPols =  newConstantPolsArray(pil, F);
    
        await smSimple.buildConstants(constPols.Simple);
    
        const cmPols = newCommitPolsArray(pil, F);
    
        await smSimple.execute(F, cmPols.Simple);
    
        const res = await verifyPil(F, pil, cmPols , constPols);
    
        if (res.length != 0) {
            console.log("Pil does not pass");
            for (let i=0; i<res.length; i++) {
                console.log(res[i]);
            }
            assert(0);
        }
    
        const ptauFile =  path.join(__dirname, "../../", "tmp", "powersOfTau28_hez_final_19.ptau");
    
        const fflonkInfo = fflonkInfoGen(F, pil);
    
        const zkey = await fflonkSetup(pil, constPols, ptauFile, fflonkInfo, {extraMuls: 1});
    
        const {commits, evaluations, publics} = await fflonkProve(cmPols, constPols, fflonkInfo, zkey, ptauFile, {});
    
        const isValid = await fflonkVerify(zkey, publics, commits, evaluations, fflonkInfo, {});
        assert(isValid);
    }
});