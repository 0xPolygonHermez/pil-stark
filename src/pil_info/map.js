
const { addPol, getExpDim, setCodeDimensions, fixProverCode } = require("./helpers/map_helpers.js");

module.exports = function map(res, imPolsMap, pil, stark) {  
    res.varPolMap = [];
    
    res.mapSectionsN = {};
    
    const tmpExps = {};
    const imPols = {};

    for(let i = 0; i < Object.keys(imPolsMap).length; ++i) {
        let key = Object.keys(imPolsMap)[i];
        imPols[key] = {libId: -1, name: "", id: imPolsMap[key]};
    }

    mapCommitPols(res);

    mapInclusionPols(res, imPols, tmpExps, pil, 2, stark);

    mapGrandProductPols(res, imPols, tmpExps, 3, stark);

    mapImPols(res, imPols, pil, stark);

    mapTmpExpPols(res, tmpExps, pil, stark);

    res.qDim = getExpDim(res, pil, res.cExp, stark);
    res.mapSectionsN["q_ext"] = res.qDim;

    if(stark) {
        mapFriPols(res);
    }

    if(stark) {
        setMapOffsets(res);
    } 

    fixCode(res, imPols, tmpExps, pil, stark);

    setDimensions(res, stark);
}

function setMapOffsets(res) {
    const N = 1 << res.starkStruct.nBits;
    const Next = 1 << res.starkStruct.nBitsExt;

    res.mapOffsets = {};
    res.mapOffsets.cm1_n = 0;
    for(let i = 0; i < res.nStages; ++i) {
        const stage = 2 + i;
        res.mapOffsets["cm" + stage + "_n"] = res.mapOffsets["cm" + (stage - 1) + "_n"] + N * res.mapSectionsN["cm" + (stage - 1)];
    }
    res.mapOffsets.cmQ_n = res.mapOffsets["cm" + (res.nStages + 1) + "_n"] +  N * res.mapSectionsN["cm" + (res.nStages + 1)];
    res.mapOffsets.tmpExp_n = res.mapOffsets.cmQ_n +  N * res.mapSectionsN.cmQ;
    res.mapOffsets.cm1_ext = res.mapOffsets.tmpExp_n +  N * res.mapSectionsN.tmpExp;
    for(let i = 0; i < res.nStages; ++i) {
        const stage = 2 + i;
        res.mapOffsets["cm" + stage + "_ext"] = res.mapOffsets["cm" + (stage - 1) + "_ext"] + Next * res.mapSectionsN["cm" +  (stage - 1) ];
    }
    res.mapOffsets.cmQ_ext = res.mapOffsets["cm" + (res.nStages + 1) + "_ext"] +  Next * res.mapSectionsN["cm" + (res.nStages + 1)];
    res.mapOffsets.q_ext = res.mapOffsets.cmQ_ext +  Next * res.mapSectionsN.cmQ;
    res.mapOffsets.f_ext = res.mapOffsets.q_ext +  Next * res.mapSectionsN.q_ext;
    res.mapTotalN = res.mapOffsets.f_ext +  Next * res.mapSectionsN.f_ext;
}

function setDimensions(res, stark) {
    for (let i=0; i<res.nPublics; i++) {
        if (res.publicsCode[i]) setCodeDimensions(res.publicsCode[i], res, stark);
    }

    for (let i=0; i < res.nStages; i++) {
        setCodeDimensions(res.steps["stage" + (2 + i)], res, stark);
    }

    setCodeDimensions(res.steps["imPols"], res, stark);
    setCodeDimensions(res.steps["Q"], res, stark);
    
    if(stark) {
        setCodeDimensions(res.verifierCode, res, stark, 3);
        setCodeDimensions(res.steps["fri"], res, stark);
	    setCodeDimensions(res.verifierQueryCode, res, stark);
    } else {
        setCodeDimensions(res.verifierCode, res, false);
    }
}

function fixCode(res, imPols, tmpExps, pil, stark) {
    for (let i=0; i< res.publicsCode.length; i++) {
        fixProverCode(res, res.publicsCode[i], imPols, tmpExps, pil, "n", stark);
    }

    for (let i=0; i < res.nStages; i++) {
        const stage = 2 + i;
        fixProverCode(res, res.steps["stage" + stage], imPols, tmpExps, pil, "n", stark);
    }

    
    fixProverCode(res, res.steps["imPols"], imPols, tmpExps, pil, "n", stark);
    fixProverCode(res, res.steps["Q"], imPols, tmpExps, pil, "ext", stark);

    if(stark) {
        fixProverCode(res, res.steps["fri"], imPols, tmpExps, pil, "ext", stark);
        fixProverCode(res, res.verifierQueryCode, imPols, tmpExps, pil, "ext", stark, true);
    }
}


