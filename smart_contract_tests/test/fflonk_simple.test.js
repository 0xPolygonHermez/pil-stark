const chai = require("chai");
const assert = chai.assert;
const expect = chai.expect;
const {F1Field, getCurveFromName} = require("ffjavascript");
const path = require("path");
const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");

const { fflonkSetup, fflonkProve, pilInfo, exportFflonkCalldata, exportPilFflonkVerifier, fflonkVerificationKey, readPilFflonkZkeyFile} = require("pil-stark");

const smSimple = require("../../test/state_machines/sm_simple/sm_simple.js");

const fs = require("fs");
const {ethers, run} = require("hardhat");

const Logger = require('logplease');

async function runTest(pilFile) {
    const logger = Logger.create("pil-fflonk", {showTimestamp: false});
    Logger.setLogLevel("DEBUG");

    const F = new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);

    const pil = await compile(F, path.join(__dirname, "../../test/state_machines/", "sm_simple", `${pilFile}.pil`));
    const constPols =  newConstantPolsArray(pil, F);

    const fflonkInfo = pilInfo(F, pil, false);
    
    const N = 2**(fflonkInfo.pilPower);

    await smSimple.buildConstants(N, constPols.Simple);

    const cmPols = newCommitPolsArray(pil, F);

    const isArray = pilFile === "simple2p" ? true : false;
    await smSimple.execute(N, cmPols.Simple, isArray, F);

    const res = await verifyPil(F, pil, cmPols , constPols);

    if (res.length != 0) {
        console.log("Pil does not pass");
        for (let i=0; i<res.length; i++) {
            console.log(res[i]);
        }
        assert(0);
    }

    const ptauFile =  path.join(__dirname, "../../", "tmp", "powersOfTau28_hez_final_19.ptau");
    const zkeyFilename =  path.join(__dirname, "../../", "tmp", `fflonk_${pilFile}.zkey}`);

    await fflonkSetup(constPols, zkeyFilename, ptauFile, fflonkInfo, {extraMuls: 0, logger});
   
    const zkey = await readPilFflonkZkeyFile(zkeyFilename, {logger});

    const vk = await fflonkVerificationKey(zkey, {logger});

    const {proof, publics} = await fflonkProve(zkey, cmPols, fflonkInfo, {logger});

    const proofInputs = await exportFflonkCalldata(vk, proof, publics, {logger})
    const verifierCode = await exportPilFflonkVerifier(vk, fflonkInfo, {logger});

    fs.writeFileSync(`./tmp/contracts/pilfflonk_verifier_${pilFile}.sol`, verifierCode.verifierPilFflonkCode, "utf-8");
    fs.writeFileSync(`./tmp/contracts/shplonk_verifier_${pilFile}.sol`,  verifierCode.verifierShPlonkCode, "utf-8");

    await run("compile");

    const ShPlonkVerifier = await ethers.getContractFactory(`./tmp/contracts/shplonk_verifier_${pilFile}.sol:ShPlonkVerifier`);
    const shPlonkVerifier = await ShPlonkVerifier.deploy();

    let shPlonkAddress = (await shPlonkVerifier.deployed()).address;

    const PilFflonkVerifier = await ethers.getContractFactory(`./tmp/contracts/pilfflonk_verifier_${pilFile}.sol:PilFflonkVerifier`);
    const pilFflonkVerifier = await PilFflonkVerifier.deploy(shPlonkAddress);

    await pilFflonkVerifier.deployed();

   
    if(publics.length > 0) {
        const inputs = proofInputs.split("],[")
        .map((str, index) => (index === 0 ? str + ']' : '[' + str))
        .map(str => JSON.parse(str));
        expect(await pilFflonkVerifier.verifyProof(...inputs)).to.equal(true);
    } else {
        expect(await pilFflonkVerifier.verifyProof(JSON.parse(proofInputs))).to.equal(true);
    }
}



describe("simple sm", async function () {
    this.timeout(10000000);

    before(async () => {
        if (!fs.existsSync(`./tmp/contracts`)){
            fs.mkdirSync(`./tmp/contracts`, {recursive: true});
        }
    })

    it.skip("Simple1", async () => {
        await runTest("simple1");
    });
    it("Simple2", async () => {
        await runTest("simple2");
    });
    it("Simple2p", async () => {
        await runTest("simple2p");
    });
    it("Simple3", async () => {
        await runTest("simple3");
    });
    it("Simple4", async () => {
        await runTest("simple4");
    });
    it("Simple4p", async () => {
        await runTest("simple4p");
    });

});
