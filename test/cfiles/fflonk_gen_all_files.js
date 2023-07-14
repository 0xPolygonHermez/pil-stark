const chai = require("chai");
const assert = chai.assert;
const {F1Field, buildBn128} = require("ffjavascript");
const path = require("path");
const fs = require("fs");
const { execSync } = require('child_process');

const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");

const smGlobal = require("../state_machines/sm/sm_global.js");
const smPlookup = require("../state_machines/sm_plookup/sm_plookup.js");
const smFibonacci = require("../state_machines/sm_fibonacci/sm_fibonacci.js");
const smPermutation = require("../state_machines/sm_permutation/sm_permutation.js");
const smConnection = require("../state_machines/sm_connection/sm_connection.js");
const fflonkSetup  = require("../../src/fflonk/helpers/fflonk_setup.js");
const fflonkInfoGen  = require("../../src/fflonk/helpers/fflonk_info.js");
const fflonkVerificationKey = require("../../src/fflonk/helpers/fflonk_verification_key.js");
const {readPilFflonkZkeyFile} = require("../../src/fflonk/zkey/zkey_pilfflonk.js");

const Logger = require("logplease");
const logger = Logger.create("pil-fflonk", {showTimestamp: false});
Logger.setLogLevel("DEBUG");

describe("all sm generate files", async function () {
    this.timeout(10000000);

    let curve;

    before(async () => {
        curve = await buildBn128();
    })

    after(async () => {
        await curve.terminate();
    });

    

    it("Creates all files needed to generate a pilfflonk proof for simple4p", async () => {
        const F = new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);

        const pil = await compile(F, path.join(__dirname, "../state_machines/", "sm_all", "all_main.pil"));
        const constPols =  newConstantPolsArray(pil, F);

        await smGlobal.buildConstants(constPols.Global);
        await smPlookup.buildConstants(constPols.Plookup);
        await smFibonacci.buildConstants(constPols.Fibonacci);
        await smPermutation.buildConstants(constPols.Permutation);
        await smConnection.buildConstants(constPols.Connection, F);

        const cmPols = newCommitPolsArray(pil, F);

        await smPlookup.execute(cmPols.Plookup);
        await smFibonacci.execute(cmPols.Fibonacci, [1,2], F);
        await smPermutation.execute(cmPols.Permutation);
        await smConnection.execute(cmPols.Connection);

        const res = await verifyPil(F, pil, cmPols , constPols);

        if (res.length != 0) {
            console.log("Pil does not pass");
            for (let i=0; i<res.length; i++) {
                console.log(res[i]);
            }
            assert(0);
        }

        // Create & save fflonkInfo
        const fflonkInfo = fflonkInfoGen(F, pil);

        const fflonkInfoFilename =  path.join(__dirname, "../../", "tmp", `all.fflonkinfo.json`);
        await fs.promises.writeFile(fflonkInfoFilename, JSON.stringify(fflonkInfo, null, 1), "utf8");

        // Create & save zkey file
        const ptauFile =  path.join(__dirname, "../../", "tmp", "powersOfTau28_hez_final_19.ptau");
        const zkeyFilename =  path.join(__dirname, "../../", "tmp", `all.zkey`);
    
        // Create & constant polynomial coefficients and extended evaluations file
        const constPolsZkeyFilename =  path.join(__dirname, "../../", "tmp", `all.ext.cnst`);

        await fflonkSetup(pil, constPols, zkeyFilename, constPolsZkeyFilename, ptauFile, fflonkInfo, {extraMuls: 2, logger});

        // Save verification key file
        const VkeyFilename = path.join(__dirname, "../../", "tmp", `all.vkey`);
        const zkey = await readPilFflonkZkeyFile(zkeyFilename, {logger});
        const verificationKey = await fflonkVerificationKey(zkey, {logger});
        await fs.promises.writeFile(VkeyFilename, JSON.stringify(verificationKey, null, 1), "utf8");
        
        // Save constant polynomial evaluations file
        const constPolsFilename =  path.join(__dirname, "../../", "tmp", `all.cnst`);
        await constPols.saveToFileFr(constPolsFilename);

        // Save committed polynomial evaluations file
        const committedPolsFilename =  path.join(__dirname, "../../", "tmp", `all.cmmt`);
        await cmPols.saveToFileFr(committedPolsFilename);

        // Save cHelpers file
        try {
            const command = `node src/fflonk/main_buildchelpers.js -z tmp/all.zkey -f tmp/all.fflonkinfo.json -c tmp/all.chelpers.cpp -C PilFflonkSteps -m`;
            execSync(command);
        } catch (error) {
            console.error(`Error while generating chelpers: ${error.message}`);
        }
    });
});
