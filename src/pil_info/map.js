
const { addPol, getExpDim, setCodeDimensions, fixProverCode } = require("./helpers/map_helpers.js");

module.exports = function map(res, pil, stark) {  
    res.varPolMap = [];

    res.cm  = [];

    res.mapSections = {};

    res.mapSections.cm1 = [];

    for(let i = 0; i < res.nStages; ++i) {
        const stage = 2 + i;
        res.mapSections["cm" + stage] = [];
    }

    res.mapSections.cmQ = [];
    res.mapSections.q_ext = [];
    res.mapSections.tmpExp = [];
    
    res.mapSectionsN = {} 
    res.exp2pol = {};

    if(stark) {
        res.mapSections.f_ext = [];
    }

    const tmpExps = {};

    pil.cmDims = [];

    mapCommitPols(res, pil);

    let nextStage = 2;

    mapInclusionPols(res, tmpExps, pil, nextStage++, stark);

    mapGrandProductPols(res, tmpExps, pil, nextStage++, stark);

    mapImPols(res, pil, nextStage - 1, stark);

    res.qDim = getExpDim(pil, res.cExp, stark);
    res.mapSections.q_ext.push(addPol(res, "q_ext", res.qDim));

    if(stark) {
        mapFriPols(res, pil);
    }
    
    mapSections(res);
   
    if(stark) {
        setMapOffsets(res);
    } 

   
    fixCode(res, tmpExps, pil, stark);

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


function mapCommitPols(res, pil) {
    for (let i=0; i<res.nCm[1]; i++) {
        const pp = addPol(res, "cm1", 1);
        res.cm.push(pp);
        res.mapSections.cm1.push(pp);
        pil.cmDims[i] = 1;
    }
}

function mapFriPols(res, pil) {
    for (let i=0; i<res.qDeg; i++) {
        const ppq = addPol(res, "cmQ", res.qDim);
        res.cm.push(ppq);
        res.mapSections.cmQ.push(ppq);
        pil.cmDims[res.qs[i]] = res.qDim;
    }
    const ppf_ext = addPol(res, "f_ext", 3);
    res.mapSections.f_ext.push(ppf_ext);
}

function mapGrandProductPols(res, tmpExps, pil, stage, stark) {
    const dim = stark ? 3 : 1;
    const grandProductPols = [...res.puCtx, ...res.peCtx, ...res.ciCtx];
    for (let i=0; i<grandProductPols.length; i++) {
        const gPol = grandProductPols[i];
        const ppz = addPol(res, "cm3", dim);
        res.cm.push(ppz);
        res.mapSections.cm3.push(ppz);
        pil.cmDims[gPol.zId] = dim;

        if (!res.imPolsMap[gPol.numId]) {
            if ( typeof tmpExps[gPol.numId] === "undefined") {
                tmpExps[gPol.numId] = res.mapSections.tmpExp.length;
                const ppNum = addPol(res, "tmpExp", dim);
                res.mapSections.tmpExp.push(ppNum);
                res.exp2pol[gPol.numId] = ppNum;
                // gPol.numId = ppNum;
            }
        }
        if (!res.imPolsMap[gPol.denId]) {
            if ( typeof tmpExps[gPol.denId] === "undefined") {
                tmpExps[gPol.denId] = res.mapSections.tmpExp.length;
                const ppDen = addPol(res, "tmpExp", dim);
                res.mapSections.tmpExp.push(ppDen);
                res.exp2pol[gPol.denId] = ppDen;
                // gPol.denId = ppDen;
            }
        }
    }
}


function mapInclusionPols(res, tmpExps, pil, stage, stark) {
    for (let i=0; i<res.puCtx.length; i++) {
        const pPol = res.puCtx[i]; 
        const dim = Math.max(getExpDim(pil, pPol.fExpId, stark), getExpDim(pil, pPol.tExpId, stark));
        const pph1 = addPol(res, "cm2", dim);
        res.cm.push(pph1);
        res.mapSections.cm2.push(pph1);
        pil.cmDims[pPol.h1Id] = dim;
        const pph2 = addPol(res, "cm2", dim);
        res.cm.push(pph2);
        res.mapSections.cm2.push(pph2);
        pil.cmDims[pPol.h2Id] = dim;

        if (!res.imPolsMap[pPol.fExpId]) {
            if ( typeof tmpExps[pPol.fExpId] === "undefined") {
                tmpExps[pPol.fExpId] = res.mapSections.tmpExp.length;
                const ppf = addPol(res, "tmpExp", dim);
                res.mapSections.tmpExp.push(ppf);
                // pPol.fExpId = ppf;
                res.exp2pol[res.puCtx[i].fExpId] = ppf;
            }
        }
        if (!res.imPolsMap[pPol.tExpId]) {
            if ( typeof tmpExps[pPol.tExpId] === "undefined") {
                tmpExps[pPol.tExpId] = res.mapSections.tmpExp.length;
                const ppt = addPol(res, "tmpExp", dim);
                res.mapSections.tmpExp.push(ppt);
                // pPol.tExpId = ppt;
                res.exp2pol[res.puCtx[i].tExpId] = ppt;
            }
        }
    }
}

function mapImPols(res, pil, lastStage, stark) {
    const stageName = "cm" + lastStage;
    for (let i=0; i<Object.keys(res.imPolsMap).length; i++) {
        let imId = Object.keys(res.imPolsMap)[i];
        const dim = getExpDim(pil, imId, stark);
        const ppIm = addPol(res, stageName, dim);
        res.cm.push(ppIm);

        res.mapSections[stageName].push(ppIm);
        pil.cmDims[res.imPolsMap[imId]] = dim;
        // res.imPolsMap[imId] = ppIm;
        res.exp2pol[imId] = ppIm;
    }
}

function mapSections(res) {
    Object.keys(res.mapSections).forEach((s) => {
        let p = 0;
        for (let i=0; i<res.varPolMap.length; i++) {
            const pp = res.varPolMap[i];
            if(pp.stage == s) {
                pp.stagePos = p;
                p += pp.dim;
            }
        }
        res.mapSectionsN[s] = p;
    });
}
