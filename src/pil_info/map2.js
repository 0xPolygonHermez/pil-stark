
const {iterateCode} = require("./codegen.js");

module.exports = function map(res, pil, N, Next) {
    res.varPolMap = [];
    function addPol(polType) {
        res.varPolMap.push(polType);
        return res.varPolMap.length-1;
    }

    res.cm_n  = [];
    res.tmpExp_n = [];
    res.q_n = [];
    res.mapSections = {
        cm1_n: [],
        cm2_n:[],
        cm3_n:[],
        cm4_n:[],
        tmpExp_n:[],
        q_n:[],
    }
    res.mapSectionsN = {}    // Number of pols of base field i section
    res.exp2pol = {};

    const tmpExps = {};

    pil.cmDims = [];
    for (let i=0; i<res.nCm1; i++) {
        const pp_n = addPol({
            section: "cm1_n",
            dim:1
        });
        res.cm_n.push(pp_n);
        res.mapSections.cm1_n.push(pp_n);
        pil.cmDims[i] = 1;
    }

    for (let i=0; i<res.puCtx.length; i++) {
        const dim = Math.max(getExpDim(pil, res.puCtx[i].fExpId), getExpDim(pil, res.puCtx[i].tExpId));
        const pph1_n = addPol({
            section: "cm2_n",
            dim:dim
        });
        res.cm_n.push(pph1_n);
        res.mapSections.cm2_n.push(pph1_n);
        pil.cmDims[res.nCm1 + i*2] = dim;
        const pph2_n = addPol({
            section: "cm2_n",
            dim:dim
        });
        res.cm_n.push(pph2_n);
        res.mapSections.cm2_n.push(pph2_n);
        pil.cmDims[res.nCm1 + i*2+1] = dim;

        if (! res.imExps[res.puCtx[i].fExpId]) {
            if ( typeof tmpExps[res.puCtx[i].fExpId] === "undefined") {
                tmpExps[res.puCtx[i].fExpId] = res.tmpExp_n.length;
                const pptmpExp_n = addPol({
                    section: "tmpExp_n",
                    dim:dim
                });
                res.tmpExp_n.push(pptmpExp_n);
                res.mapSections.tmpExp_n.push(pptmpExp_n);
                res.exp2pol[res.puCtx[i].fExpId] = pptmpExp_n;
            }
        }
        if (! res.imExps[res.puCtx[i].tExpId]) {
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
        const ppz_n = addPol({
            section: "cm3_n",
            dim:1
        });
        res.cm_n.push(ppz_n);
        res.mapSections.cm3_n.push(ppz_n);
        pil.cmDims[res.nCm1 + res.nCm2 + i] = 1;

        if (! res.imExps[o.numId]) {
            if ( typeof tmpExps[o.numId] === "undefined") {
                tmpExps[o.numId] = res.tmpExp_n.length;
                const ppNum_n = addPol({
                    section: "tmpExp_n",
                    dim:1
                });
                res.tmpExp_n.push(ppNum_n);
                res.mapSections.tmpExp_n.push(ppNum_n);
                res.exp2pol[o.numId] = ppNum_n;
            }
        }
        if (! res.imExps[o.denId]) {
            if ( typeof tmpExps[o.denId] === "undefined") {
                tmpExps[o.denId] = res.tmpExp_n.length;
                const ppDen_n = addPol({
                    section: "tmpExp_n",
                    dim:1
                });
                res.tmpExp_n.push(ppDen_n);
                res.mapSections.tmpExp_n.push(ppDen_n);
                res.exp2pol[o.denId] = ppDen_n;
            }
        }
    }

    for (let i=0; i<res.imExpsList.length; i++) {
        const dim = getExpDim(pil, res.imExpsList[i]);
        const ppz_n = addPol({
            section: "cm3_n",
            dim:dim
        });

        res.cm_n.push(ppz_n);
        res.mapSections.cm3_n.push(ppz_n);
        pil.cmDims[res.nCm1 + res.nCm2 + res.puCtx.length + res.peCtx.length + res.ciCtx.length + i] = dim;
        res.exp2pol[res.imExpsList[i]] = ppz_n;
    }



    res.qDim = getExpDim(pil, res.cExp);
    for (let i=0; i<res.qDeg; i++) {
        const ppz_n = addPol({
            section: "cm4_n",
            dim:1
        });
        res.cm_n.push(ppz_n);
        res.mapSections.cm4_n.push(ppz_n);
        pil.cmDims[res.nCm1 + res.nCm2 + res.nCm3 + i] = res.qDim;
    }

    const ppq_n = addPol({
        section: "q_n",
        dim:res.qDim
    });
    res.q_n.push(ppq_n);

    mapSections(res);
    res.mapOffsets = {};
    res.mapOffsets.cm1_n = 0;
    res.mapOffsets.cm2_n = res.mapOffsets.cm1_n +  N * res.mapSectionsN.cm1_n;
    res.mapOffsets.cm3_n = res.mapOffsets.cm2_n +  N * res.mapSectionsN.cm2_n;
    res.mapOffsets.cm4_n = res.mapOffsets.cm3_n +  N * res.mapSectionsN.cm3_n;
    res.mapOffsets.tmpExp_n = res.mapOffsets.cm4_n +  N * res.mapSectionsN.cm4_n;
    res.mapOffsets.q_n = res.mapOffsets.tmpExp_n;
    res.mapTotalN = res.mapOffsets.q_n;

    res.mapDeg = {};
    res.mapDeg.cm1_n = N;
    res.mapDeg.cm2_n = N;
    res.mapDeg.cm3_n = N;
    res.mapDeg.cm4_n = N;
    res.mapDeg.tmpExp_n = N;
    res.mapDeg.q_n = N;

    for (let i=0; i< res.publicsCode.length; i++) {
        fixProverCode(res.publicsCode[i], "n");
    }

    if(res.step2prev) {
        fixProverCode(res.step2prev, "n");
    }

    if(res.step3prev) {
        fixProverCode(res.step3prev, "n");
    }

    if(res.step3) {
        fixProverCode(res.step3, "n");
    }

    if(res.step42ns) {
        fixProverCode(res.step42ns, "n");
    }

    for (let i=0; i<res.nPublics; i++) {
        if (res.publicsCode[i]) {
            setCodeDimensions(res.publicsCode[i], res, 1);
        }
    }

    if(res.step2prev) {
        setCodeDimensions(res.step2prev, res, 1);
    }

    if(res.step3prev) {
        setCodeDimensions(res.step3prev,res, 1);
    }

    if(res.step3) {
        setCodeDimensions(res.step3, res, 1);
    }

    if(res.step42ns) {
        setCodeDimensions(res.step42ns, res, 1);
    }

    if(res.verifierCode) {
        setCodeDimensions(res.verifierCode, res, 1);
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
                    r.p = res.cm_n[r.id];
                    break;
                case "exp":
                    const idx = res.imExpsList.indexOf(r.id);
                    if (idx >= 0) {
                        r.type = "cm";
                        r.id = res.imExp2cm[res.imExpsList[idx]];
                    } else if ((typeof tmpExps[r.id] != "undefined")&&(ctx.dom == "n")) {
                        r.type = "tmpExp";
                        r.dim = getExpDim(pil, r.id);
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
        for (let i=0; i<res.varPolMap.length; i++) {
            const pp = res.varPolMap[i];
            if (pp.section == s) {
                pp.sectionPos = p;
                p += 1;
            }
        }
        res.mapSectionsN[s] = p;
    });
}

function getExpDim(pil, expId) {

    return _getExpDim(pil.expressions[expId]);

    function _getExpDim(exp) {
        switch (exp.op) {
            case "add":
            case "sub":
            case "mul":
            case "muladd":
            case "addc":
            case "mulc":
            case "neg":
                let md = 1;
                for (let i=0; i<exp.values.length; i++) {
                    const d = _getExpDim(exp.values[i]);
                    if (d>md) md=d;
                }
                return md;
            case "cm": return pil.cmDims[exp.id];
            case "const": return 1;
            case "exp": return _getExpDim(pil.expressions[exp.id]);
            case "q": return _getExpDim(pil.expressions[pil.q2exp[exp.id]]);
            case "number": return 1;
            case "public": return 1;
            case "challenge": return 1;
            case "eval": return 1;
            case "x": return 1;
            default: throw new Error("Exp op not defined: " + exp.op);
        }
    }
}

function setCodeDimensions(code, starkInfo, dimX) {
    const tmpDim = [];

    _setCodeDimensions(code.first);
    _setCodeDimensions(code.i);
    _setCodeDimensions(code.last);


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
                case "tmpExp": d=r.dim; break;
                case "cm": d=1; break;
                case "q": d=1; break;
                case "const": d=1; break;
                case "eval": d=1; break;
                case "number": d=1; break;
                case "public": d=1; break;
                case "challenge": d=1; break;
                case "x": d=dimX; break;
                case "Z": d=1; break;
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



