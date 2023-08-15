
const { addPol, getExpDim, setCodeDimensions, fixProverCode } = require("./helpers/map_helpers.js");

module.exports = function map(res, pil, stark) {  
    res.varPolMap = [];

    res.cm  = [];
    res.tmpExp = [];
    
    res.mapSectionsN = {} 
    res.exp2pol = {};

    let im2Pol = {};

    const tmpExps = {};

    mapCommitPols(res);

    mapInclusionPols(res, tmpExps, pil, 2, stark);

    mapGrandProductPols(res, tmpExps, 3, stark);

    mapImPols(res, im2Pol, pil, res.nStages + 1, stark);

    res.qDim = getExpDim(res, pil, res.cExp, stark);
    addPol(res, "q_ext", res.qDim);

    if(stark) {
        mapFriPols(res);
    }
    
    if(stark) {
        setMapOffsets(res);
    } 

   
    fixCode(res, tmpExps, pil, stark);

    setDimensions(res, stark);

    for (let i=0; i<Object.keys(res.imPolsMap).length; i++) {
        let imId = Object.keys(res.imPolsMap)[i];
        res.imPolsMap[imId] = im2Pol[imId];
    }
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

function fixCode(res, tmpExps, pil, stark) {
    for (let i=0; i< res.publicsCode.length; i++) {
        fixProverCode(res, res.publicsCode[i], tmpExps, pil, "n", stark);
    }

    for (let i=0; i < res.nStages; i++) {
        const stage = 2 + i;
        fixProverCode(res, res.steps["stage" + stage], tmpExps, pil, "n", stark);
    }

    
    fixProverCode(res, res.steps["imPols"], tmpExps, pil, "n", stark);
    fixProverCode(res, res.steps["Q"], tmpExps, pil, "ext", stark);

    if(stark) {
        fixProverCode(res, res.steps["fri"], tmpExps, pil, "ext", stark);
        fixProverCode(res, res.verifierQueryCode, tmpExps, pil, "ext", stark, true);
    }
}


function mapCommitPols(res) {
    const section = "cm1";
    const dim = 1;
    for (let i=0; i<res.nCommitments; i++) {
        const pp = addPol(res, section, dim);
        res.cm.push(pp);
    }
}

function mapFriPols(res) {
    const section = "cmQ";
    for (let i=0; i<res.qDeg; i++) {
        const ppq = addPol(res, section, res.qDim);
        res.cm.push(ppq);
    }
    addPol(res, "f_ext", 3);
}

function mapGrandProductPols(res, tmpExps, stage, stark) {
    const dim = stark ? 3 : 1;
    const section = "cm3";
    const grandProductPols = [...res.puCtx, ...res.peCtx, ...res.ciCtx];
    for (let i=0; i<grandProductPols.length; i++) {
        const gPol = grandProductPols[i];
        const ppz = addPol(res, section, dim);
        res.cm.push(ppz);

        if (!res.imPolsMap[gPol.numId]) {
            if ( typeof tmpExps[gPol.numId] === "undefined") {
                tmpExps[gPol.numId] = Object.keys(tmpExps).length;
                const ppNum = addPol(res, "tmpExp", dim);
                res.tmpExp.push(ppNum);
                res.exp2pol[gPol.numId] = ppNum;
                // gPol.numId = ppNum;
            }
        }
        if (!res.imPolsMap[gPol.denId]) {
            if ( typeof tmpExps[gPol.denId] === "undefined") {
                tmpExps[gPol.denId] = Object.keys(tmpExps).length;
                const ppDen = addPol(res, "tmpExp", dim);
                res.tmpExp.push(ppDen);
                res.exp2pol[gPol.denId] = ppDen;
                // gPol.denId = ppDen;
            }
        }
    }
}


function mapInclusionPols(res, tmpExps, pil, stage, stark) {
    const section = "cm2";
    for (let i=0; i<res.puCtx.length; i++) {
        const pPol = res.puCtx[i]; 
        const dim = Math.max(getExpDim(res, pil, pPol.fExpId, stark), getExpDim(res, pil, pPol.tExpId, stark));
        const pph1 = addPol(res, section, dim);
        res.cm.push(pph1);
        const pph2 = addPol(res, section, dim);
        res.cm.push(pph2);

        if (!res.imPolsMap[pPol.fExpId]) {
            if ( typeof tmpExps[pPol.fExpId] === "undefined") {
                tmpExps[pPol.fExpId] = Object.keys(tmpExps).length;
                const ppf = addPol(res, "tmpExp", dim);
                res.tmpExp.push(ppf);
                // pPol.fExpId = ppf;
                res.exp2pol[res.puCtx[i].fExpId] = ppf;
            }
        }
        if (!res.imPolsMap[pPol.tExpId]) {
            if ( typeof tmpExps[pPol.tExpId] === "undefined") {
                tmpExps[pPol.tExpId] = Object.keys(tmpExps).length;
                const ppt = addPol(res, "tmpExp", dim);
                res.tmpExp.push(ppt);
                // pPol.tExpId = ppt;
                res.exp2pol[res.puCtx[i].tExpId] = ppt;
            }
        }
    }
}

function mapImPols(res, im2Pol, pil, lastStage, stark) {
    const section = "cm" + lastStage;
    for (let i=0; i<Object.keys(res.imPolsMap).length; i++) {
        let imId = Object.keys(res.imPolsMap)[i];
        const dim = getExpDim(res, pil, imId, stark);
        const ppIm = addPol(res, section, dim);
        res.cm.push(ppIm);

        im2Pol[imId] = ppIm;
        res.exp2pol[imId] = ppIm;
    }
}
