const chai = require("chai");
const assert = chai.assert;
const {F1Field, getCurveFromName} = require("ffjavascript");
const path = require("path");
const { fflonkSetup } = require("../../src/fflonk/helpers/fflonk_setup.js");
const { fflonkProve } = require("../../src/fflonk/helpers/fflonk_prover.js");
const { exportSolidityShPlonkVerifier } = require("shplonkjs");

const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");

const smGlobal = require("../state_machines/sm/sm_global.js");
const smPlookup = require("../state_machines/sm_plookup/sm_plookup.js");
const smFibonacci = require("../state_machines/sm_fibonacci/sm_fibonacci.js");
const smPermutation = require("../state_machines/sm_permutation/sm_permutation.js");
const smConnection = require("../state_machines/sm_connection/sm_connection.js");
const { fflonkInfoGen } = require("../../src/fflonk/helpers/fflonk_info.js");
const { fflonkVerify } = require("../../src/fflonk/helpers/fflonk_verify.js");
const { exportCalldata } = require("../../src/fflonk/solidity/exportCalldata.js");
const { exportSolidityVerifier } = require("../../src/fflonk/solidity/exportSolidityVerifier.js");
const fs = require("fs")

describe("Fflonk All sm", async function () {
    let curve;

    before(async () => {
        if (!fs.existsSync(`./tmp/contracts`)){
            fs.mkdirSync(`./tmp/contracts`, {recursive: true});
        }
        curve = await getCurveFromName("bn128");
    })

    after(async () => {
        await curve.terminate();
    })

    this.timeout(10000000);

    it("It should create the pols main", async () => {
        const F = new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);


        const pil = await compile(F, path.join(__dirname, "../state_machines/", "sm_all", "all_main.pil"));
        const constPols =  newConstantPolsArray(pil, F);

        await smGlobal.buildConstants(constPols.Global);
        await smPlookup.buildConstants(constPols.Plookup);
        await smFibonacci.buildConstants(constPols.Fibonacci);
        await smPermutation.buildConstants(constPols.Permutation);
        await smConnection.buildConstants(F, constPols.Connection);

        const cmPols = newCommitPolsArray(pil, F);

        await smPlookup.execute(cmPols.Plookup);
        await smFibonacci.execute(F, cmPols.Fibonacci, [1,2]);
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

        const ptauFile =  path.join(__dirname, "../../", "tmp", "powersOfTau28_hez_final_19.ptau");

        const fflonkInfo = fflonkInfoGen(F, pil);

        const zkey = await fflonkSetup(pil, constPols, ptauFile, fflonkInfo, {extraMuls: 3});

        const {commits, evaluations, publics} = await fflonkProve(cmPols, constPols, fflonkInfo, zkey, ptauFile, {});

        const isValid = await fflonkVerify(zkey, publics, commits, evaluations, fflonkInfo, {});
        assert(isValid);

        
        const calldata = await exportCalldata(zkey, curve, commits, evaluations, {})
        const verifierCode = await exportSolidityVerifier(zkey, curve, fflonkInfo, {});
        const verifierShPlonkCode = await exportSolidityShPlonkVerifier(zkey, curve, {nonCommittedPols: ["Q"], xiSeed: true });

        fs.writeFileSync(`./tmp/contracts/pilfflonk_verifier.sol`, verifierCode, "utf-8");
        fs.writeFileSync(`./tmp/contracts/shplonk_verifier.sol`, verifierShPlonkCode, "utf-8");
    });

});