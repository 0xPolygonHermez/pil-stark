const chai = require("chai");
const assert = chai.assert;
const {F1Field, buildBn128} = require("ffjavascript");
const path = require("path");
const fflonkSetup  = require("../../src/fflonk/helpers/fflonk_setup.js");
const fflonkInfoGen  = require("../../src/fflonk/helpers/fflonk_info.js");
const fs = require("fs");
const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");
const fflonkVerificationKey = require("../../src/fflonk/helpers/fflonk_verification_key.js");
const {readPilFflonkZkeyFile} = require("../../src/fflonk/zkey/zkey_pilfflonk.js");

const smSimple = require("../state_machines/sm_simple/sm_simple.js");

const { writeConstPolsFile } = require("../../src/fflonk/const_pols_serializer.js");

const Logger = require("logplease");
const logger = Logger.create("pil-fflonk", {showTimestamp: false});
Logger.setLogLevel("DEBUG");

describe("simple sm", async function () {
    this.timeout(10000000);

    let curve;

    before(async () => {
        curve = await buildBn128();
    })

    after(async () => {
        await curve.terminate();
    })

    it("Creates all files needed to generate a pilfflonk proof for simple1", async () => {
        await runTest("simple1");
    });

    it("Creates all files needed to generate a pilfflonk proof for simple2", async () => {
        await runTest("simple2");
    });

    it("Creates all files needed to generate a pilfflonk proof for simple2p", async () => {
        await runTest("simple2p");
    });

    it("Creates all files needed to generate a pilfflonk proof for simple3", async () => {
        await runTest("simple3");
    });

    it("Creates all files needed to generate a pilfflonk proof for simple4", async () => {
        await runTest("simple4");
    });

    it("Creates all files needed to generate a pilfflonk proof for simple4p", async () => {
        await runTest("simple4p");
    });


    async function runTest(filename) {
        const F = new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);
    
        const pil = await compile(F, path.join(__dirname, "../state_machines/", "sm_simple", `${filename}.pil`));
        const constPols =  newConstantPolsArray(pil, F);
    
        await smSimple.buildConstants(constPols.Simple);
    
        const committedPols = newCommitPolsArray(pil, F);
    
        const isArray = filename === "simple2p" ? true : false;
        await smSimple.execute(committedPols.Simple, isArray, F);
    
        const res = await verifyPil(F, pil, committedPols , constPols);
    
        if (res.length != 0) {
            console.log("Pil does not pass");
            for (let i=0; i<res.length; i++) {
                console.log(res[i]);
            }
            assert(0);
        }

        // Create & save fflonkInfo
        const fflonkInfo = fflonkInfoGen(F, pil);

        const fflonkInfoFilename =  path.join(__dirname, "../../", "tmp", `${filename}.fflonkinfo.json`);
        await fs.promises.writeFile(fflonkInfoFilename, JSON.stringify(fflonkInfo, null, 1), "utf8");

        // Create & save zkey file
        const ptauFile =  path.join(__dirname, "../../", "tmp", "powersOfTau28_hez_final_19.ptau");
        const zkeyFilename =  path.join(__dirname, "../../", "tmp", `${filename}.zkey`);
    
        const {constPolsCoefs, constPolsEvalsExt, x_n, x_2ns} = await fflonkSetup(pil, constPols, zkeyFilename, ptauFile, fflonkInfo, {extraMuls: 1, logger});

        // Save verification key file
        const VkeyFilename = path.join(__dirname, "../../", "tmp", `${filename}.vkey`);
        const zkey = await readPilFflonkZkeyFile(zkeyFilename, {logger});
        const verificationKey = await fflonkVerificationKey(zkey, {logger});
        await fs.promises.writeFile(VkeyFilename, JSON.stringify(verificationKey, null, 1), "utf8");
        
        // Save constant polynomial evaluations file
        const constPolsFilename =  path.join(__dirname, "../../", "tmp", `${filename}.cnst`);
        await constPols.saveToFileFr(constPolsFilename);

        // Save committed polynomial evaluations file
        const committedPolsFilename =  path.join(__dirname, "../../", "tmp", `${filename}.cmmt`);
        await committedPols.saveToFileFr(committedPolsFilename);

        // Create & constant polynomial coefficients and extended evaluations file
        const constPolsZkeyFilename =  path.join(__dirname, "../../", "tmp", `${filename}.ext.cnst`);
        await writeConstPolsFile(constPolsZkeyFilename, constPolsCoefs, constPolsEvalsExt, x_n, x_2ns, curve.Fr, {logger});
    }
});
