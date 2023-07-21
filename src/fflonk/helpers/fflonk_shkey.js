const {log2} = require("pilcom/src/utils");
const {setup} = require("shplonkjs");

module.exports = async function fflonkShkey(_pil, ptauFile, fflonkInfo, options) {
    const logger = options.logger;

    const pil = JSON.parse(JSON.stringify(_pil));    // Make a copy as we are going to destroy pil

    if(logger) logger.info("> Starting fflonk shkey generation");

    let polsNames = {
        0: [],
        1: [],
        2: [],
        3: [],
        4: [],
    };

    let fiMap = {
        0: {},
        1: {},
        2: {},
        3: {},
    };

    const nStages = 4;
    let fiNames = {};
    let fiIndex = 0;

    const polsXi = []; 
    const polsWXi = []; 
    
    for (const polRef in pil.references) {
        const polInfo = pil.references[polRef];
        const name = polRef;
        if(polInfo.type === 'constP') {
            polInfo.stage = 0;
            if(polInfo.isArray) {
                for(let i = 0; i < polInfo.len; ++i) {
                    const namePol = name + i;
                    const polId = polInfo.id + i;
                    setPolDefs("const", 0, namePol, polId, polInfo.polDeg);
                }
            } else {
                setPolDefs("const", 0, name, polInfo.id, polInfo.polDeg);
            }
        } 
    }

    for (const polRef in pil.references) {
        const polInfo = pil.references[polRef];
        const name = polRef;
        if(polInfo.type === 'cmP') {
            polInfo.stage = 1;
            if(polInfo.isArray) {
                for(let i = 0; i < polInfo.len; ++i) {
                    const namePol = name + i;
                    const polId = polInfo.id + i;
                    setPolDefs("cm", 1, namePol, polId, polInfo.polDeg);             
                }
            } else {
                setPolDefs("cm", 1, name, polInfo.id, polInfo.polDeg);
            } 
        }
    }

    const pilPower = fflonkInfo.pilPower;
    const domainSize = 2 ** pilPower;
   
    for(let i = 0; i < fflonkInfo.puCtx.length; ++i) {
        const namePlookupH1 = `Plookup.H1_${i}`;
        const idPlookupH1 = fflonkInfo.puCtx[i].h1Id;
        pil.references[namePlookupH1] = {
            name: namePlookupH1,
            isArray: false,
            polDeg: domainSize,
            type: "cmP",
            id: idPlookupH1,
            stage: 2,
        }
        setPolDefs("cm", 2, namePlookupH1, idPlookupH1, domainSize);

        const namePlookupH2 = `Plookup.H2_${i}`;
        const idPlookupH2 = fflonkInfo.puCtx[i].h2Id;
        pil.references[namePlookupH2] = {
            name: namePlookupH2,
            isArray: false,
            polDeg: domainSize,
            type: "cmP",
            id: idPlookupH2,
            stage: 2,
        }
        setPolDefs("cm", 2, namePlookupH2, idPlookupH2, domainSize);
    }


    for(let i = 0; i < fflonkInfo.puCtx.length; ++i) {
        const namePlookupZ = `Plookup.Z${i}`;
        const idPlookupZ = fflonkInfo.puCtx[i].zId;
        pil.references[namePlookupZ] = {
            name: namePlookupZ,
            isArray: false,
            polDeg: domainSize,
            type: "cmP",
            id: idPlookupZ,
            stage:3,
        }
        setPolDefs("cm", 3, namePlookupZ, idPlookupZ, domainSize);
    }

    for(let i = 0; i < fflonkInfo.peCtx.length; ++i) {
        const namePermutationZ = `Permutation.Z${i}`;
        const idPermutationZ = fflonkInfo.peCtx[i].zId;
        pil.references[namePermutationZ] = {
            name: namePermutationZ,
            isArray: false,
            polDeg: domainSize,
            type: "cmP",
            id: idPermutationZ,
            stage:3,
        }
        setPolDefs("cm", 3, namePermutationZ, idPermutationZ, domainSize);
    }

    for(let i = 0; i < fflonkInfo.ciCtx.length; ++i) {
        const nameConnectionZ = `Connection.Z${i}`;
        const idConnectionZ = fflonkInfo.ciCtx[i].zId;
        pil.references[nameConnectionZ] = {
            name: nameConnectionZ,
            isArray: false,
            polDeg: domainSize,
            type: "cmP",
            id: idConnectionZ,
            stage:3,
        }
        setPolDefs("cm", 3, nameConnectionZ, idConnectionZ, domainSize);
    }

    
    for(let i = 0; i < fflonkInfo.imExpsList.length; ++i) {
        const nameImPol = `Im${fflonkInfo.imExpsList[i]}`;
        const idImPol = fflonkInfo.imExp2cm[fflonkInfo.imExpsList[i]];
        pil.references[nameImPol] = {
            name: nameImPol,
            isArray: false,
            polDeg: domainSize,
            type: "cmP",
            id: idImPol,
            stage:3,
        }
        setPolDefs("cm", 3, nameImPol, idImPol, domainSize);
    }

    fixFIndex();
    
    // Precompute ZK data
    const extendBits = Math.ceil(Math.log2(fflonkInfo.qDeg + 1));
    const nBitsExt = pilPower + extendBits + fflonkInfo.nBitsZK;
    const domainSizeExt = 1 << nBitsExt;

    let maxQDegree = options.maxQDegree || 0;

    const domainSizeQ = domainSizeExt / 2;
    if(!maxQDegree || domainSizeQ / domainSize <= maxQDegree) {
        maxQDegree = 0;
        polsXi.push({name: "Q", stage: 4, degree: domainSizeQ, fi: fiIndex});
        polsNames[4].push("Q")
    } else {
        const nQ = Math.ceil(domainSizeQ / (maxQDegree * domainSize));
        for(let i = 0; i < nQ; ++i) {
            let degree = i === nQ - 1 ? domainSizeQ - i*maxQDegree*domainSize : maxQDegree * domainSize;
            polsXi.push({name: `Q${i}`, stage: 4, degree: degree, fi: fiIndex});
            polsNames[4].push(`Q${i}`)
        } 
    }
    
    polDefs = [polsXi, polsWXi];

    const config = {
        power: pilPower, 
        polDefs,
        extraMuls: options.extraMuls || 0,
        openBy: "custom",
    }

    if(logger) logger.info("Starting shPlonk setup...");
    
    const {zkey: shkey, PTau, curve} =await setup(config, ptauFile, logger);

    if(logger) logger.info("ShPlonk setup done.");

    shkey.polsNamesStage = polsNames;
    
    shkey.nPublics = fflonkInfo.nPublics;

    shkey.maxQDegree = maxQDegree;
    
    if(logger) logger.info("> Fflonk shkey generation finished");
    
    const roots = Object.keys(shkey).filter(k => k.match(/^w\d/));    
    for(let i = 0; i < roots.length; ++i) {
        shkey[roots[i]] = curve.Fr.toObject(shkey[roots[i]]);
    }

    return { zkey: shkey, PTau, curve };

    function setPolDefs(type, stage, name, id, domainSize) {
        if(!["const", "cm"].includes(type)) throw new Error("Invalid type");
        if(fflonkInfo.evMap.find(ev => ev.type === type && ev.id === id)) {
            let degree = domainSize;
          

            const openXi = fflonkInfo.evMap.find(ev => ev.type === type && ev.id === id && !ev.prime);
            const openWXi = fflonkInfo.evMap.find(ev => ev.type === type && ev.id === id && ev.prime);
            
            if(type === "cm") {
                ++degree;
                if(openXi) ++degree;
                if(openWXi) ++degree;
            }

            const openName = openXi && openWXi ? "0,1" : openXi ? "0" : "1";
            if(!fiMap[stage][openName]) fiMap[stage][openName] = 0;
            ++fiMap[stage][openName];

            polsNames[stage].push(name);
            if(openXi) {
                polsXi.push({name: name, stage: stage, degree: degree, open: openName})
            }
            if(openWXi) {
                polsWXi.push({name: name, stage: stage, degree: degree, open: openName})
            }
        } else {
            polsNames[stage].push(name);
        }
    }

    function fixFIndex(minPols = 3) {
        for(let stage = 0; stage < nStages; ++stage) {
            const openings = Object.keys(fiMap[stage]);
            if(openings.length <= 1) continue;
            
            if(!fiMap[stage]["0,1"] && fiMap[stage]["0"] >= minPols && fiMap[stage]["1"] >= minPols) continue;
    
            if(fiMap[stage]["0"] && fiMap[stage]["0"] < minPols) {
                for(let i = 0; i < polsXi.length; ++i) {
                    if(polsXi[i].stage === stage) {
                        polsXi[i].open = "0,1";
                        if(!polsWXi.find(wxi => JSON.stringify(wxi) === JSON.stringify(polsXi[i]))) {
                            if(stage !== 0) polsXi[i].degree += 1;
                            polsWXi.push(polsXi[i]);
                        }
                    }
                }
            } 
            
            if(fiMap[stage]["1"] && fiMap[stage]["1"] < minPols) {
                for(let i = 0; i < polsWXi.length; ++i) {
                    if(polsWXi[i].stage === stage) {
                        polsWXi[i].open = "0,1";
                        if(!polsXi.find(xi => JSON.stringify(xi) === JSON.stringify(polsWXi[i]))) {
                            if(stage !== 0) polsWXi[i].degree += 1;
                            polsXi.push(polsWXi[i]);
                        }
                    }
                }
            }
        }

        for(let i = 0; i < polsXi.length; ++i) {
            const fiName = `${polsXi[i].stage}_${polsXi[i].open}`;
            if(!fiNames.hasOwnProperty(fiName)) fiNames[fiName] = fiIndex++;
            polsXi[i].fi = fiNames[fiName];
        }

        for(let i = 0; i < polsWXi.length; ++i) {
            const fiName = `${polsWXi[i].stage}_${polsWXi[i].open}`;
            if(!fiNames.hasOwnProperty(fiName)) fiNames[fiName] = fiIndex++;
            polsWXi[i].fi = fiNames[fiName];
        }

        polsXi.forEach(p => delete p.open);
        polsWXi.forEach(p => delete p.open);
    }
}
