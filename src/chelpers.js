const compileCode_42ns = require("./compileCode_42ns.js")
const compileCode_52ns = require("./compileCode_52ns.js")

module.exports = async function buildCHelpers(starkInfo, config = {}) {

    const code = [];
    const multipleCodeFiles = config && config.multipleCodeFiles;
    const optcodes = config && config.optcodes;

    for (let i = 0; i < starkInfo.nPublics; i++) {
        if (starkInfo.publicsCode[i]) {
            code.push(compileCode("publics_" + i + "_first", starkInfo.publicsCode[i].first, "n", true));
            code.push(compileCode("publics_" + i + "_i", starkInfo.publicsCode[i].first, "n", true));
            code.push(compileCode("publics_" + i + "_last", starkInfo.publicsCode[i].first, "n", true));
        }
    }

    const pubTable = [];
    pubTable.push("publics = (")
    for (let i = 0; i < starkInfo.nPublics; i++) {
        const comma = i == 0 ? "     " : "     ,";
        if (starkInfo.publicsCode[i]) {
            pubTable.push(`${comma}(publics_${i}_first, publics_${i}_i,  publics_${i}_last)`);
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

    code.push(compileCode("step2prev_first", starkInfo.step2prev.first, "n"));
    code.push(compileCode("step2prev_i", starkInfo.step2prev.first, "n"));
    code.push(compileCode("step2prev_last", starkInfo.step2prev.first, "n"));

    if (multipleCodeFiles) {
        result.step2 = code.join("\n\n") + "\n";
        code.length = 0;
    }

    code.push(compileCode("step3prev_first", starkInfo.step3prev.first, "n"));
    code.push(compileCode("step3prev_i", starkInfo.step3prev.first, "n"));
    code.push(compileCode("step3prev_last", starkInfo.step3prev.first, "n"));

    if (multipleCodeFiles) {
        result.step3prev = code.join("\n\n") + "\n";
        code.length = 0;
    }

    code.push(compileCode("step3_first", starkInfo.step3.first, "n"));
    code.push(compileCode("step3_i", starkInfo.step3.first, "n"));
    code.push(compileCode("step3_last", starkInfo.step3.first, "n"));

    if (multipleCodeFiles) {
        result.step3 = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        code.push(compileCode_42ns(starkInfo, config, "step42ns_first", starkInfo.step42ns.first, "2ns"));
        result.step42ns_parser = code.join("\n\n") + "\n";
        code.length = 0;
    }

    code.push(compileCode("step42ns_first", starkInfo.step42ns.first, "2ns"));
    code.push(compileCode("step42ns_i", starkInfo.step42ns.first, "2ns"));
    code.push(compileCode("step42ns_last", starkInfo.step42ns.first, "2ns"));

    if (multipleCodeFiles) {
        result.step42ns = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        code.push(compileCode_52ns(starkInfo, config, "step52ns_first", starkInfo.step52ns.first, "2ns"));
        result.step52ns_parser = code.join("\n\n") + "\n";
        code.length = 0;
    }

    code.push(compileCode("step52ns_first", starkInfo.step52ns.first, "2ns"));
    code.push(compileCode("step52ns_i", starkInfo.step52ns.first, "2ns"));
    code.push(compileCode("step52ns_last", starkInfo.step52ns.first, "2ns"));

    if (multipleCodeFiles) {
        result.step52ns = code.join("\n\n") + "\n";
        return result;
    }

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
                    if (dom == "n") {
                        if (r.prime) {
                            return ` params.pConstPols->getElement(${r.id},(i+1)%${N})`;
                        } else {
                            return ` params.pConstPols->getElement(${r.id},i)`;
                        }
                    } else if (dom == "2ns") {
                        if (r.prime) {
                            return `params.pConstPols2ns->getElement(${r.id},(i+${next})%${N})`;
                        } else {
                            return `params.pConstPols2ns->getElement(${r.id},i)`;
                        }
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
                case "tmpExp": {
                    if (dom == "n") {
                        return evalMap(starkInfo.tmpExp_n[r.id], r.prime)
                    } else if (dom == "2ns") {
                        throw new Error("Invalid dom");
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
                case "cm": {
                    if (dom == "n") {
                        return evalMap(starkInfo.cm_n[r.id], r.prime)
                    } else if (dom == "2ns") {
                        return evalMap(starkInfo.cm_2ns[r.id], r.prime)
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
                case "q": {
                    if (dom == "n") {
                        throw new Error("Accessing q in domain n");
                    } else if (dom == "2ns") {
                        return evalMap(starkInfo.qs[r.id], r.prime)
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
                    } else if (dom == "2ns") {
                        return `(Goldilocks::Element &)*params.x_2ns[i]`;
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
                    } else if (dom == "2ns") {
                        eDst = `(Goldilocks3::Element &)(params.q_2ns[i * 3])`
                    } else {
                        throw new Error("Invalid dom");
                    }
                    break;
                }
                case "cm": {
                    if (dom == "n") {
                        eDst = evalMap(starkInfo.cm_n[r.dest.id], r.dest.prime)
                    } else if (dom == "2ns") {
                        eDst = evalMap(starkInfo.cm_2ns[r.dest.id], r.dest.prime)
                    } else {
                        throw new Error("Invalid dom");
                    }
                    break;
                }
                case "tmpExp": {
                    if (dom == "n") {
                        eDst = evalMap(starkInfo.tmpExp_n[r.dest.id], r.dest.prime)
                    } else if (dom == "2ns") {
                        throw new Error("Invalid dom");
                    } else {
                        throw new Error("Invalid dom");
                    }
                    break;
                }
                case "f": {
                    if (dom == "n") {
                        throw new Error("Accessing q in domain n");
                    } else if (dom == "2ns") {
                        eDst = `(Goldilocks3::Element &)(params.f_2ns[i * 3])`
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
                    break;
                default: throw new Error("Invalid reference type set: " + r.dest.type);
            }
            return eDst;
        }

        function evalMap(polId, prime) {
            let p = starkInfo.varPolMap[polId];
            if (!p) {
                console.log("xx");
            }
            let offset = starkInfo.mapOffsets[p.section];
            offset += p.sectionPos;
            let size = starkInfo.mapSectionsN[p.section];
            if (p.dim == 1) {
                if (prime) {
                    return `params.pols[${offset} + ((i + ${next})%${N})*${size}]`;
                } else {
                    return `params.pols[${offset} + i*${size}]`;
                }
            } else if (p.dim == 3) {
                if (prime) {
                    return `(Goldilocks3::Element &)(params.pols[${offset} + ((i + ${next})%${N})*${size}])`;
                } else {
                    return `(Goldilocks3::Element &)(params.pols[${offset} + i*${size}])`;
                }
            } else {
                throw new Error("invalid dim");
            }
        }

    }

}