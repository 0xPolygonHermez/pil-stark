const chai = require("chai");
const assert = chai.assert;
const {F1Field, buildBn128} = require("ffjavascript");
const path = require("path");
const fflonkSetup  = require("../../src/fflonk/helpers/fflonk_setup.js");
const fflonkInfoGen  = require("../../src/fflonk/helpers/fflonk_info.js");
const fs = require("fs");
const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");

const smGlobal = require("../state_machines/sm/sm_global.js");

const Logger = require("logplease");
const { readPilFflonkZkeyFile } = require("../../src/fflonk/zkey/zkey_pilfflonk.js");
const { fflonkVerificationKey } = require("../../index.js");
const logger = Logger.create("pil-fflonk", {showTimestamp: false});
const { execSync } = require('child_process');
Logger.setLogLevel("DEBUG");

describe("generating files for arguments", async function () {
    this.timeout(10000000);

    let curve;

    before(async () => {
        curve = await buildBn128();
    })

    after(async () => {
        await curve.terminate();
    })

    it("Creates all files needed to generate a pilfflonk proof for simple permutation", async () => {
        await runTest("simple_permutation");
    });

    it("Creates all files needed to generate a pilfflonk proof for simple connection", async () => {
        await runTest("simple_connection");
    });

    it("Creates all files needed to generate a pilfflonk proof for simple plookup", async () => {
        await runTest("simple_plookup");
    });

    it("Creates all files needed to generate a pilfflonk proof for permutation", async () => {
        await runTest("permutation");
    });

    it("Creates all files needed to generate a pilfflonk proof for connection", async () => {
        await runTest("connection");
    });

    it("Creates all files needed to generate a pilfflonk proof for plookup", async () => {
        await runTest("plookup");
    });

    it("Creates all files needed to generate a pilfflonk proof for fibonacci", async () => {
        await runTest("fibonacci");
    });

    async function runTest(outputFilename) {
        const F = new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);
    
        const smModule = require(`../state_machines/sm_${outputFilename}/sm_${outputFilename}.js`);

        const pil = await compile(F, path.join(__dirname, "../state_machines/", `sm_${outputFilename}`, `${outputFilename}_main.pil`));
        const constPols =  newConstantPolsArray(pil, F);
        const committedPols = newCommitPolsArray(pil, F);

        const namePil = outputFilename.split("_").map(n => n.charAt(0).toUpperCase() + n.slice(1)).join("");

        if(!namePil.includes("Fibonacci")) {
            await smGlobal.buildConstants(constPols.Global);
            await smModule.execute(committedPols[namePil], F);
        } else {
            await smModule.execute(committedPols[namePil], [1,2], F);

        }

        await smModule.buildConstants(constPols[namePil], F);

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

        const fflonkInfoFilename =  path.join(__dirname, "../../", "tmp", `${outputFilename}.fflonkinfo.json`);
        await fs.promises.writeFile(fflonkInfoFilename, JSON.stringify(fflonkInfo, null, 1), "utf8");

        // Create & save zkey file
        const ptauFile =  path.join(__dirname, "../../", "tmp", "powersOfTau28_hez_final_19.ptau");
        const zkeyFilename =  path.join(__dirname, "../../", "tmp", `${outputFilename}.zkey`);

        const options = {extraMuls: 1, logger};
        if(namePil.includes("Plookup")) {
            options.extraMuls = 3;
        }

        // Create & constant polynomial coefficients and extended evaluations file
        const constPolsZkeyFilename =  path.join(__dirname, "../../", "tmp", `${outputFilename}.ext.cnst`);

        await fflonkSetup(pil, constPols, zkeyFilename, constPolsZkeyFilename, ptauFile, fflonkInfo, options);
    
        // Save constant polynomial evaluations file
        const constPolsFilename =  path.join(__dirname, "../../", "tmp", `${outputFilename}.cnst`);
        await constPols.saveToFileFr(constPolsFilename);

        // Save committed polynomial evaluations file
        const committedPolsFilename =  path.join(__dirname, "../../", "tmp", `${outputFilename}.cmmt`);
        await committedPols.saveToFileFr(committedPolsFilename);

        // Generate verification key
        const verificationKeyFilename =  path.join(__dirname, "../../", "tmp", `${outputFilename}.vkey`);
        const zkey = await readPilFflonkZkeyFile(zkeyFilename, {logger: options.logger});
        const verificationKey = await fflonkVerificationKey(zkey, options);
    
        await fs.promises.writeFile(verificationKeyFilename, JSON.stringify(verificationKey, null, 1), "utf8");

        // Save cHelpers file
        try {
            const command = `node src/fflonk/main_buildchelpers.js -z tmp/${outputFilename}.zkey -f tmp/${outputFilename}.fflonkinfo.json -c tmp/${outputFilename}.chelpers.cpp -C PilFflonkSteps -m`;
            execSync(command);
        } catch (error) {
            console.error(`Error while generating chelpers: ${error.message}`);
        }
    }
});
