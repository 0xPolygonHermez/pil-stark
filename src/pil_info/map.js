
const { addPol, getExpDim, setCodeDimensions, fixProverCode } = require("./helpers/map_helpers.js");

module.exports = function map(res, imPolsMap, pil, stark) {  
    res.varPolMap = [];

    res.cm  = [];
    res.tmpExp = [];
    
    res.mapSectionsN = {};
    res.mapSectionsN["tmpExp"] = 0;
    
    const tmpExps = {};

    mapCommitPols(res);

    mapInclusionPols(res, imPolsMap, tmpExps, pil, 2, stark);

    mapGrandProductPols(res, imPolsMap, tmpExps, 3, stark);

    mapImPols(res, imPolsMap, pil, stark);

    res.qDim = getExpDim(res, pil, res.cExp, stark);
    res.mapSectionsN["q_ext"] = 0;
    addPol(res, "q_ext", res.qDim);

    if(stark) {
        mapFriPols(res);
    }
    
    if(stark) {
        setMapOffsets(res);
    } 

   
    fixCode(res, imPolsMap, tmpExps, pil, stark);

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

function fixCode(res, imPolsMap, tmpExps, pil, stark) {
    for (let i=0; i< res.publicsCode.length; i++) {
        fixProverCode(res, res.publicsCode[i], imPolsMap, tmpExps, pil, "n", stark);
    }

    for (let i=0; i < res.nStages; i++) {
        const stage = 2 + i;
        fixProverCode(res, res.steps["stage" + stage], imPolsMap, tmpExps, pil, "n", stark);
    }

    
    fixProverCode(res, res.steps["imPols"], imPolsMap, tmpExps, pil, "n", stark);
    fixProverCode(res, res.steps["Q"], imPolsMap, tmpExps, pil, "ext", stark);

    if(stark) {
        fixProverCode(res, res.steps["fri"], imPolsMap, tmpExps, pil, "ext", stark);
        fixProverCode(res, res.verifierQueryCode, imPolsMap, tmpExps, pil, "ext", stark, true);
    }
}


function mapCommitPols(res) {
    const section = "cm1";
    const dim = 1;
    res.mapSectionsN[section] = 0;
    for (let i=0; i<res.nCommitments; i++) {
        addPol(res, section, dim);
    }
}

function mapFriPols(res) {
    const section = "cmQ";
    res.mapSectionsN[section] = 0;
    for (let i=0; i<res.qDeg; i++) {
        addPol(res, section, res.qDim);
    }
    res.mapSectionsN["f_ext"] = 0;
    addPol(res, "f_ext", 3);
}

function mapGrandProductPols(res, imPolsMap, tmpExps, stage, stark) {
    const dim = stark ? 3 : 1;
    const section = "cm3";
    res.mapSectionsN[section] = 0;
    const grandProductPols = [...res.puCtx, ...res.peCtx, ...res.ciCtx];
    for (let i=0; i<grandProductPols.length; i++) {
        const gPol = grandProductPols[i];
        addPol(res, section, dim);

        if (!imPolsMap[gPol.numId]) {
            if ( typeof tmpExps[gPol.numId] === "undefined") {
                tmpExps[gPol.numId] = Object.keys(tmpExps).length;
                const ppNum = addPol(res, "tmpExp", dim);
                gPol.numId = ppNum;
            }
        }

        if (!imPolsMap[gPol.denId]) {
            if ( typeof tmpExps[gPol.denId] === "undefined") {
                tmpExps[gPol.denId] = Object.keys(tmpExps).length;
                const ppDen = addPol(res, "tmpExp", dim);
                gPol.denId = ppDen;
            }
        }
    }
}


function mapInclusionPols(res, imPolsMap, tmpExps, pil, stage, stark) {
    const section = "cm2";
    res.mapSectionsN[section] = 0;
    for (let i=0; i<res.puCtx.length; i++) {
        const pPol = res.puCtx[i]; 
        const dim = Math.max(getExpDim(res, pil, pPol.fExpId, stark), getExpDim(res, pil, pPol.tExpId, stark));
        addPol(res, section, dim);
        addPol(res, section, dim);

        if (!imPolsMap[pPol.fExpId]) {
            if ( typeof tmpExps[pPol.fExpId] === "undefined") {
                tmpExps[pPol.fExpId] = Object.keys(tmpExps).length;
                const ppf = addPol(res, "tmpExp", dim);
                pPol.fExpId = ppf;
            }
        }

        if (!imPolsMap[pPol.tExpId]) {
            if ( typeof tmpExps[pPol.tExpId] === "undefined") {
                tmpExps[pPol.tExpId] = Object.keys(tmpExps).length;
                const ppt = addPol(res, "tmpExp", dim);
                pPol.tExpId = ppt;
            }
        }
    }
}

function mapImPols(res, imPolsMap, pil, stark) {
    const section = "cm" + (res.nStages + 1);
    for (let i=0; i<Object.keys(imPolsMap).length; i++) {
        let imId = Object.keys(imPolsMap)[i];
        const dim = getExpDim(res, pil, imId, stark);
        const ppIm = addPol(res, section, dim);
        
        const libs = [...res.puCtx, ...res.peCtx, ...res.ciCtx];
        for(let i = 0; i < libs.length; i++) {
            for(let j = 0; j < Object.keys(libs[i]).length; j++) {
                const name = Object.keys(libs[i])[j];
                if(libs[i][name] === Number(imId)) {
                    libs[i][name] = ppIm;
                }
            }
        }
    }
}