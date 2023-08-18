const compileCode_fri = require("./compileCode_fri.js")
const compileCode_parser = require("./compileCode_parser.js")
const compileCode_QPolynomial = require("./compileCode_Q.js")

module.exports = async function buildCHelpers(starkInfo, config = {}) {

    const code = [];
    const multipleCodeFiles = config && config.multipleCodeFiles;
    const optcodes = config && config.optcodes;

    for (let i = 0; i < starkInfo.nPublics; i++) {
        if (starkInfo.publicsCode[i]) {
            code.push(compileCode("publics_" + i + "_first", starkInfo.publicsCode[i].first, "n", true));
        }
    }

    const pubTable = [];
    pubTable.push("publics = (")
    for (let i = 0; i < starkInfo.nPublics; i++) {
        const comma = i == 0 ? "     " : "     ,";
        if (starkInfo.publicsCode[i]) {
            pubTable.push(`${comma}(publics_${i}_first, NULL, NULL)`);
        } else {
            pubTable.push(`${comma}(NULL,NULL,NULL)`);
        }
    }
    pubTable.push(");");

    let result = {};

    if (multipleCodeFiles) {
        result.public = pubTable.join("\n") + "\n";
    }
    else {
        code.push(pubTable.join("\n"));
    }

    for(let i = 0; i < Object.keys(starkInfo.code).length; ++i) {
        const name = Object.keys(starkInfo.code)[i];
        if(["qVerifier", "queryVerifier"].includes(name)) continue;
        const dom = ["Q", "fri"].includes(name) ? "ext" : "n";

        if (optcodes && multipleCodeFiles) {
            if(name === "Q") {
                code.push(compileCode_QPolynomial(starkInfo, `${name}_first`, starkInfo.code[name].first, dom));
            } else if (name === "fri") {
                code.push(compileCode_fri(starkInfo, `${name}_first`, starkInfo.code[name].first, dom));
            } else {
                code.push(compileCode_parser(starkInfo, `${name}_first`, starkInfo.code[name].first, dom));
            }
            result[`${name}_parser`]= code.join("\n\n") + "\n";
            code.length = 0;
        }

	    code.push(compileCode(`${name}_first`, starkInfo.code[name].first, dom));

        if (multipleCodeFiles) {
            result[name] = code.join("\n\n") + "\n";
            code.length = 0;
        }
    }

    if(multipleCodeFiles) return result;

    return code.join("\n\n");

    function compileCode(functionName, code, dom, ret) {
        const body = [];

        const nBits = starkInfo.starkStruct.nBits;
        const nBitsExt = starkInfo.starkStruct.nBitsExt;


        const next = (dom == "n" ? 1 : 1 << (nBitsExt - nBits)).toString();
        const N = (dom == "n" ? (1 << nBits) : (1 << nBitsExt)).toString();

        for (let j = 0; j < code.length; j++) {
            const src = [];
            const r = code[j];
            for (k = 0; k < r.src.length; k++) {
                src.push(getRef(r.src[k]));
            }
            let lexp = getLRef(r);
            switch (r.op) {
                case 'add': {
                    if (r.dest.dim == 1) {
                        if (((r.src[0].dim != 1) || r.src[1].dim != 1)) {
                            throw new Error("Invalid dimension")
                        }
                        body.push(`     Goldilocks::add(${lexp}, ${src[0]}, ${src[1]});`)
                    } else if (r.dest.dim == 3) {
                        if (((r.src[0].dim == 1) || r.src[1].dim == 3)) {
                            body.push(`     Goldilocks3::add(${lexp}, ${src[0]}, ${src[1]});`)
                        } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                            body.push(`     Goldilocks3::add(${lexp}, ${src[1]}, ${src[0]});`)
                        } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                            body.push(`     Goldilocks3::add(${lexp}, ${src[0]}, ${src[1]});`)
                        } else {
                            throw new Error("Invalid dimension")
                        }
                    } else {
                        throw new Error("Invalid dim");
                    }
                    break;
                }
                case 'sub': {
                    if (r.dest.dim == 1) {
                        if (((r.src[0].dim != 1) || r.src[1].dim != 1)) {
                            throw new Error("Invalid dimension")
                        }
                        body.push(`     Goldilocks::sub(${lexp}, ${src[0]}, ${src[1]});`)
                    } else if (r.dest.dim == 3) {
                        if (((r.src[0].dim == 1) || r.src[1].dim == 3)) {
                            body.push(`     Goldilocks3::sub(${lexp}, ${src[0]}, ${src[1]});`)
                        } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                            body.push(`     Goldilocks3::sub(${lexp}, ${src[0]}, ${src[1]});`)
                        } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                            body.push(`     Goldilocks3::sub(${lexp}, ${src[0]}, ${src[1]});`)
                        } else {
                            throw new Error("Invalid dimension")
                        }
                    } else {
                        throw new Error("Invalid dim");
                    }
                    break;
                }
                case 'mul': {
                    if (r.dest.dim == 1) {
                        if (((r.src[0].dim != 1) || r.src[1].dim != 1)) {
                            throw new Error("Invalid dimension")
                        }
                        body.push(`     Goldilocks::mul(${lexp}, ${src[0]}, ${src[1]});`)
                    } else if (r.dest.dim == 3) {
                        if (((r.src[0].dim == 1) || r.src[1].dim == 3)) {
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[0]}, ${src[1]});`)
                        } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[1]}, ${src[0]});`)
                        } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[0]}, ${src[1]});`)
                        } else {
                            throw new Error("Invalid dimension")
                        }
                    } else {
                        throw new Error("Invalid dim");
                    }
                    break;
                }
                case 'copy': {
                    if (r.dest.dim == 1) {
                        if (r.src[0].dim != 1) {
                            throw new Error("Invalid dimension")
                        }
                        body.push(`     Goldilocks::copy(${lexp}, ${src[0]});`)
                    } else if (r.dest.dim == 3) {
                        if (r.src[0].dim == 1) {
                            body.push(`     Goldilocks3::copy(${lexp}, ${src[0]});`)
                        } else if (r.src[0].dim == 3) {
                            body.push(`     Goldilocks3::copy(${lexp}, ${src[0]});`)
                        } else {
                            throw new Error("Invalid dimension")
                        }
                    } else {
                        throw new Error("Invalid dim");
                    }
                    break;
                }
                default: throw new Error("Invalid op:" + c[j].op);
            }


        }

        if (ret) {
            body.push(`     return ${getRef(code[code.length - 1].dest)};`);
        }

        let res;
        if (ret) {
            res = [
                `Goldilocks::Element ${config.className}::${functionName}(StepsParams &params, uint64_t i) {`,
                ...body,
                `}`
            ].join("\n");
        } else {
            res = [
                `void ${config.className}::${functionName}(StepsParams &params, uint64_t i) {`,
                ...body,
                `}`
            ].join("\n");
        }

        return res;

        function getRef(r) {
            switch (r.type) {
                case "tmp": return `tmp_${r.id}`;
                case "const": {
                    let ext = dom == "ext" ? next : 1;
                    let index = r.prime ? `(i+${ext})%${N}` : `i`;
                    if (["n", "ext"].includes(dom)) {
                        return ` params.pConstPols->getElement(${r.id},${index})`;
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
                case "cm": {
                    if (dom == "n") {
                        return evalMap(r.id, r.prime, false)
                    } else if (dom == "ext") {
                        return evalMap(r.id, r.prime, true)
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
                case "q": {
                    if (dom == "n") {
                        throw new Error("Accessing q in domain n");
                    } else if (dom == "ext") {
                        return evalMap(starkInfo.qs[r.id], r.prime, true)
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
                case "number": return `Goldilocks::fromU64(${BigInt(r.value).toString()}ULL)`;
                case "public": return `params.publicInputs[${r.id}]`;
                case "challenge": return `(Goldilocks3::Element &)*params.challenges[${r.id}]`;
                case "eval": return `(Goldilocks3::Element &)*params.evals[${r.id}]`;
                case "xDivXSubXi": return `(Goldilocks3::Element &)*params.xDivXSubXi[i]`;
                case "xDivXSubWXi": return `(Goldilocks3::Element &)*params.xDivXSubWXi[i]`;
                case "x": {
                    if (dom == "n") {
                        return `(Goldilocks::Element &)*params.x_n[i]`;
                    } else if (dom == "ext") {
                        return `(Goldilocks::Element &)*params.x_ext[i]`;
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
                case "Zi": return `params.zi.zhInv(i)`;
                default: throw new Error("Invalid reference type get: " + r.type);
            }
        }

        function getLRef(r) {
            let eDst;
            switch (r.dest.type) {
                case "tmp": {
                    if (r.dest.dim == 1) {
                        body.push(`     Goldilocks::Element tmp_${r.dest.id};`);
                    } else if (r.dest.dim == 3) {
                        body.push(`     Goldilocks3::Element tmp_${r.dest.id};`);
                    } else {
                        throw new Error("Invalid dim");
                    }
                    eDst = `tmp_${r.dest.id}`;
                    break;
                }
                case "q": {
                    if (dom == "n") {
                        throw new Error("Accessing q in domain n");
                    } else if (dom == "ext") {
                        eDst = `(Goldilocks3::Element &)(params.q_ext[i * 3])`
                    } else {
                        throw new Error("Invalid dom");
                    }
                    break;
                }
                case "cm": {
                    if (dom == "n") {
                        eDst = evalMap(r.dest.id, r.dest.prime, false)
                    } else if (dom == "ext") {
                        eDst = evalMap(r.dest.id, r.dest.prime, true)
                    } else {
                        throw new Error("Invalid dom");
                    }
                    break;
                }
                case "f": {
                    if (dom == "n") {
                        throw new Error("Accessing q in domain n");
                    } else if (dom == "ext") {
                        eDst = `(Goldilocks3::Element &)(params.f_ext[i * 3])`
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
                    break;
                default: throw new Error("Invalid reference type set: " + r.dest.type);
            }
            return eDst;
        }

        function evalMap(polId, prime, extend) {
            let p = starkInfo.cmPolsMap[polId];
            if (!p) {
                console.log("xx");
            }
            let stage = extend ? p.stage + "_n" : p.stage + "_ext";
            let offset = starkInfo.mapOffsets[stage];
            offset += p.stagePos;
            let size = starkInfo.mapSectionsN[p.stage];
            let index = prime ? `((i + ${next})%${N})` : "i";
            let pos = `${offset} + ${index} * ${size}`;
            if (p.dim == 1) {
                return `params.pols[${pos}]`;
            } else if (p.dim == 3) {
                return `(Goldilocks3::Element &)(params.pols[${pos}])`;
            } else {
                throw new Error("invalid dim");
            }
        }
    }
}
