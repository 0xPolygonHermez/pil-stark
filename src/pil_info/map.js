
const { addPol, getExpDim, setCodeDimensions, fixProverCode } = require("./helpers/map_helpers.js");

module.exports = function map(res, pil, stark) {  
    res.varPolMap = [];

    res.cm_n  = [];
    res.cm_2ns  = [];
    res.tmpExp_n = [];
    res.q_2ns = [];
    res.mapSections = {
        cm1_n: [],
        cm1_2ns: [],
        cmQ_n:[],
        cmQ_2ns:[],
        q_2ns:[],
        tmpExp_n:[],
    }

    for(let i = 0; i < res.nStages; ++i) {
        const stage = 2 + i;
        res.mapSections["cm" + stage + "_n"] = [];
        res.mapSections["cm" + stage + "_2ns"] = [];
    }
    res.mapSectionsN = {} 
    res.exp2pol = {};

    if(stark) {
        res.f_2ns = [];
        res.mapSections.f_2ns = [];
    }

    const tmpExps = {};

    pil.cmDims = [];

    mapCommitPols(res, pil);

    let nextStage = 2;

    mapInclusionPols(res, tmpExps, pil, nextStage++, stark);

    mapGrandProductPols(res, tmpExps, pil, nextStage++, stark);

    mapImPols(res, pil, nextStage - 1, stark);

    res.qDim = getExpDim(pil, res.cExp, stark);
    res.q_2ns.push(addPol(res, {
        section: "q_2ns",
        dim:res.qDim
    }));

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
        res.mapOffsets["cm" + stage + "_n"] = res.mapOffsets["cm" + (stage - 1) + "_n"] + N * res.mapSectionsN["cm" + (stage - 1) + "_n"];
    }
    res.mapOffsets.cmQ_n = res.mapOffsets["cm" + (res.nStages + 1) + "_n"] +  N * res.mapOffsets["cm" + (res.nStages + 1) + "_n"];
    res.mapOffsets.tmpExp_n = res.mapOffsets.cmQ_n +  N * res.mapSectionsN.cmQ_n;
    res.mapOffsets.cm1_2ns = res.mapOffsets.tmpExp_n +  N * res.mapSectionsN.tmpExp_n;
    for(let i = 0; i < res.nStages; ++i) {
        const stage = 2 + i;
        res.mapOffsets["cm" + stage + "_2ns"] = res.mapOffsets["cm" + (stage - 1) + "_2ns"] + Next * res.mapSectionsN["cm" +  (stage - 1) + "_2ns"];
    }
    res.mapOffsets.cmQ_2ns = res.mapOffsets["cm" + (res.nStages + 1) + "_2ns"] +  Next * res.mapOffsets["cm" + (res.nStages + 1) + "_2ns"];
    res.mapOffsets.q_2ns = res.mapOffsets.cmQ_2ns +  Next * res.mapSectionsN.cmQ_2ns;
    res.mapOffsets.f_2ns = res.mapOffsets.q_2ns +  Next * res.mapSectionsN.q_2ns;
    res.mapTotalN = res.mapOffsets.f_2ns +  Next * res.mapSectionsN.f_2ns;
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
    fixProverCode(res, res.steps["Q"], tmpExps, pil, "2ns", stark);

    if(stark) {
        fixProverCode(res, res.steps["fri"], tmpExps, pil, "2ns", stark);
        fixProverCode(res, res.verifierQueryCode, tmpExps, pil, "2ns", stark, true);
    }
}


function mapCommitPols(res, pil) {
    for (let i=0; i<res.nCm[1]; i++) {
        const pp_n = addPol(res, {
            section: "cm1_n",
            dim:1
        });
        const pp_2ns = addPol(res, {
            section: "cm1_2ns",
            dim:1
        });
        res.cm_n.push(pp_n);
        res.cm_2ns.push(pp_2ns);
        res.mapSections.cm1_n.push(pp_n);
        res.mapSections.cm1_2ns.push(pp_2ns);
        pil.cmDims[i] = 1;
    }
}

function mapFriPols(res, pil) {
    for (let i=0; i<res.qDeg; i++) {
        const ppz_n = addPol(res, {
            section: "cmQ_n",
            dim:res.qDim
        });
        const ppz_2ns = addPol(res, {
            section: "cmQ_2ns",
            dim:res.qDim
        });
        res.cm_n.push(ppz_n);
        res.cm_2ns.push(ppz_2ns);
        res.mapSections.cmQ_n.push(ppz_n);
        res.mapSections.cmQ_2ns.push(ppz_2ns);
        pil.cmDims[res.qs[i]] = res.qDim;
    }
    const ppf_2ns = addPol(res, {
        section: "f_2ns",
        dim:3
    });
    res.f_2ns.push(ppf_2ns);
}

