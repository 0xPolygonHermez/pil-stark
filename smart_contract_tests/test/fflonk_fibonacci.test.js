const chai = require("chai");
const assert = chai.assert;
const expect = chai.expect;
const {F1Field, getCurveFromName} = require("ffjavascript");
const path = require("path");
const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");
const {log2} = require("pilcom/src/utils");
const { fflonkSetup, fflonkProve, fflonkInfoGen, fflonkVerify, exportFflonkCalldata, exportPilFflonkVerifier, fflonkVerificationKey, readPilFflonkZkeyFile} = require("pil-stark");

const smFibonacci = require("../../test/state_machines/sm_fibonacci/sm_fibonacci.js");

const Logger = require('logplease');

const fs = require("fs");
const {ethers, run} = require("hardhat");

describe("Fflonk Fibonacci sm", async function () {
    this.timeout(10000000);

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

    it("It should create the pols main", async () => {
        const logger = Logger.create("pil-fflonk", {showTimestamp: false});
        Logger.setLogLevel("DEBUG");

        const F = new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);

        const pil = await compile(F, path.join(__dirname, "../../test/state_machines/", "sm_fibonacci", "fibonacci_main.pil"));
        const constPols =  newConstantPolsArray(pil, F);

        let maxPilPolDeg = 0;
        for (const polRef in pil.references) {
            maxPilPolDeg = Math.max(maxPilPolDeg, pil.references[polRef].polDeg);
        }
        const N = 2**(log2(maxPilPolDeg - 1) + 1);
        await smFibonacci.buildConstants(N, constPols.Fibonacci);

        const cmPols = newCommitPolsArray(pil, F);

        await smFibonacci.execute(N, cmPols.Fibonacci, [1,2], F);

        const res = await verifyPil(F, pil, cmPols , constPols);

        if (res.length != 0) {
            console.log("Pil does not pass");
            for (let i=0; i<res.length; i++) {
                console.log(res[i]);
            }
            assert(0);
        }

        const ptauFile =  path.join(__dirname, "../../", "tmp", "powersOfTau28_hez_final_19.ptau");
        const zkeyFilename =  path.join(__dirname, "../../", "tmp", "fflonk_fibonacci.zkey");
        const constExtFilename =  path.join(__dirname, "../../", "tmp", "fflonk_fibonacci.ext.const");

        const fflonkInfo = fflonkInfoGen(F, pil);

        const {constPolsCoefs, constPolsEvalsExt, x_n, x_2ns} = await fflonkSetup(pil, constPols, zkeyFilename,constExtFilename, ptauFile, fflonkInfo, {logger,extraMuls: 2});

        const zkey = await readPilFflonkZkeyFile(zkeyFilename, {logger});

        const vk = await fflonkVerificationKey(zkey, {logger});

        const {proof, publicSignals} = await fflonkProve(zkey, cmPols, constPols, constPolsCoefs, constPolsEvalsExt, x_n, x_2ns, fflonkInfo, {logger});
        const proofInputs = await exportFflonkCalldata(vk, proof, publicSignals, {logger})
        const verifierCode = await exportPilFflonkVerifier(vk, fflonkInfo, {logger});

        fs.writeFileSync("./tmp/contracts/pilfflonk_verifier_fibonacci.sol", verifierCode.verifierPilFflonkCode, "utf-8");
        fs.writeFileSync("./tmp/contracts/shplonk_verifier_fibonacci.sol", verifierCode.verifierShPlonkCode, "utf-8");

        await run("compile");

        const ShPlonkVerifier = await ethers.getContractFactory("./tmp/contracts/shplonk_verifier_fibonacci.sol:ShPlonkVerifier");
        const shPlonkVerifier = await ShPlonkVerifier.deploy();

        let shPlonkAddress = (await shPlonkVerifier.deployed()).address;

        const PilFflonkVerifier = await ethers.getContractFactory("./tmp/contracts/pilfflonk_verifier_fibonacci.sol:PilFflonkVerifier");
        const pilFflonkVerifier = await PilFflonkVerifier.deploy(shPlonkAddress);

        await pilFflonkVerifier.deployed();

        if(publicSignals.length > 0) {
            const inputs = proofInputs.split("],[")
            .map((str, index) => (index === 0 ? str + ']' : '[' + str))
            .map(str => JSON.parse(str));

            console.log(...inputs);
            expect(await pilFflonkVerifier.verifyProof(...inputs)).to.equal(true);
    
        } else {
            expect(await pilFflonkVerifier.verifyProof(JSON.parse(proofInputs))).to.equal(true);
    
        }

    });

});