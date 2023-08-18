const chai = require("chai");
const assert = chai.assert;
const {F1Field} = require("ffjavascript");
const path = require("path");

const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");

const smGlobal = require("../state_machines/sm/sm_global.js");
const smPlookup = require("../state_machines/sm_plookup/sm_plookup.js");
const smFibonacci = require("../state_machines/sm_fibonacci/sm_fibonacci.js");
const smPermutation = require("../state_machines/sm_permutation/sm_permutation.js");
const smConnection = require("../state_machines/sm_connection/sm_connection.js");
const fflonkSetup  = require("../../src/fflonk/helpers/fflonk_setup.js");
const fflonkProve = require("../../src/fflonk/helpers/fflonk_prover.js");
const pilInfo = require("../../src/pil_info/pil_info.js");
const fflonkVerify  = require("../../src/fflonk/helpers/fflonk_verify.js");
const fflonkVerificationKey = require("../../src/fflonk/helpers/fflonk_verification_key.js");
const { readPilFflonkZkeyFile } = require("../../src/fflonk/zkey/zkey_pilfflonk.js");

const Logger = require('logplease');


describe("Fflonk All sm", async function () {
    this.timeout(10000000);

    it("It should create the pols main", async () => {
        const logger = Logger.create("pil-fflonk", {showTimestamp: false});
        Logger.setLogLevel("DEBUG");
        
        const F = new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);

        const pil = await compile(F, path.join(__dirname, "../state_machines/", "sm_all", "all_main.pil"));
        const constPols =  newConstantPolsArray(pil, F);

        const fflonkInfo = pilInfo(F, pil, false);
        
        const N = 2**(fflonkInfo.pilPower);

        await smGlobal.buildConstants(N, constPols.Global);
        await smPlookup.buildConstants(N, constPols.Plookup);
        await smFibonacci.buildConstants(N, constPols.Fibonacci);
        await smPermutation.buildConstants(N, constPols.Permutation);
        await smConnection.buildConstants(N, constPols.Connection, F);

        const cmPols = newCommitPolsArray(pil, F);

        await smPlookup.execute(N, cmPols.Plookup);
        await smFibonacci.execute(N, cmPols.Fibonacci, [1,2], F);
        await smPermutation.execute(N, cmPols.Permutation);
        await smConnection.execute(N, cmPols.Connection);

        const res = await verifyPil(F, pil, cmPols , constPols);

        if (res.length != 0) {
            console.log("Pil does not pass");
            for (let i=0; i<res.length; i++) {
                console.log(res[i]);
            }
            assert(0);
        }

        const ptauFile =  path.join(__dirname, "../../", "tmp", "powersOfTau28_hez_final_19.ptau");
        const zkeyFilename =  path.join(__dirname, "../../", "tmp", "fflonk_all.zkey");

        await fflonkSetup(constPols, zkeyFilename, ptauFile, fflonkInfo, {extraMuls: 2, logger, maxQDegree: 3});
   
        const zkey = await readPilFflonkZkeyFile(zkeyFilename, {logger});

        const vk = await fflonkVerificationKey(zkey, {logger});

        const {proof, publics} = await fflonkProve(zkey, cmPols, fflonkInfo, {logger});

        const isValid = await fflonkVerify(vk, publics, proof, fflonkInfo, {logger});

        assert(isValid);
    });

});
