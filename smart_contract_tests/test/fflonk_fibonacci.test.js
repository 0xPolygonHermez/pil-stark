const chai = require("chai");
const assert = chai.assert;
const expect = chai.expect;
const {F1Field, getCurveFromName} = require("ffjavascript");
const path = require("path");
const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");
const { fflonkSetup, fflonkProve, fflonkInfoGen, fflonkVerify, exportFflonkCalldata, exportPilFflonkVerifier} = require("pil-stark");

const smFibonacci = require("../../test/state_machines/sm_fibonacci/sm_fibonacci.js");

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
        const F = new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);

        const pil = await compile(F, path.join(__dirname, "../../test/state_machines/", "sm_fibonacci", "fibonacci_main.pil"));
        const constPols =  newConstantPolsArray(pil, F);

        await smFibonacci.buildConstants(constPols.Fibonacci);

        const cmPols = newCommitPolsArray(pil, F);

        await smFibonacci.execute(F, cmPols.Fibonacci, [1,2]);

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

        const fflonkInfo = fflonkInfoGen(F, pil);

        await fflonkSetup(pil, constPols, zkeyFilename, ptauFile, fflonkInfo, {extraMuls: 2});

        const {proof, publicSignals} = await fflonkProve(zkeyFilename, cmPols, constPols, fflonkInfo, ptauFile, {});
    

        const proofInputs = await exportFflonkCalldata(zkeyFilename, proof, publicSignals, {})
        const verifierCode = await exportPilFflonkVerifier(zkeyFilename, fflonkInfo, {});

        
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
            expect(await pilFflonkVerifier.verifyProof(...inputs)).to.equal(true);
    
        } else {
            expect(await pilFflonkVerifier.verifyProof(JSON.parse(proofInputs))).to.equal(true);
    
        }

    });

});