const chai = require("chai");
const assert = chai.assert;
const {F1Field, buildBn128, utils} = require("ffjavascript");
const { stringifyBigInts } = utils;
const path = require("path");
const fflonkSetup  = require("../../src/fflonk/helpers/fflonk_setup.js");
const pilInfo = require("../../src/pil_info/pil_info.js");
const fs = require("fs");
const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");
const {log2} = require("pilcom/src/utils");
const fflonkVerificationKey = require("../../src/fflonk/helpers/fflonk_verification_key.js");
const {readPilFflonkZkeyFile} = require("../../src/fflonk/zkey/zkey_pilfflonk.js");
const { execSync } = require('child_process');

const smSimple = require("../state_machines/sm_simple/sm_simple.js");

const Logger = require("logplease");
const fflonk_shkey = require("../../src/fflonk/helpers/fflonk_shkey.js");
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
    
        let maxPilPolDeg = 0;
        for (const polRef in pil.references) {
            maxPilPolDeg = Math.max(maxPilPolDeg, pil.references[polRef].polDeg);
        }
        const N = 2**(log2(maxPilPolDeg - 1) + 1);
        await smSimple.buildConstants(N, constPols.Simple);
    
        const committedPols = newCommitPolsArray(pil, F);
    
        const isArray = filename === "simple2p" ? true : false;
        await smSimple.execute(N, committedPols.Simple, isArray, F);
    
        const res = await verifyPil(F, pil, committedPols, constPols);
    
        if (res.length != 0) {
            console.log("Pil does not pass");
            for (let i=0; i<res.length; i++) {
                console.log(res[i]);
            }
            assert(0);
        }

        // Create & save fflonkInfo
        const fflonkInfo = pilInfo(F, pil, false);
        
        const fflonkInfoFilename =  path.join(__dirname, "../../", "tmp", `${filename}.fflonkinfo.json`);
        await fs.promises.writeFile(fflonkInfoFilename, JSON.stringify(fflonkInfo, null, 1), "utf8");

        // Create & save zkey file
        const ptauFile =  path.join(__dirname, "../../", "tmp", "powersOfTau28_hez_final_19.ptau");
        const zkeyFilename =  path.join(__dirname, "../../", "tmp", `${filename}.zkey`);
    
        let { zkey: shKey } = await fflonk_shkey(pil, ptauFile, fflonkInfo, {extraMuls: 0, logger});
        shKey = stringifyBigInts(shKey);

        const shKeyFilename =  path.join(__dirname, "../../", "tmp", `${filename}.shkey.json`);
        await fs.promises.writeFile(shKeyFilename, JSON.stringify(shKey, null, 1));

        await fflonkSetup(constPols, zkeyFilename, ptauFile, fflonkInfo, {extraMuls: 0, logger});

        // Save verification key file
        const VkeyFilename = path.join(__dirname, "../../", "tmp", `${filename}.vkey`);
        const zkey = await readPilFflonkZkeyFile(zkeyFilename, {logger});
        const verificationKey = await fflonkVerificationKey(zkey, {logger});
        await fs.promises.writeFile(VkeyFilename, JSON.stringify(verificationKey, null, 1), "utf8");
        
        // Save constant polynomial evaluations file
        const constPolsFilename =  path.join(__dirname, "../../", "tmp", `${filename}.const`);
        await constPols.saveToFileFr(constPolsFilename, curve.Fr);

        // Save committed polynomial evaluations file
        const committedPolsFilename =  path.join(__dirname, "../../", "tmp", `${filename}.commit`);
        await committedPols.saveToFileFr(committedPolsFilename, curve.Fr);

        // Save cHelpers file
        try {
            const cHelpersFilename =  path.join(__dirname, "../../", "tmp", `${filename}.chelpers.cpp`);

            const cHelpersDir =  path.join(__dirname, "../../", "src", "fflonk/main_buildchelpers.js");
            const command = `node ${cHelpersDir} -f ${fflonkInfoFilename} -c ${cHelpersFilename}  -m`;
            execSync(command);
        } catch (error) {
            console.error(`Error while generating chelpers: ${error.message}`);
        }
    }
});
