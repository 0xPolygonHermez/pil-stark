const {BigBuffer, getCurveFromR} = require("ffjavascript");
const {compile, newConstantPolsArray} = require("pilcom");
const {log2} = require("pilcom/src/utils");
const {setup, Polynomial, commit} = require("shplonkjs");


module.exports.fflonkSetup = async function (pilFile, pilConfig, cnstPolsFile, ptauFile, options) {
    const logger = options.logger;

    const F = options.F;

    if(logger) logger.info("Starting fflonk setup");

    // PIL compile
    const pil = await compile(F, pilFile, null, pilConfig);

    //Find the max PIL polynomial degree
    const cnstPolsDefs = [];
    const cmPolsDefs = [];
    let maxPilPolDeg = 0;
    for (const polRef in pil.references) {
        const polInfo = pil.references[polRef];
        const name = polRef.replace("Compressor.", "").replace("Global.", "");
        if(polInfo.type === 'constP') {
            if(polInfo.len) {
                for(let i = 0; i < polInfo.len; ++i) {
                    cnstPolsDefs.push({name: name + i, stage: 0, degree: polInfo.polDeg})
                }
            } else {
                cnstPolsDefs.push({name, stage: 0, degree: polInfo.polDeg})
            }
        } 
        
        if(polInfo.type === 'cmP') {
            if(polInfo.len) {
                for(let i = 0; i < polInfo.len; ++i) {
                    cmPolsDefs.push({name: name + i, stage: 1, degree: polInfo.polDeg})
                }
            } else {
                cmPolsDefs.push({name, stage: 1, degree: polInfo.polDeg})
            }
        }

        maxPilPolDeg = Math.max(maxPilPolDeg, pil.references[polRef].polDeg);
    }

    const pilPower = log2(maxPilPolDeg - 1) + 1;
    const domainSize = 2 ** pilPower;

    // TODO: ADD Z, T1, T2...
    const polsXi = [...cnstPolsDefs, ...cmPolsDefs]; 

    const polsWXi = [];

    const config = {
        power: pilPower, 
        polDefs: [
            polsXi,
            polsWXi,
        ],
        extraMuls: [0,0,0],
        openBy: "stage"
    }
    const curve = await getCurveFromR(F.p);

    const {zkey, PTau} = await setup(config, curve, ptauFile, logger);

    // Load preprocessed polynomials
    const cnstPols = newConstantPolsArray(pil, F);
    await cnstPols.loadFromFile(cnstPolsFile);

    const ctx = {};
    for (let i = 0; i < cnstPols.$$nPols; i++) {
        let name = cnstPols.$$defArray[i].name.replace("Compressor.", "").replace("Global.", "");
        if(cnstPols.$$defArray[i].idx >= 0) name += cnstPols.$$defArray[i].idx;
        const cnstPolBuffer = cnstPols.$$array[i];

        if (logger) {
            logger.info(`Preparing ${name} polynomial`);
        }

        let polEvalBuff = new BigBuffer(cnstPolBuffer.length * curve.Fr.n8);
        for (let i = 0; i < cnstPolBuffer.length; i++) {
            polEvalBuff.set(curve.Fr.e(cnstPolBuffer[i]), i * curve.Fr.n8);
        }
        ctx[name] = await Polynomial.fromEvaluations(polEvalBuff, curve, logger);
    }

    const commits = await commit(0, zkey, ctx, PTau, curve, logger);
    for(let j = 0; j < commits.length; ++j) {
        zkey[`f${commits[j].index}`] = commits[j].commit;
        ctx[`f${commits[j].index}`] = commits[j].pol;
    }
 
    logger.info("Fflonk setup finished");

    return {ctx, zkey, PTau};
}