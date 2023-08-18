const {setup} = require("shplonkjs");
const {Scalar} = require("ffjavascript");

module.exports = async function fflonkShkey(ptauFile, fflonkInfo, options) {
    const logger = options.logger;

    if(logger) logger.info("> Starting fflonk shkey generation");

    const nStages = fflonkInfo.nLibStages + 2;
    let fiNames = {};
    let fiIndex = 0;

    const polsXi = []; 
    const polsWXi = []; 
    
    const pilPower = fflonkInfo.pilPower;
    const domainSize = 2 ** pilPower;

    let polsNames = {};
    let fiMap = {};

    for(let i = 0; i < nStages; ++i) {
        polsNames[i] = [];
        fiMap[i] = {};
    }

    polsNames[nStages] = [];

    for(let i = 0; i < fflonkInfo.constPolsMap.length; ++i) {
        const polInfo = fflonkInfo.constPolsMap[i];
        setPolDefs("const", 0, polInfo.name, i, domainSize);
    }

    for(let i = 0; i < fflonkInfo.cmPolsMap.length; ++i) {
        const polInfo = fflonkInfo.cmPolsMap[i];
        if(polInfo.stage === "tmpExp") continue;
        const stage = Number(polInfo.stage.slice(2));
        setPolDefs("cm", stage, polInfo.name, i, domainSize);
    }
        
    fixFIndex();

    let maxQDegree = options.maxQDegree || 0;

    const blindCoefs = fflonkInfo.maxPolsOpenings * (fflonkInfo.qDeg + 1);
    const domainSizeQ = fflonkInfo.qDeg * domainSize + blindCoefs;
    
    if(!maxQDegree || (domainSizeQ - blindCoefs) <= maxQDegree * domainSize) {
        maxQDegree = 0;
        polsXi.push({name: "Q", stage: nStages, degree: domainSizeQ, fi: fiIndex});
        polsNames[nStages].push("Q")
    } else if((domainSizeQ - blindCoefs) / domainSize > maxQDegree) {
        const nQ = Math.ceil((domainSizeQ - blindCoefs) / (maxQDegree * domainSize));
        for(let i = 0; i < nQ; ++i) {
            let degree = i === nQ - 1 ? domainSizeQ - i*maxQDegree*domainSize : maxQDegree * domainSize + 2;
        
            polsXi.push({name: `Q${i}`, stage: nStages, degree: degree, fi: fiIndex});
            polsNames[nStages].push(`Q${i}`)
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
    
    delete shkey.X_2;
    
    if(logger) logger.info("> Fflonk shkey generation finished");
    
    const roots = Object.keys(shkey).filter(k => k.match(/^w\d/));    
    for(let i = 0; i < roots.length; ++i) {
        shkey[roots[i]] = curve.Fr.toObject(shkey[roots[i]]);
    }

    shkey.primeQ = curve.q;
    shkey.n8q = (Math.floor((Scalar.bitLength(shkey.primeQ) - 1) / 64) + 1) * 8;

    shkey.primeR = curve.r;
    shkey.n8r = (Math.floor((Scalar.bitLength(shkey.primeR) - 1) / 64) + 1) * 8;

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
