
const { addPol, getExpDim, setCodeDimensions, fixProverCode } = require("./helpers/map_helpers.js");

module.exports = function map(res, pil, stark) {  
    res.varPolMap = [];
    
    res.mapSectionsN = {};
    
    res.mapSectionsN["cm1"] = 0;
    for(let i = 0; i < res.nLibStages; ++i) {
        const stage = 2 + i;
        res.mapSectionsN[`cm${stage}`] = 0;
    }
    res.mapSectionsN["tmpExp"] = 0;
    res.mapSectionsN["cmQ"] = 0;
    res.mapSectionsN["f_ext"] = 3;

    const imPols = {};

    for(let i = 0; i < Object.keys(res.imPolsMap).length; ++i) {
        let key = Object.keys(res.imPolsMap)[i];
        imPols[key] = {libName: "", id: res.imPolsMap[key], imPol: true};
    }

    for (const polRef in pil.references) {
        const polInfo = pil.references[polRef];
        let name = polRef;
        if(polInfo.type === 'cmP') {
            if(polInfo.isArray) {
                for(let i = 0; i < polInfo.len; ++i) {
                    const namePol = name + i;
                    const polId = polInfo.id + i;
                    addPol(res, "cm1", namePol, 1, polId);           
                }
            } else {
                addPol(res, "cm1", name, 1, polInfo.id); 
            } 
        }
    }

    mapLibPols(res, imPols, pil, stark);

    mapImPols(res, imPols, pil, stark);

    res.qDim = getExpDim(res, pil, res.cExp, stark);
    res.mapSectionsN["q_ext"] = res.qDim;

    if(stark) {
        for (let i=0; i<res.qDeg; i++) {
            addPol(res, "cmQ", `Q${i}`, res.qDim, res.qs[i]);
        }
    }

    fixCode(res, imPols, pil, stark);

    setDimensions(res, stark);

    if(stark) setMapOffsets(res); 
}

function setMapOffsets(res) {
    const N = 1 << res.starkStruct.nBits;
    const Next = 1 << res.starkStruct.nBitsExt;

    res.mapOffsets = {};
    res.mapOffsets.cm1_n = 0;
    for(let i = 0; i < res.nLibStages; ++i) {
        const stage = 2 + i;
        res.mapOffsets["cm" + stage + "_n"] = res.mapOffsets["cm" + (stage - 1) + "_n"] + N * res.mapSectionsN["cm" + (stage - 1)];
    }
    res.mapOffsets.cmQ_n = res.mapOffsets["cm" + (res.nLibStages + 1) + "_n"] +  N * res.mapSectionsN["cm" + (res.nLibStages + 1)];
    res.mapOffsets.tmpExp_n = res.mapOffsets.cmQ_n +  N * res.mapSectionsN.cmQ;
    res.mapOffsets.cm1_ext = res.mapOffsets.tmpExp_n +  N * res.mapSectionsN.tmpExp;
    for(let i = 0; i < res.nLibStages; ++i) {
        const stage = 2 + i;
        res.mapOffsets["cm" + stage + "_ext"] = res.mapOffsets["cm" + (stage - 1) + "_ext"] + Next * res.mapSectionsN["cm" +  (stage - 1) ];
    }
    res.mapOffsets.cmQ_ext = res.mapOffsets["cm" + (res.nLibStages + 1) + "_ext"] +  Next * res.mapSectionsN["cm" + (res.nLibStages + 1)];
    res.mapOffsets.q_ext = res.mapOffsets.cmQ_ext +  Next * res.mapSectionsN.cmQ;
    res.mapOffsets.f_ext = res.mapOffsets.q_ext +  Next * res.mapSectionsN.q_ext;
    res.mapTotalN = res.mapOffsets.f_ext +  Next * res.mapSectionsN.f_ext;
}

function setDimensions(res, stark) {
    for (let i=0; i<res.nPublics; i++) {
        if (res.publicsCode[i]) setCodeDimensions(res.publicsCode[i], res, stark);
    }
    
    for(let i = 0; i < Object.keys(res.code).length; ++i) {
        const name = Object.keys(res.code)[i];
        setCodeDimensions(res.code[name], res, stark);
    }
}

function fixCode(res, imPols, pil, stark) {
    for (let i=0; i< res.publicsCode.length; i++) {
        fixProverCode(res, res.publicsCode[i], imPols, "n", stark);
    }

    for(let i = 0; i < Object.keys(res.code).length; ++i) {
        const name = Object.keys(res.code)[i];
        const dom = ["Q", "fri", "queryVerifier"].includes(name) ? "ext" : "n";
        const verifier = name === "queryVerifier" ? true : false;
        fixProverCode(res, res.code[name], imPols, dom, stark, verifier);
    }
}

function mapLibPols(res, imPols, pil, stark) {
    for(let i = 0; i < Object.keys(res.libs).length; ++i) {
        const libName = Object.keys(res.libs)[i];
        const lib = res.libs[libName];
        for(let j = 0; j < lib.length; ++j) {
            const libStage = lib[j];
            const stage = 2 + j;
            let dim = -1;
            for(let k = 0; k < Object.keys(libStage.pols).length; ++k) {
                const name = Object.keys(libStage.pols)[k];
                if(libStage.pols[name].tmp) {
                    const polId = libStage.pols[name].id;
                    if (!imPols[polId]) {
                        imPols[polId] = {libName: libName, stage: j, name: name, imPol: false, id: pil.nCommitments++};
                    } else {
                        imPols[polId].libName = libName;
                        imPols[polId].stage = j;
                        imPols[polId].name = name;
                    }

                    dim = Math.max(dim, getExpDim(res, pil, polId, stark))
                } 
            }

            if(dim === -1) dim = stark ? 3 : 1;

            for(let k = 0; k < Object.keys(libStage.pols).length; ++k) {
                const name = Object.keys(libStage.pols)[k];
                if(libStage.pols[name].tmp) continue;
                addPol(res,`cm${stage}`,`${libName}_${name}`, dim, libStage.pols[name].id);
            }
        }
    }
}

function mapImPols(res, imPols, pil, stark) {
    for (let i=0; i<Object.keys(imPols).length; i++) {
        let id = Object.keys(imPols)[i];
        let pol = imPols[id];
        const section = pol.imPol ? "cm" + (res.nLibStages + 1) : "tmpExp";
        const dim = getExpDim(res, pil, id, stark);

        const name = pol.imPol ? `ImPol${id}` : `TmpExp${id}`;
        addPol(res, section, name, dim, pol.id);

        if(pol.imPol) {
            res.varPolMap[pol.id].imPol = true;
        }

        if(pol.libName !== "") {
            res.libs[pol.libName][pol.stage].pols[pol.name].id = pol.id;
        } 
    }
}
