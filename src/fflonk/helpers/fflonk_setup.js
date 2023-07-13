const {BigBuffer} = require("ffjavascript");
const {log2} = require("pilcom/src/utils");
const {setup, Polynomial, commit} = require("shplonkjs");
const { ifft, fft, interpolate } = require("../../helpers/fft/fft_p.bn128");
const { writeConstPolsFile } = require("../const_pols_serializer");
const { writePilFflonkZkeyFile } = require("../zkey/zkey_pilfflonk");

module.exports = async function fflonkSetup(_pil, cnstPols, zkeyFilename, constExtFile, ptauFile, fflonkInfo, options) {
    const logger = options.logger;

    const pil = JSON.parse(JSON.stringify(_pil));    // Make a copy as we are going to destroy pil

    if(logger) logger.info("Starting fflonk setup");
    //Find the max PIL polynomial degree
    let maxPilPolDeg = 0;

    let polsNames = {
        0: [],
        1: [],
        2: [],
        3: [],
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
    
    const polsOpenings = {};
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
    
        maxPilPolDeg = Math.max(maxPilPolDeg, pil.references[polRef].polDeg);
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
        maxPilPolDeg = Math.max(maxPilPolDeg, pil.references[polRef].polDeg);
    }

    const pilPower = log2(maxPilPolDeg - 1) + 1;
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

    polsXi.push({name: "Q", stage: 4, degree: (fflonkInfo.qDeg + 1) * domainSize, fi: fiIndex});
    
    
    polsXi.forEach(p => { if(p.name !== "Q" && polsOpenings[p.name]) {p.degree += polsOpenings[p.name]} });
    polsWXi.forEach(p => p.degree += polsOpenings[p.name]);


    polDefs = [polsXi, polsWXi];

    const config = {
        power: pilPower, 
        polDefs,
        extraMuls: options.extraMuls || 0,
        openBy: "custom",
    }

    if(logger) logger.info("Starting shPlonk setup...");
    
    const {zkey, PTau, curve} = await setup(config, ptauFile, logger);

    if(logger) logger.info("ShPlonk setup done.");

    // Compute maxCmPolsOpenings
    let maxCmPolsOpenings = Math.max(...Object.values(polsOpenings));
 
    for(let i = 0; i < 4; i++) {
        for(let j = 0; j < polsNames[i].length; j++) {
            polsNames[i][j].openings = polsOpenings[polsNames[i][j].name];
        }
    }

    zkey.polsNamesStage = polsNames;

    // Precompute ZK data
    const domainSizeZK = domainSize + maxCmPolsOpenings;
    zkey.powerZK = log2(domainSizeZK - 1) + 1;

    zkey.nPublics = fflonkInfo.nPublics;
    
    const nBits = zkey.power;
    const extendBits = Math.ceil(Math.log2(fflonkInfo.qDeg + 1));
    const nBitsExt = zkey.power + extendBits;

    const domainSizeExt = 1 << nBitsExt;

    const extendBitsZK = zkey.powerZK - zkey.power;
    const factorZK = (1 << extendBitsZK);
    const extendBitsTotal = extendBits + extendBitsZK;
    const nBitsExtZK = nBits + extendBitsTotal;

    const sDomain = domainSize * curve.Fr.n8;
    const sDomainExt = domainSizeExt * curve.Fr.n8;

    let constPolsCoefs = new BigBuffer(fflonkInfo.nConstants * sDomain); // Constant polynomials
    let constPolsEvals = new BigBuffer(fflonkInfo.nConstants * sDomain); // Constant polynomials
    let constPolsEvalsExt = new BigBuffer(fflonkInfo.nConstants * sDomainExt * factorZK); // Constant polynomials

    cnstPols.writeToBigBufferFr(constPolsEvals, curve.Fr);

    if(fflonkInfo.nConstants > 0) {
        await interpolate(constPolsEvals, fflonkInfo.nConstants, nBits, constPolsCoefs, constPolsEvalsExt, nBitsExtZK, curve.Fr);
    
        const ctx = {};

        // Store coefs to context
        for (let i = 0; i < fflonkInfo.nConstants; i++) {
            const coefs = getPolFromBuffer(constPolsCoefs, fflonkInfo.nConstants, (1<<zkey.power)*factorZK, i, curve.Fr);
            ctx[zkey.polsNamesStage[0][i].name] = new Polynomial(coefs, curve, logger);
        }

        const commits = await commit(0, zkey, ctx, PTau, curve, {multiExp: true, logger});

        for(let j = 0; j < commits.length; ++j) {
            zkey[`${commits[j].index}`] = commits[j].commit;
        }
    }

    // Precalculate x_n and x_2ns
    const x_n = new BigBuffer(domainSize * curve.Fr.n8); // Omegas de field extension
    const x_2ns = new BigBuffer(domainSizeExt * factorZK * curve.Fr.n8); // Omegas a l'extès
        
    let w = curve.Fr.one;
    for (let i = 0; i < domainSize; i++) {
        const i_n8r = i * curve.Fr.n8;

        x_n.set(w, i_n8r);
        w = curve.Fr.mul(w, curve.Fr.w[zkey.power])
    }

    w = curve.Fr.one;
    for (let i = 0; i < domainSizeExt * factorZK; i++) {
        const i_n8r = i * curve.Fr.n8;

        x_2ns.set(w, i_n8r);
        w = curve.Fr.mul(w, curve.Fr.w[nBitsExtZK]);
    }

    if(logger) logger.info("Fflonk setup finished");

    await writePilFflonkZkeyFile(zkey, zkeyFilename, PTau, curve, {logger}); 

    await writeConstPolsFile(constExtFile, constPolsCoefs, constPolsEvalsExt, x_n, x_2ns, curve.Fr, {});

    return {constPolsCoefs, constPolsEvalsExt, x_n, x_2ns};

    function setPolDefs(type, stage, name, id, domainSize) {
        if(!["const", "cm"].includes(type)) throw new Error("Invalid type");
        if(fflonkInfo.evMap.find(ev => ev.type === type && ev.id === id)) {
            if(type === "cm") {
                polsOpenings[name] = 1;
            } else {
                polsOpenings[name] = 0;
            }

            const openXi = fflonkInfo.evMap.find(ev => ev.type === type && ev.id === id && !ev.prime);
            const openWXi = fflonkInfo.evMap.find(ev => ev.type === type && ev.id === id && ev.prime);
            
            const openName = openXi && openWXi ? "0,1" : openXi ? "0" : "1";
            if(!fiMap[stage][openName]) fiMap[stage][openName] = 0;
            ++fiMap[stage][openName];

            polsNames[stage].push({name});
            if(openXi) {
                polsXi.push({name: name, stage: stage, degree: domainSize, open: openName})
                if(type === "cm") ++polsOpenings[name];
            }
            if(openWXi) {
                polsWXi.push({name: name, stage: stage, degree: domainSize, open: openName})
                if(type === "cm") ++polsOpenings[name];                    
            }
        } else {
            polsOpenings[name] = 0;
            polsNames[stage].push({name});
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
                        if(!polsWXi.find(wxi => JSON.stringify(wxi) === JSON.stringify(polsXi[i]))) polsWXi.push(polsXi[i]);
                    }
                }
            } else if(fiMap[stage]["1"] && fiMap[stage]["1"] < minPols) {
                for(let i = 0; i < polsWXi.length; ++i) {
                    if(polsWXi[i].stage === stage) {
                        polsWXi[i].open = "0,1";
                        if(!polsXi.find(xi => JSON.stringify(xi) === JSON.stringify(polsWXi[i]))) polsXi.push(polsWXi[i]);
                    }
                }
            }
        }

        for(let i = 0; i < polsXi.length; ++i) {
            const fiName = `${polsXi[i].stage}_${polsXi[i].open}`;
            if(!(fiName in fiNames)) fiNames[fiName] = fiIndex++;
            polsXi[i].fi = fiNames[fiName];
            delete polsXi[i].open;
        }

        for(let i = 0; i < polsWXi.length; ++i) {
            const fiName = `${polsWXi[i].stage}_${polsWXi[i].open}`;
            if(!(fiName in fiNames)) fiNames[fiName] = fiIndex++;
            polsWXi[i].fi = fiNames[fiName];
            delete polsWXi[i].open;
        }
    }
}

function getPolFromBuffer(buff, nPols, N, id, Fr) {
    let polBuffer = new BigBuffer(N * Fr.n8);
    for (let j = 0; j < N; j++) {
        polBuffer.set(buff.slice((id + j * nPols) * Fr.n8, (id + j * nPols + 1) * Fr.n8), j * Fr.n8);
    }
    return polBuffer;
}