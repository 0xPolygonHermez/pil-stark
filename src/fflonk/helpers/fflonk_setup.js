const {BigBuffer} = require("ffjavascript");
const {log2} = require("pilcom/src/utils");
const {setup, Polynomial, commit, lcm} = require("shplonkjs");
const { writePilFflonkZkeyFile } = require("../zkey/zkey_pilfflonk");

module.exports = async function fflonkSetup(_pil, cnstPols, zkeyFilename, ptauFile, fflonkInfo, options) {
    const logger = options.logger;

    const pil = JSON.parse(JSON.stringify(_pil));    // Make a copy as we are going to destroy pil

    if(logger) logger.info("Starting fflonk setup");
    //Find the max PIL polynomial degree
    const cnstPolsDefs = [];
    const cmPolsDefs = [];
    let maxPilPolDeg = 0;

    let polsNames = {
        0: [],
        1: [],
        2: [],
        3: [],
    };

    const polsOpenings = {};
    for (const polRef in pil.references) {
        const polInfo = pil.references[polRef];
        const name = polRef;
        if(polInfo.type === 'constP') {
            polInfo.stage = 0;
            if(polInfo.isArray) {
                for(let i = 0; i < polInfo.len; ++i) {
                    cnstPolsDefs.push({name: name + i, stage: 0, degree: polInfo.polDeg})
                }
            } else {
                cnstPolsDefs.push({name, stage: 0, degree: polInfo.polDeg})
            }
            polsOpenings[name] = 0;
            polsNames[0].push(name);
        } 
        
        if(polInfo.type === 'cmP') {
            polInfo.stage = 1;
            if(polInfo.isArray) {
                for(let i = 0; i < polInfo.len; ++i) {
                    cmPolsDefs.push({name: name + i, stage: 1, degree: polInfo.polDeg})
                }
            } else {
                cmPolsDefs.push({name, stage: 1, degree: polInfo.polDeg})
            }
            polsOpenings[name] = 1;
            polsNames[1].push(name);
        }

        maxPilPolDeg = Math.max(maxPilPolDeg, pil.references[polRef].polDeg);
    }

    const pilPower = log2(maxPilPolDeg - 1) + 1;
    const domainSize = 2 ** pilPower;

    const polsXi = [...cnstPolsDefs, ...cmPolsDefs]; 

   
    for(let i = 0; i < fflonkInfo.puCtx.length; ++i) {
        polsXi.push({name: `Plookup.H1_${i}`, stage: 2, degree: domainSize})
        pil.references[`Plookup.H1_${i}`] = {
            name: `Plookup.H1_${i}`,
            isArray: false,
            polDeg: domainSize,
            type: "cmP",
            id: fflonkInfo.puCtx[i].h1Id,
            stage: 2,
        }
        polsOpenings[`Plookup.H1_${i}`] = 1;
        polsNames[2].push(`Plookup.H1_${i}`);

        polsXi.push({name: `Plookup.H2_${i}`, stage: 2, degree: domainSize})
        pil.references[`Plookup.H2_${i}`] = {
            name: `Plookup.H2_${i}`,
            isArray: false,
            polDeg: domainSize,
            type: "cmP",
            id: fflonkInfo.puCtx[i].h2Id,
            stage: 2,
        }
        polsOpenings[`Plookup.H2_${i}`] = 1;
        polsNames[2].push(`Plookup.H2_${i}`);

        polsXi.push({name: `Plookup.Z${i}`, stage: 3, degree: domainSize})
        pil.references[`Plookup.Z${i}`] = {
            name: `Plookup.Z${i}`,
            isArray: false,
            polDeg: domainSize,
            type: "cmP",
            id: fflonkInfo.puCtx[i].zId,
            stage:3,
        }
        polsOpenings[`Plookup.Z${i}`] = 1;
        polsNames[3].push(`Plookup.Z${i}`);
    }


    for(let i = 0; i < fflonkInfo.peCtx.length; ++i) {
        polsXi.push({name: `Permutation.Z${i}`, stage:3, degree: domainSize})
        pil.references[`Permutation.Z${i}`] = {
            name: `Permutation.Z${i}`,
            isArray: false,
            polDeg: domainSize,
            type: "cmP",
            id: fflonkInfo.peCtx[i].zId,
            stage:3,
        }
        polsOpenings[`Permutation.Z${i}`] = 1;
        polsNames[3].push(`Permutation.Z${i}`);
    }

    for(let i = 0; i < fflonkInfo.ciCtx.length; ++i) {
        polsXi.push({name: `Connection.Z${i}`, stage: 3, degree: domainSize})
        pil.references[`Connection.Z${i}`] = {
            name: `Connection.Z${i}`,
            isArray: false,
            polDeg: domainSize,
            type: "cmP",
            id: fflonkInfo.ciCtx[i].zId,
            stage:3,
        }
        polsOpenings[`Connection.Z${i}`] = 1;
        polsNames[3].push(`Connection.Z${i}`);
    }


    for(let i = 0; i < fflonkInfo.imExpsList.length; ++i) {
        polsXi.push({name: `Im${fflonkInfo.imExpsList[i]}`, stage: 3, degree: domainSize})
        pil.references[`Im${fflonkInfo.imExpsList[i]}`] = {
            name: `Im${fflonkInfo.imExpsList[i]}`,
            isArray: false,
            polDeg: domainSize,
            type: "cmP",
            id: fflonkInfo.imExp2cm[fflonkInfo.imExpsList[i]],
            stage:3,
        }
	    polsOpenings[`Im${fflonkInfo.imExpsList[i]}`] = 1;
        polsNames[3].push(`Im${fflonkInfo.imExpsList[i]}`);
    }

    polsXi.push({name: "Q", stage: 4, degree: (fflonkInfo.qDeg + 1) * domainSize});

    console.log("QDEG", (fflonkInfo.qDeg + 1) * domainSize);
    
    const xiPols = fflonkInfo.evMap.filter(ev => !ev.prime);
    for (let i = 0; i < xiPols.length; i++) {
        if(xiPols[i].type === "const") continue;
        const reference = findPolynomialByTypeId(pil, xiPols[i].type + "P", xiPols[i].id);
        let name = reference;
        if(pil.references[reference].isArray) {
            name += (xiPols[i].id - pil.references[reference].id);
        }
        if(!polsOpenings[name]) throw new Error("Invalid polynomial name: " + name);
        ++polsOpenings[name];
    }

    const polsWXi = [];
    const primePols = fflonkInfo.evMap.filter(ev => ev.prime);
    for (let i = 0; i < primePols.length; i++) {
        const reference = findPolynomialByTypeId(pil,primePols[i].type + "P", primePols[i].id);
        let name = reference;
        if(pil.references[reference].isArray) {
            name += (primePols[i].id - pil.references[reference].id);
        }
        const stage = pil.references[reference].stage;
        polsWXi.push({name, stage, degree: pil.references[reference].polDeg});
        if(primePols[i].type === "const") continue;
        if(!polsOpenings[name]) throw new Error("Invalid polynomial name: " + name);
        ++polsOpenings[name];
    }
    
    polsXi.forEach(p => { if(p.name !== "Q" && polsOpenings[p.name]) {p.degree += polsOpenings[p.name]} });

    const polDefs = [polsXi];

    if(polsWXi.length > 0) {
        polsWXi.forEach(p => p.degree += polsOpenings[p.name]);
        polDefs.push(polsWXi);
    }

    const config = {
        power: pilPower, 
        polDefs,
        extraMuls: options.extraMuls || 0,
        openBy: "openingPoints",
    }

    const {zkey, PTau, curve} = await setup(config, ptauFile, logger);


    const ctx = {};
    for (let i = 0; i < cnstPols.$$nPols; i++) {
        let name = cnstPols.$$defArray[i].name;
        if(cnstPols.$$defArray[i].idx >= 0) name += cnstPols.$$defArray[i].idx;
        const cnstPolBuffer = cnstPols.$$array[i];

        if (logger) {
            logger.info(`Preparing ${name} polynomial`);
        }

        let polEvalBuff = new BigBuffer(cnstPolBuffer.length * curve.Fr.n8);
        for (let j = 0; j < cnstPolBuffer.length; j++) {
            polEvalBuff.set(curve.Fr.e(cnstPolBuffer[j]), j * curve.Fr.n8);
        }
        ctx[name] = await Polynomial.fromEvaluations(polEvalBuff, curve, logger);
    }

    const commits = await commit(0, zkey, ctx, PTau, curve, {multiExp: true, logger});

    for(let j = 0; j < commits.length; ++j) {
        zkey[`${commits[j].index}`] = commits[j].commit;
    }

    zkey.polsNamesStage = polsNames;
    zkey.polsOpenings = polsOpenings;
    let maxCmPolsOpenings = 0;

    const polsMap = {cm: {}, const: {}};
    for(const polRef in pil.references) {
        if(pil.references[polRef].type === "constP") {
            polsMap.const[pil.references[polRef].id] = polRef;
        }

        if(pil.references[polRef].type === "cmP") {
            polsMap.cm[pil.references[polRef].id] = polRef;

            // Compute max openings on committed polynomials to set a common bound on adding
            maxCmPolsOpenings = Math.max(maxCmPolsOpenings, polsOpenings[polRef]);
        }
    }
    
    zkey.polsMap = polsMap;

    // Precompute ZK data
    const domainSizeZK = domainSize + maxCmPolsOpenings;
    zkey.powerZK = log2(domainSizeZK - 1) + 1;
    zkey.powerW = lcm(Object.keys(zkey).filter(k => k.match(/^w\d+$/)).map(wi => wi.slice(1)));


    zkey.nPublics = fflonkInfo.nPublics;
    
    if(logger) logger.info("Fflonk setup finished");

    await writePilFflonkZkeyFile(zkey, zkeyFilename, PTau, curve, {logger});
}

function findPolynomialByTypeId(pil, type, id) {
    for (const polName in pil.references) {
        if (pil.references[polName].type === type) {
            if(pil.references[polName].isArray) {
                if(id >= pil.references[polName].id && id < (pil.references[polName].id + pil.references[polName].len)) {
                    return polName;
                }
            } else if(pil.references[polName].id === id) {
                return polName;
            }
        } 
    }
}
