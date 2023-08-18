
const { addPol, getExpDim } = require("./helpers/helpers.js");

module.exports = function map(res, pil, stark) {  
    res.varPolMap = [];
    
    res.mapSectionsN = {};
    
    res.mapSectionsN["cm1"] = 0;
    for(let i = 0; i < res.nLibStages; ++i) {
        const stage = 2 + i;
        res.mapSectionsN[`cm${stage}`] = 0;
    }
    res.mapSectionsN["tmpExp"] = 0;

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

    mapLibPols(res, pil, stark);

    mapImPols(res, pil, stark);

    res.qDim = getExpDim(res, pil, res.cExp, stark);
    res.mapSectionsN["q_ext"] = res.qDim;
	
    if(stark) {
        res.mapSectionsN["cmQ"] = 0;
        res.mapSectionsN["f_ext"] = 3;

        for (let i=0; i<res.qDeg; i++) {
            addPol(res, "cmQ", `Q${i}`, res.qDim, res.qs[i]);
        }
    }
}

function mapLibPols(res, pil, stark) {
    let nCommits = pil.nCommitments;
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
                    if (!res.imPolsMap[polId]) {
                        res.imPolsMap[polId] = {libName: libName, stage: j, name: name, imPol: false, id: nCommits++};
                    } else {
                        res.imPolsMap[polId].libName = libName;
                        res.imPolsMap[polId].stage = j;
                        res.imPolsMap[polId].name = name;
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

function mapImPols(res, pil, stark) {
    for (let i=0; i<Object.keys(res.imPolsMap).length; i++) {
        let id = Object.keys(res.imPolsMap)[i];
        let pol = res.imPolsMap[id];
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
