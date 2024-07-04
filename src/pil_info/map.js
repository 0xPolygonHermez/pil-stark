
const {iterateCode} = require("./codegen.js");
const { getExpDim } = require("./helpers.js");

module.exports = function map(res, expressions) {
    res.varPolMap = [];
    function addPol(polType) {
        res.varPolMap.push(polType);
        return res.varPolMap.length-1;
    }

    res.cm_n  = [];
    res.cm_2ns  = [];
    res.tmpExp_n = [];
    res.q_2ns = [];
    res.f_2ns = [];
    res.mapSections = {
        cm1_n: [],
        cm1_2ns: [],
        cm2_n:[],
        cm2_2ns:[],
        cm3_n:[],
        cm3_2ns:[],
        cm4_n:[],
        cm4_2ns:[],
        tmpExp_n:[],
        q_2ns:[],
        f_2ns:[]
    }
    res.mapSectionsN1 = {}    // Number of pols of base field i section
    res.mapSectionsN3 = {}    // Number of pols of base field i section
    res.mapSectionsN = {}    // Number of pols of base field i section
    res.exp2pol = {};

    const tmpExps = {};

    let cmDims = [];
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
        cmDims[i] = 1;
    }

    for (let i=0; i<res.puCtx.length; i++) {
        const dim = Math.max(getExpDim(expressions, cmDims, res.puCtx[i].fExpId), getExpDim(expressions, cmDims, res.puCtx[i].tExpId));
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
        cmDims[res.nCm1 + i*2] = dim;
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
        cmDims[res.nCm1 + i*2+1] = dim;

        if (!res.imExpsList.find(m => m === res.puCtx[i].fExpId)) {
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
        if (!res.imExpsList.find(m => m === res.puCtx[i].tExpId)) {
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
        let e;
        if (i<res.puCtx.length) {
            o = res.puCtx[i];
        } else if (i<res.puCtx.length + res.peCtx.length) {
            o = res.peCtx[i-res.puCtx.length];
        } else {
            o = res.ciCtx[i-res.puCtx.length-res.peCtx.length];
        }
        const ppz_n = addPol({
            section: "cm3_n",
            dim:3
        });
        const ppz_2ns = addPol({
            section: "cm3_2ns",
            dim:3
        });
        res.cm_n.push(ppz_n);
        res.cm_2ns.push(ppz_2ns);
        res.mapSections.cm3_n.push(ppz_n);
        res.mapSections.cm3_2ns.push(ppz_2ns);
        cmDims[res.nCm1 + res.nCm2 + i] = 3;

        if (!res.imExpsList.find(m => m === o.numId)) {
            if ( typeof tmpExps[o.numId] === "undefined") {
                tmpExps[o.numId] = res.tmpExp_n.length;
                const ppNum_n = addPol({
                    section: "tmpExp_n",
                    dim:3
                });
                res.tmpExp_n.push(ppNum_n);
                res.mapSections.tmpExp_n.push(ppNum_n);
                res.exp2pol[o.numId] = ppNum_n;
            }
        }
        if (!res.imExpsList.find(m => m === o.denId)) {
            if ( typeof tmpExps[o.denId] === "undefined") {
                tmpExps[o.denId] = res.tmpExp_n.length;
                const ppDen_n = addPol({
                    section: "tmpExp_n",
                    dim:3
                });
                res.tmpExp_n.push(ppDen_n);
                res.mapSections.tmpExp_n.push(ppDen_n);
                res.exp2pol[o.denId] = ppDen_n;
            }
        }
    }

    for (let i=0; i<res.imExpsList.length; i++) {
        const dim = getExpDim(expressions, cmDims, res.imExpsList[i]);
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
        cmDims[res.nCm1 + res.nCm2 + res.puCtx.length + res.peCtx.length + res.ciCtx.length + i] = dim;
        res.exp2pol[res.imExpsList[i]] = ppz_n;
    }

    res.qDim = getExpDim(expressions, cmDims, res.cExpId);
    for (let i=0; i<res.qDeg; i++) {
        const ppz_n = addPol({
            section: "cm4_n",
            dim:res.qDim
        });
        const ppz_2ns = addPol({
            section: "cm4_2ns",
            dim:res.qDim
        });
        res.cm_n.push(ppz_n);
        res.cm_2ns.push(ppz_2ns);
        res.mapSections.cm4_n.push(ppz_n);
        res.mapSections.cm4_2ns.push(ppz_2ns);
        cmDims[res.nCm1 + res.nCm2 + res.nCm3 + i] = res.qDim;
    }

    const ppq_2ns = addPol({
        section: "q_2ns",
        dim:res.qDim
    });
    res.q_2ns.push(ppq_2ns);

    const ppf_2ns = addPol({
        section: "f_2ns",
        dim:3
    });
    res.f_2ns.push(ppf_2ns);

    mapSections(res);
    let N = 1 << res.starkStruct.nBits;
    let Next = 1 << res.starkStruct.nBitsExt;
    res.mapOffsets = {};
    res.mapOffsets.cm1_n = 0;
    res.mapOffsets.cm2_n = res.mapOffsets.cm1_n +  N * res.mapSectionsN.cm1_n;
    res.mapOffsets.cm3_n = res.mapOffsets.cm2_n +  N * res.mapSectionsN.cm2_n;
    res.mapOffsets.cm4_n = res.mapOffsets.cm3_n +  N * res.mapSectionsN.cm3_n;
    res.mapOffsets.cm1_2ns = res.mapOffsets.cm4_n +  N * res.mapSectionsN.cm4_n;
    res.mapOffsets.tmpExp_n = res.mapOffsets.cm1_2ns +  Next * res.mapSectionsN.cm1_2ns;
    res.mapOffsets.cm2_2ns = res.mapOffsets.tmpExp_n +  N * res.mapSectionsN.tmpExp_n;
    res.mapOffsets.cm3_2ns = res.mapOffsets.cm2_2ns +  Next * res.mapSectionsN.cm2_2ns;
    res.mapOffsets.cm4_2ns = res.mapOffsets.cm3_2ns +  Next * res.mapSectionsN.cm3_2ns;
    res.mapOffsets.q_2ns = res.mapOffsets.cm4_2ns +  Next * res.mapSectionsN.cm4_2ns;
    res.mapOffsets.f_2ns = res.mapOffsets.q_2ns +  Next * res.mapSectionsN.q_2ns;
    res.mapTotalN = res.mapOffsets.f_2ns +  Next * res.mapSectionsN.f_2ns;

    res.mapDeg = {};
    res.mapDeg.cm1_n = N;
    res.mapDeg.cm2_n = N;
    res.mapDeg.cm3_n = N;
    res.mapDeg.cm4_n = N;
    res.mapDeg.tmpExp_n = N;
    res.mapDeg.cm1_2ns = Next;
    res.mapDeg.cm2_2ns = Next;
    res.mapDeg.cm3_2ns = Next;
    res.mapDeg.cm4_2ns = Next;
    res.mapDeg.q_2ns = Next;
    res.mapDeg.f_2ns = Next;

    for (let i=0; i< res.publicsCode.length; i++) {
        fixProverCode(res.publicsCode[i], "n");
    }
    fixProverCode(res.step2prev, "n");
    fixProverCode(res.step3prev, "n");
    fixProverCode(res.step42ns, "2ns");
    fixProverCode(res.step52ns, "2ns");
    fixProverCode(res.verifierQueryCode, "2ns");

    iterateCode(res.verifierQueryCode, function fixRef(r, ctx) {
        if (r.type == "cm") {
            const p1 = res.varPolMap[res.cm_2ns[r.id]];
            switch(p1.section) {
                case "cm1_2ns": r.type = "tree1"; break;
                case "cm2_2ns": r.type = "tree2"; break;
                case "cm3_2ns": r.type = "tree3"; break;
                case "cm4_2ns": r.type = "tree4"; break;
                default: throw new Error("Invalid cm section");
            }
            r.treePos = p1.sectionPos;
            r.dim = p1.dim;
        }
    });

    for (let i=0; i<res.nPublics; i++) {
        if (res.publicsCode[i]) {
            setCodeDimensions(res.publicsCode[i], res, 1);
        }
    }

    setCodeDimensions(res.step2prev, res, 1);
    setCodeDimensions(res.step3prev,res, 1);
    setCodeDimensions(res.step42ns, res, 1);
    setCodeDimensions(res.step52ns, res, 1);
    setCodeDimensions(res.verifierCode, res, 3);
    setCodeDimensions(res.verifierQueryCode, res, 1);

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
                        r.dim = getExpDim(expressions, cmDims, r.id);
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
                case "xDivXSubXi":
                case "xDivXSubWXi":
                case "eval":
                case "x":
                case "q":
                case "f":
                case "tmpExp":
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
function mapSections(res) {
    Object.keys(res.mapSections).forEach((s) => {
        let p = 0;
        res.mapSectionsN1[s] = 0;
        res.mapSectionsN3[s] = 0
        for (let i=0; i<res.varPolMap.length; i++) {
            const pp = res.varPolMap[i];
            if(pp.section === s) {
                pp.sectionPos = p;
                if(pp.dim == 1) {
                    res.mapSectionsN1[s] += 1;
                    p += 1;
                } else {
                    res.mapSectionsN3[s] += 3;
                    p += 3;
                }
            }
        }
        res.mapSectionsN[s] = p;
    });
}

function setCodeDimensions(code, starkInfo, dimX) {
    const tmpDim = [];

    _setCodeDimensions(code.code);


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
                case "tree1": d=r.dim; break;
                case "tree2": d=r.dim; break;
                case "tree3": d=r.dim; break;
                case "tree4": d=r.dim; break;
                case "tmpExp": d=r.dim; break;
                case "cm": d=starkInfo.varPolMap[starkInfo.cm_2ns[r.id]].dim; break;
                case "q": d=starkInfo.varPolMap[starkInfo.qs[r.id]].dim; break;
                case "const": d=1; break;
                case "eval": d=3; break;
                case "number": d=1; break;
                case "public": d=1; break;
                case "challenge": d=3; break;
                case "xDivXSubXi": d=dimX; break;
                case "xDivXSubWXi": d=dimX; break;
                case "x": d=dimX; break;
                case "Z": d=3; break;
                case "Zi": d=1; break;
                default: throw new Error("Invalid reference type get: " + r.type);
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
                case "f":
                case "q": r.dim=dim; return;
                default: throw new Error("Invalid reference type set: " + r.type);
            }
        }
    }

}