function mapCommitPols(res) {
    const section = "cm1";
    const dim = 1;
    res.mapSectionsN[section] = 0;
    for (let i=0; i<res.nCommitments; i++) {
        addPol(res, section, dim, i);
    }
}

function mapFriPols(res) {
    const section = "cmQ";
    res.mapSectionsN[section] = 0;
    for (let i=0; i<res.qDeg; i++) {
        addPol(res, section, res.qDim, res.qs[i]);
    }
    res.mapSectionsN["f_ext"] = 3;
}

function mapGrandProductPols(res, imPols, tmpExps, stage, stark) {
    const dim = stark ? 3 : 1;
    const section = "cm3";
    res.mapSectionsN[section] = 0;
    const grandProductPols = [...res.puCtx, ...res.peCtx, ...res.ciCtx];
    for (let i=0; i<grandProductPols.length; i++) {
        const gPol = grandProductPols[i];
        addPol(res, section, dim, gPol.zId);

        if (!imPols[gPol.numId] && typeof tmpExps[gPol.numId] === "undefined") {
            tmpExps[gPol.numId] = {libId: i, name: "numId", id:Object.keys(tmpExps).length};
        } else if (imPols[gPol.numId] && imPols[gPol.numId].libId === -1) {
            imPols[gPol.numId].libId = i;
            imPols[gPol.numId].name = "numId";
        }

        if (!imPols[gPol.denId] && typeof tmpExps[gPol.denId] === "undefined") {
            tmpExps[gPol.denId] = {libId: i, name: "denId", id: Object.keys(tmpExps).length};
        } else if (imPols[gPol.denId] && imPols[gPol.denId].libId === -1) {
            imPols[gPol.denId].libId = i;
            imPols[gPol.denId].name = "denId";
        }
    }
}


function mapInclusionPols(res, imPols, tmpExps, pil, stage, stark) {
    const section = "cm2";
    res.mapSectionsN[section] = 0;
    for (let i=0; i<res.puCtx.length; i++) {
        const pPol = res.puCtx[i]; 
        const dim = Math.max(getExpDim(res, pil, pPol.fExpId, stark), getExpDim(res, pil, pPol.tExpId, stark));
        addPol(res, section, dim, pPol.h1Id);
        addPol(res, section, dim, pPol.h2Id);

        if (!imPols[pPol.fExpId] && typeof tmpExps[pPol.fExpId] === "undefined") {
            tmpExps[pPol.fExpId] = {libId: i, name: "fExpId", id: Object.keys(tmpExps).length};
        } else if (imPols[pPol.fExpId] && imPols[pPol.fExpId].libId === -1) {
            imPols[pPol.fExpId].libId = i;
            imPols[pPol.fExpId].name = "fExpId";
        }

        if (!imPols[pPol.tExpId] && typeof tmpExps[pPol.tExpId] === "undefined") {
            tmpExps[pPol.tExpId] = {libId: i, name: "tExpId", id: Object.keys(tmpExps).length};
        } else if (imPols[pPol.tExpId] && imPols[pPol.tExpId].libId === -1) {
            imPols[pPol.tExpId].libId = i;
            imPols[pPol.tExpId].name = "tExpId";
        }
    }
}

function mapImPols(res, imPols, pil, stark) {
    const section = "cm" + (res.nStages + 1);
    const libs = [...res.puCtx, ...res.peCtx, ...res.ciCtx];
    for (let i=0; i<Object.keys(imPols).length; i++) {
        let imId = Object.keys(imPols)[i];
        const dim = getExpDim(res, pil, imId, stark);
        addPol(res, section, dim, imPols[imId].id);
        res.varPolMap[imPols[imId].id].imPol = true;
        
        if(imPols[imId].libId !== -1) {
            const t = imPols[imId];
            libs[t.libId][t.name] = imPols[imId].id;
        } 
    }
}

function mapTmpExpPols(res, tmpExps, pil, stark) {  
    res.mapSectionsN["tmpExp"] = 0;
    const libs = [...res.puCtx, ...res.peCtx, ...res.ciCtx];
    for (let i=0; i<Object.keys(tmpExps).length; i++) { 
        let tmpExpId = Object.keys(tmpExps)[i];
        const t = tmpExps[tmpExpId];
        const dim = getExpDim(res, pil, tmpExpId, stark);
        const cmId = pil.nCommitments + t.id;
        tmpExps[tmpExpId].id = cmId;

        addPol(res, "tmpExp", dim, cmId);

        libs[t.libId][t.name] = cmId;
    }
}
