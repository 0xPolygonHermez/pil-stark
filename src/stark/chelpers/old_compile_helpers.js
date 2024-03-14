module.exports.compileCode = function compileCode(functionName, starkInfo, code, dom, ret) {
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
                    body.push(`      Goldilocks::add(${lexp}, ${src[0]}, ${src[1]});`)
                } else if (r.dest.dim == 3) {
                    if (((r.src[0].dim == 1) || r.src[1].dim == 3)) {
                        body.push(`      Goldilocks3::add(${lexp}, ${src[0]}, ${src[1]});`)
                    } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                        body.push(`      Goldilocks3::add(${lexp}, ${src[1]}, ${src[0]});`)
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
                    body.push(`      Goldilocks::sub(${lexp}, ${src[0]}, ${src[1]});`)
                } else if (r.dest.dim == 3) {
                    if (((r.src[0].dim == 1) || r.src[1].dim == 3)) {
                        body.push(`      Goldilocks3::sub(${lexp}, ${src[0]}, ${src[1]});`)
                    } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                        body.push(`      Goldilocks3::sub(${lexp}, ${src[0]}, ${src[1]});`)
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
                    body.push(`      Goldilocks::mul(${lexp}, ${src[0]}, ${src[1]});`)
                } else if (r.dest.dim == 3) {
                    if (((r.src[0].dim == 1) || r.src[1].dim == 3)) {
                        body.push(`      Goldilocks3::mul(${lexp}, ${src[0]}, ${src[1]});`)
                    } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                        body.push(`      Goldilocks3::mul(${lexp}, ${src[1]}, ${src[0]});`)
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
                    body.push(`      Goldilocks::copy(${lexp}, ${src[0]});`)
                } else if (r.dest.dim == 3) {
                    if (r.src[0].dim == 1) {
                        body.push(`      Goldilocks3::copy(${lexp}, ${src[0]});`)
                    } else if (r.src[0].dim == 3) {
                        body.push(`      Goldilocks3::copy(${lexp}, ${src[0]});`)
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
            `#include "chelpers_steps.hpp"\n`,
            `Goldilocks::Element ${functionName}(StepsParams &params, uint64_t N) {`,
            "#pragma omp parallel for",
            "   for (uint64_t i = 0; i < N; i++) {",
            `${body.join('\n')}`,
            `   }`,
            `}`
        ].join("\n");
    } else {
        res = [
            `#include "chelpers_steps.hpp"\n`,
            `void ${functionName}(StepsParams &params, uint64_t N) {`,
            "#pragma omp parallel for",
            "   for (uint64_t i = 0; i < N; i++) {",
            `${body.join('\n')}`,
            `   }`,
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
                    body.push(`      Goldilocks::Element tmp_${r.dest.id};`);
                } else if (r.dest.dim == 3) {
                    body.push(`      Goldilocks3::Element tmp_${r.dest.id};`);
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