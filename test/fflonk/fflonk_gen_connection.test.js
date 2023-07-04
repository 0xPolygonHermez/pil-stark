const chai = require("chai");
const assert = chai.assert;
const {F1Field, buildBn128} = require("ffjavascript");
const path = require("path");
const fflonkSetup  = require("../../src/fflonk/helpers/fflonk_setup.js");
const fflonkInfoGen  = require("../../src/fflonk/helpers/fflonk_info.js");
const fs = require("fs");
const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");

const smGlobal = require("../state_machines/sm/sm_global.js");
const smConnection = require("../state_machines/sm_connection/sm_connection.js");

const { writeConstPolsFile } = require("../../src/fflonk/const_pols_serializer.js");

const Logger = require("logplease");
const logger = Logger.create("pil-fflonk", {showTimestamp: false});
Logger.setLogLevel("DEBUG");

describe("connection sm", async function () {
    this.timeout(10000000);

    let curve;

    before(async () => {
        curve = await buildBn128();
    })

    after(async () => {
        await curve.terminate();
    })

    it("Creates all files needed to generate a pilfflonk proof", async () => {
        await runTest("connection");
    });

    async function runTest(outputFilename) {
        const F = new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);
    
        const pil = await compile(F, path.join(__dirname, "../state_machines/", "sm_connection", "connection_main.pil"));
        const constPols =  newConstantPolsArray(pil, F);

        await smGlobal.buildConstants(constPols.Global);
        await smConnection.buildConstants(F, constPols.Connection);
    
        const committedPols = newCommitPolsArray(pil, F);
        await smConnection.execute(committedPols.Connection);

    
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

        const {constPolsCoefs, constPolsEvals, constPolsEvalsExt} = await fflonkSetup(pil, constPols, zkeyFilename, ptauFile, fflonkInfo, {extraMuls: 2, logger});
    
        // Save constant polynomial evaluations file
        const constPolsFilename =  path.join(__dirname, "../../", "tmp", `${outputFilename}.cnst`);
        await constPols.saveToFileFr(constPolsFilename);

        // Save committed polynomial evaluations file
        const committedPolsFilename =  path.join(__dirname, "../../", "tmp", `${outputFilename}.cmmt`);
        await committedPols.saveToFileFr(committedPolsFilename);

        // Create & constant polynomial coefficients and extended evaluations file
        const constPolsZkeyFilename =  path.join(__dirname, "../../", "tmp", `${outputFilename}.ext.cnst`);
        await writeConstPolsFile(constPolsZkeyFilename, constPolsCoefs, constPolsEvalsExt, curve.Fr, {logger});
    }
});
