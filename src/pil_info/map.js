
const {iterateCode} = require("./codegen.js");

module.exports = function map(res, pil, stark) {
    const N = stark ? 1 << res.starkStruct.nBits : 1 << res.pilPower;
    const Next = stark ? 1 << res.starkStruct.nBitsExt : 1 << (res.pilPower + Math.ceil(Math.log2(res.qDeg + 1)));
    
    res.varPolMap = [];
    function addPol(polType) {
        res.varPolMap.push(polType);
        return res.varPolMap.length-1;
    }

    res.cm_n  = [];
    res.cm_2ns  = [];
    res.tmpExp_n = [];
    res.q_2ns = [];
    res.mapSections = {
        cm1_n: [],
        cm1_2ns: [],
        cmQ_n:[],
        cmQ_2ns:[],
        tmpExp_n:[],
    }
    for(let i = 0; i < res.nStages; ++i) {
        res.mapSections["cm" + (i + 2) + "_n"] = [];
        res.mapSections["cm" + (i + 2) + "_2ns"] = [];
    }
    res.mapSectionsN = {}    // Number of pols of base field i section
    res.exp2pol = {};

    if(stark) {
        res.f_2ns = [];
        res.mapSections.f_2ns = [];

        res.mapSectionsN1 = {}    // Number of pols of base field i section
        res.mapSectionsN3 = {}    // Number of pols of base field i section
    }

    const tmpExps = {};

    pil.cmDims = [];
    for (let i=0; i<res.nCm1; i++) {
        const pp_n = addPol({
            section: "cm1_n",
            dim:1
        });
        const pp_2ns = addPol({
            section: "cm1_2ns",
            dim:1
        });
        res.cm_n.push(pp_n);
        res.cm_2ns.push(pp_2ns);
        res.mapSections.cm1_n.push(pp_n);
        res.mapSections.cm1_2ns.push(pp_2ns);
        pil.cmDims[i] = 1;
    }

    for (let i=0; i<res.puCtx.length; i++) {
        const dim = Math.max(getExpDim(pil, res.puCtx[i].fExpId, stark), getExpDim(pil, res.puCtx[i].tExpId, stark));
        const pph1_n = addPol({
            section: "cm2_n",
            dim:dim
        });
        const pph1_2ns = addPol({
            section: "cm2_2ns",
            dim:dim
        });
        res.cm_n.push(pph1_n);
        res.cm_2ns.push(pph1_2ns);
        res.mapSections.cm2_n.push(pph1_n);
        res.mapSections.cm2_2ns.push(pph1_2ns);
        pil.cmDims[res.nCm1 + i*2] = dim;
        const pph2_n = addPol({
            section: "cm2_n",
            dim:dim
        });
        const pph2_2ns = addPol({
            section: "cm2_2ns",
            dim:dim
        });
        res.cm_n.push(pph2_n);
        res.cm_2ns.push(pph2_2ns);
        res.mapSections.cm2_n.push(pph2_n);
        res.mapSections.cm2_2ns.push(pph2_2ns);
        pil.cmDims[res.nCm1 + i*2+1] = dim;

        if (!res.imExps[res.puCtx[i].fExpId]) {
            if ( typeof tmpExps[res.puCtx[i].fExpId] === "undefined") {
                tmpExps[res.puCtx[i].fExpId] = res.tmpExp_n.length;
                const ppf_n = addPol({
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
                const ppt_n = addPol({
                    section: "tmpExp_n",
                    dim:dim
                });
                res.tmpExp_n.push(ppt_n);
                res.mapSections.tmpExp_n.push(ppt_n);
                res.exp2pol[res.puCtx[i].tExpId] = ppt_n;
            }
        }
    }

    for (let i=0; i<res.puCtx.length + res.peCtx.length + res.ciCtx.length; i++) {
        if (i<res.puCtx.length) {
            o = res.puCtx[i];
        } else if (i<res.puCtx.length + res.peCtx.length) {
            o = res.peCtx[i-res.puCtx.length];
        } else {
            o = res.ciCtx[i-res.puCtx.length-res.peCtx.length];
        }

        const dim = stark ? 3 : 1;
        const ppz_n = addPol({
            section: "cm3_n",
            dim:dim
        });
        const ppz_2ns = addPol({
            section: "cm3_2ns",
            dim:dim
        });
        res.cm_n.push(ppz_n);
        res.cm_2ns.push(ppz_2ns);
        res.mapSections.cm3_n.push(ppz_n);
        res.mapSections.cm3_2ns.push(ppz_2ns);
        pil.cmDims[res.nCm1 + res.nCm2 + i] = dim;

        if (! res.imExps[o.numId]) {
            if ( typeof tmpExps[o.numId] === "undefined") {
                tmpExps[o.numId] = res.tmpExp_n.length;
                const ppNum_n = addPol({
                    section: "tmpExp_n",
                    dim:dim
                });
                res.tmpExp_n.push(ppNum_n);
                res.mapSections.tmpExp_n.push(ppNum_n);
                res.exp2pol[o.numId] = ppNum_n;
            }
        }
        if (!res.imExps[o.denId]) {
            if ( typeof tmpExps[o.denId] === "undefined") {
                tmpExps[o.denId] = res.tmpExp_n.length;
                const ppDen_n = addPol({
                    section: "tmpExp_n",
                    dim:dim
                });
                res.tmpExp_n.push(ppDen_n);
                res.mapSections.tmpExp_n.push(ppDen_n);
                res.exp2pol[o.denId] = ppDen_n;
            }
        }
    }

    for (let i=0; i<res.imExpsList.length; i++) {
        const dim = getExpDim(pil, res.imExpsList[i], stark);
        const ppz_n = addPol({
            section: "cm3_n",
            dim:dim
        });
        const ppz_2ns = addPol({
            section: "cm3_2ns",
            dim:dim
        });
        res.cm_n.push(ppz_n);
        res.cm_2ns.push(ppz_2ns);
        res.mapSections.cm3_n.push(ppz_n);
        res.mapSections.cm3_2ns.push(ppz_2ns);
        pil.cmDims[res.nCm1 + res.nCm2 + res.puCtx.length + res.peCtx.length + res.ciCtx.length + i] = dim;
        res.exp2pol[res.imExpsList[i]] = ppz_n;
    }



    res.qDim = getExpDim(pil, res.cExp, stark);
    if(stark) {
        for (let i=0; i<res.qDeg; i++) {
            const ppz_n = addPol({
                section: "cmQ_n",
                dim:res.qDim
            });
            const ppz_2ns = addPol({
                section: "cmQ_2ns",
                dim:res.qDim
            });
            res.cm_n.push(ppz_n);
            res.cm_2ns.push(ppz_2ns);
            res.mapSections.cmQ_n.push(ppz_n);
            res.mapSections.cmQ_2ns.push(ppz_2ns);
            pil.cmDims[res.nCm1 + res.nCm2 + res.nCm3 + i] = res.qDim;
        }
        const ppf_2ns = addPol({
            section: "f_2ns",
            dim:3
        });
        res.f_2ns.push(ppf_2ns);
    }

    const ppq_2ns = addPol({
        section: "q_2ns",
        dim:res.qDim
    });
    res.q_2ns.push(ppq_2ns);

    
    mapSections(res, stark);
   
    if(stark) {
        res.mapOffsets = {};
        res.mapOffsets.cm1_n = 0;
        for(let i = 0; i < res.nStages; ++i) {
            res.mapOffsets["cm" + (i + 2) + "_n"] = res.mapOffsets["cm" + (i + 1) + "_n"] + N * res.mapSectionsN["cm" + (i + 1) + "_n"];
        }
        res.mapOffsets.cmQ_n = res.mapOffsets["cm" + (res.nStages + 1) + "_n"] +  N * res.mapOffsets["cm" + (res.nStages + 1) + "_n"];
        res.mapOffsets.tmpExp_n = res.mapOffsets.cmQ_n +  N * res.mapSectionsN.cmQ_n;
        res.mapOffsets.cm1_2ns = res.mapOffsets.tmpExp_n +  N * res.mapSectionsN.tmpExp_n;
        for(let i = 0; i < res.nStages; ++i) {
            res.mapOffsets["cm" + (i + 2) + "_2ns"] = res.mapOffsets["cm" + (i + 1) + "_2ns"] + Next * res.mapSectionsN["cm" + (i + 1) + "_2ns"];
        }
        res.mapOffsets.cmQ_2ns = res.mapOffsets["cm" + (res.nStages + 1) + "_2ns"] +  Next * res.mapOffsets["cm" + (res.nStages + 1) + "_2ns"];
        res.mapOffsets.q_2ns = res.mapOffsets.cmQ_2ns +  Next * res.mapSectionsN.cmQ_2ns;
        res.mapOffsets.f_2ns = res.mapOffsets.q_2ns +  Next * res.mapSectionsN.q_2ns;
        res.mapTotalN = res.mapOffsets.f_2ns +  Next * res.mapSectionsN.f_2ns;
    } 
    
    res.mapDeg = {};
    res.mapDeg.cm1_n = N;
    for(let i = 0; i < res.nStages; ++i) {
        res.mapDeg["cm" + (i + 2) + "_n"] = N;
    };
    res.mapDeg.tmpExp_n = N;
    res.mapDeg.cm1_2ns = Next;
    for(let i = 0; i < res.nStages; ++i) {
        res.mapDeg["cm" + (i + 2) + "_2ns"] = N;
    };
    res.mapDeg.q_2ns = Next;
    if(stark) {
        res.mapDeg.cmQ_n = N;
        res.mapDeg.cmQ_2ns = Next;
        res.mapDeg.f_2ns = Next;
    }
    
    for (let i=0; i< res.publicsCode.length; i++) {
        fixProverCode(res.publicsCode[i], "n");
    }

    for (let i=0; i < res.nStages; i++) {
        fixProverCode(res["step" + (i + 2) + "prev"], "n");
    }
    
    fixProverCode(res.stepQprev, "n");
    fixProverCode(res.stepQ2ns, "2ns");

    if(stark) {
        fixProverCode(res.stepEv2ns, "2ns");
        fixProverCode(res.verifierQueryCode, "2ns");
        iterateCode(res.verifierQueryCode, function fixRef(r, ctx) {
                if (r.type == "cm") {
                    const p1 = res.varPolMap[res.cm_2ns[r.id]];
                    if (p1.section === "cm1_2ns") {
                        r.type = "tree1";
                    } else if(p1.section === "cmQ_2ns") {
                        r.type = "treeQ";
                    } else {
                        const index =  p1.section.substr(2).split("_")[0];
                        if(Number(index) < 2 || Number(index) > res.nStages + 2) throw new Error("Invalid cm section");
                        r.type = "tree" + index;
                    }
                
                    r.treePos = p1.sectionPos;
                    r.dim = p1.dim;
                }
            });
    }

    for (let i=0; i<res.nPublics; i++) {
        if (res.publicsCode[i]) {
            setCodeDimensions(res.publicsCode[i], res, 1, stark);
        }
    }

    for (let i=0; i < res.nStages; i++) {
        setCodeDimensions(res["step" + (i + 2) + "prev"], res, 1, stark);
    }
   
    setCodeDimensions(res.stepQprev, res, 1, stark);
    setCodeDimensions(res.stepQ2ns, res, 1, stark);
    setCodeDimensions(res.verifierCode, res, stark ? 3 : 1, stark);
    if(stark) {
        setCodeDimensions(res.stepEv2ns, res, 1, stark);
	    setCodeDimensions(res.verifierQueryCode, res, 1, stark);
    }

    function fixProverCode(code, dom) {
        const ctx = {};
        ctx.expMap = [{}, {}];
        ctx.code = code;
        ctx.dom = dom;

        iterateCode(code, fixRef, ctx)

        function fixRef(r, ctx) {
            switch (r.type) {
                case "cm":
                    if (ctx.dom == "n") {
                        r.p = res.cm_n[r.id];
                    } else if (ctx.dom == "2ns") {
                        r.p = res.cm_2ns[r.id];
                    } else {
                        throw ("Invalid domain", ctx.dom);
                    }
                    break;
                case "exp":
                    const idx = res.imExpsList.indexOf(r.id);
                    if (idx >= 0) {
                        r.type = "cm";
                        r.id = res.imExp2cm[res.imExpsList[idx]];
                    } else if ((typeof tmpExps[r.id] != "undefined")&&(ctx.dom == "n")) {
                        r.type = "tmpExp";
                        r.dim = getExpDim(pil, r.id, stark);
                        r.id = tmpExps[r.id];
                    } else {
                        const p = r.prime ? 1 : 0;
                        if (typeof ctx.expMap[p][r.id] === "undefined") {
                            ctx.expMap[p][r.id] = ctx.code.tmpUsed ++;
                        }
                        r.type= "tmp";
                        r.expId = r.id;
                        r.id= ctx.expMap[p][r.id];
                    }
                    break;
                case "const":
                case "number":
                case "challenge":
                case "public":
                case "tmp":
                case "Zi":
                case "eval":
                case "x":
                case "q":
                case "tmpExp":
                    break;
                case "xDivXSubXi":
                case "f":
                    if(!stark) throw new Error("Invalid reference type" + r.type);
                    break;
                default:
                    throw new Error("Invalid reference type " + r.type);
            }
        }
    }

}

/*
    Set the positions of all the secitions puting
*/
function mapSections(res, stark) {
    Object.keys(res.mapSections).forEach((s) => {
        let p = 0;
        const dims = stark ? [1,3] : [1];
        for (let e of dims) {
            for (let i=0; i<res.varPolMap.length; i++) {
                const pp = res.varPolMap[i];
                if ((pp.section == s) && (pp.dim==e)) {
                    pp.sectionPos = p;
                    p += e;
                }
            }
            if(stark) {
                if (e==1) res.mapSectionsN1[s] = p;
                if (e==3) res.mapSectionsN[s] = p;
            } else {
                res.mapSectionsN[s] = p;
            } 
        }
        if(stark) res.mapSectionsN3[s] = (res.mapSectionsN[s] - res.mapSectionsN1[s] ) / 3;
    });
}

function getExpDim(pil, expId, stark) {

    return _getExpDim(pil.expressions[expId]);

    function _getExpDim(exp) {
        if(typeof(exp.dimMap) !== "undefined") return exp.dimMap; 
        switch (exp.op) {
            case "add":
            case "sub":
            case "mul":
            case "muladd":
            case "neg":
                let md = 1;
                for (let i=0; i<exp.values.length; i++) {
                    const d = _getExpDim(exp.values[i]);
                    if (d>md) md=d;
                }
                return md;
            case "cm": return pil.cmDims[exp.id];
            case "exp":
                exp.dimMap = _getExpDim(pil.expressions[exp.id]);
                return exp.dimMap;
            case "q": return _getExpDim(pil.expressions[pil.q2exp[exp.id]]);
            case "const":
            case "number":
            case "public": 
            case "x": 
                return 1;
            case "challenge":
            case "eval":
                if(stark) {
                    return 3;
                } else {
                    return 1;
                }
            case "xDivXSubXi":
                if(stark) return 3;
                throw new Error("Exp op not defined: " + exp.op);
            default: throw new Error("Exp op not defined: " + exp.op);
        }
    }
}

function setCodeDimensions(code, pilInfo, dimX, stark) {
    const tmpDim = [];

    _setCodeDimensions(code.first);


    function _setCodeDimensions(code) {

        for (let i=0; i<code.length; i++) {
            let newDim;
            switch (code[i].op) {
                case 'add': newDim = Math.max(getDim(code[i].src[0]), getDim(code[i].src[1])); break;
                case 'sub': newDim = Math.max(getDim(code[i].src[0]), getDim(code[i].src[1])); break;
                case 'mul': newDim = Math.max(getDim(code[i].src[0]), getDim(code[i].src[1])); break;
                case 'muladd': newDim = Math.max(getDim(code[i].src[0]), getDim(code[i].src[1]), getDim(code[i].src[2])); break;
                case 'copy': newDim = getDim(code[i].src[0]); break;
                default: throw new Error("Invalid op:"+ code[i].op);
            }
            setDim(code[i].dest, newDim);
        }


        function getDim(r) {
            let d;
            switch (r.type) {
                case "tmp": d=tmpDim[r.id]; break;
		        case "tree1":
                case "tree2": 
                case "tree3": 
                case "treeQ": 
                    if(stark) {
                        d=r.dim; 
                        break;
                    }
                    throw new Error("Invalid reference type get: " + r.type);
                case "tmpExp": d=r.dim; break;
                case "cm": 
                    if(stark) {
                        d=pilInfo.varPolMap[pilInfo.cm_2ns[r.id]].dim; break;
                    } else {
                        d=1;
                    }
                    break;
                case "q": {
                    if(stark) {
                        d=pilInfo.varPolMap[pilInfo.cm_2ns[r.id]].dim;
                    } else {
                        throw new Error("Invalid reference type: " + r.type);
                    }
                    break;
                }
                case "x": d=dimX; break;
                case "const": 
                case "number": 
                case "public": 
                case "Zi": 
                    d=1; 
                    break;
                case "eval": 
                case "challenge": 
                case "Z":
                    d=stark ? 3 : 1; 
                    break;
                case "xDivXSubXi": 
                    if(stark) {
                        d=dimX; 
                        break;
                    } else {
                        throw new Error("Invalid reference type: " + r.type);
                    }
                default: throw new Error("Invalid reference type: " + r.type);
            }
            if (!d) {
                throw new Error("Invalid dim");
            }
            r.dim = d;
            return d;
        }

        function setDim(r, dim) {
            switch (r.type) {
                case "tmp": tmpDim[r.id] = dim; r.dim=dim; return;
                case "exp":
                case "cm":
                case "tmpExp":
                case "q": 
                    r.dim=dim; return;
                case "f": 
                    if(!stark) throw new Error("Invalid reference type set: " + r.type);
                    r.dim=dim; return;
                default: throw new Error("Invalid reference type set: " + r.type);
            }
        }
    }

}
