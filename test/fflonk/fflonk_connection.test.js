const chai = require("chai");
const assert = chai.assert;
const {F1Field, getCurveFromR} = require("ffjavascript");
const path = require("path");
const { fflonkSetup } = require("../../src/fflonk/helpers/fflonk_setup.js");

const { newConstantPolsArray, newCommitPolsArray, compile, verifyPil } = require("pilcom");

const smGlobal = require("../state_machines/sm/sm_global.js");
const smConnection = require("../state_machines/sm_connection/sm_connection.js");

describe("Fflonk connection sm", async function () {
    this.timeout(10000000);

    let curve;

    after(async () => {
        await curve.terminate();
    });

    it("It should create the pols main", async () => {
        const F = new F1Field(21888242871839275222246405745257275088548364400416034343698204186575808495617n);
        curve = await getCurveFromR(F.p);

        const pil = await compile(F, path.join(__dirname, "../state_machines/", "sm_connection", "connection_main.pil"));
        const constPols =  newConstantPolsArray(pil, F);

        await smGlobal.buildConstants(constPols.Global);
        await smConnection.buildConstants(F, constPols.Connection);

        const cmPols = newCommitPolsArray(pil, F);

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

        const setup = await fflonkSetup(pil, constPols, ptauFile, {curve, extraMuls: 1});

        console.log(setup);
    });

});