function mapGrandProductPols(res, tmpExps, pil, stage, stark) {
    const dim = stark ? 3 : 1;
    const grandProductPols = [...res.puCtx, ...res.peCtx, ...res.ciCtx];
    for (let i=0; i<grandProductPols.length; i++) {
        const gPol = grandProductPols[i];
        const ppz_n = addPol(res, {
            section: "cm3_n",
            dim:dim
        });
        const ppz_2ns = addPol(res, {
            section: "cm3_2ns",
            dim:dim
        });
        res.cm_n.push(ppz_n);
        res.cm_2ns.push(ppz_2ns);
        res.mapSections.cm3_n.push(ppz_n);
        res.mapSections.cm3_2ns.push(ppz_2ns);
        pil.cmDims[gPol.zId] = dim;

        if (!res.imExps[gPol.numId]) {
            if ( typeof tmpExps[gPol.numId] === "undefined") {
                tmpExps[gPol.numId] = res.tmpExp_n.length;
                const ppNum_n = addPol(res, {
                    section: "tmpExp_n",
                    dim:dim
                });
                res.tmpExp_n.push(ppNum_n);
                res.mapSections.tmpExp_n.push(ppNum_n);
                res.exp2pol[gPol.numId] = ppNum_n;
            }
        }
        if (!res.imExps[gPol.denId]) {
            if ( typeof tmpExps[gPol.denId] === "undefined") {
                tmpExps[gPol.denId] = res.tmpExp_n.length;
                const ppDen_n = addPol(res, {
                    section: "tmpExp_n",
                    dim:dim
                });
                res.tmpExp_n.push(ppDen_n);
                res.mapSections.tmpExp_n.push(ppDen_n);
                res.exp2pol[gPol.denId] = ppDen_n;
            }
        }
    }
}


function mapInclusionPols(res, tmpExps, pil, stage, stark) {
    for (let i=0; i<res.puCtx.length; i++) {
        const dim = Math.max(getExpDim(pil, res.puCtx[i].fExpId, stark), getExpDim(pil, res.puCtx[i].tExpId, stark));
        const pph1_n = addPol(res, {
            section: "cm2_n",
            dim:dim
        });
        const pph1_2ns = addPol(res, {
            section: "cm2_2ns",
            dim:dim
        });
        res.cm_n.push(pph1_n);
        res.cm_2ns.push(pph1_2ns);
        res.mapSections.cm2_n.push(pph1_n);
        res.mapSections.cm2_2ns.push(pph1_2ns);
        pil.cmDims[res.puCtx[i].h1Id] = dim;
        const pph2_n = addPol(res, {
            section: "cm2_n",
            dim:dim
        });
        const pph2_2ns = addPol(res, {
            section: "cm2_2ns",
            dim:dim
        });
        res.cm_n.push(pph2_n);
        res.cm_2ns.push(pph2_2ns);
        res.mapSections.cm2_n.push(pph2_n);
        res.mapSections.cm2_2ns.push(pph2_2ns);
        pil.cmDims[res.puCtx[i].h2Id] = dim;

        if (!res.imExps[res.puCtx[i].fExpId]) {
            if ( typeof tmpExps[res.puCtx[i].fExpId] === "undefined") {
                tmpExps[res.puCtx[i].fExpId] = res.tmpExp_n.length;
                const ppf_n = addPol(res, {
                    section: "tmpExp_n",
                    dim:dim
                });
                res.tmpExp_n.push(ppf_n);
                res.mapSections.tmpExp_n.push(ppf_n);
                res.exp2pol[res.puCtx[i].fExpId] = ppf_n;
            }
        }
        if (!res.imExps[res.puCtx[i].tExpId]) {
            if ( typeof tmpExps[res.puCtx[i].tExpId] === "undefined") {
                tmpExps[res.puCtx[i].tExpId] = res.tmpExp_n.length;
                const ppt_n = addPol(res, {
                    section: "tmpExp_n",
                    dim:dim
                });
                res.tmpExp_n.push(ppt_n);
                res.mapSections.tmpExp_n.push(ppt_n);
                res.exp2pol[res.puCtx[i].tExpId] = ppt_n;
            }
        }
    }
}

function mapImPols(res, pil, lastStage, stark) {
    const sectionName = "cm" + lastStage;
    for (let i=0; i<res.imExpsList.length; i++) {
        const dim = getExpDim(pil, res.imExpsList[i], stark);

        const ppIm_n = addPol(res, {
            section: sectionName + "_n",
            dim:dim
        });
        const ppIm_2ns = addPol(res, {
            section: sectionName + "_2ns",
            dim:dim
        });
        res.cm_n.push(ppIm_n);
        res.cm_2ns.push(ppIm_2ns);

        res.mapSections[sectionName + "_n"].push(ppIm_n);
        res.mapSections[sectionName + "_2ns"].push(ppIm_2ns);
        pil.cmDims[res.imExp2cm[res.imExpsList[i]]] = dim;
        res.exp2pol[res.imExpsList[i]] = ppIm_n;
    }
}

function mapSections(res) {
    Object.keys(res.mapSections).forEach((s) => {
        let p = 0;
        for (let i=0; i<res.varPolMap.length; i++) {
            const pp = res.varPolMap[i];
            if(pp.section == s) {
                pp.sectionPos = p;
                p += pp.dim;
            }
        }
        res.mapSectionsN[s] = p;
    });
}