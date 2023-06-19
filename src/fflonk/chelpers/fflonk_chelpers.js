const compileCode_parser = require("./compileCode_parser.js")
const compileCode_42ns = require("./compileCode_42ns.js")

module.exports = async function buildCHelpers(zkey, fflonkInfo, config = {}) {

    const code = [];
    const multipleCodeFiles = config && config.multipleCodeFiles;
    const optcodes = config && config.optcodes;

    for (let i = 0; i < fflonkInfo.nPublics; i++) {
        if (fflonkInfo.publicsCode[i]) {
            code.push(compileCode("publics_" + i + "_first", fflonkInfo.publicsCode[i].first, "n", true));
            code.push(compileCode("publics_" + i + "_i", fflonkInfo.publicsCode[i].first, "n", true));
            code.push(compileCode("publics_" + i + "_last", fflonkInfo.publicsCode[i].first, "n", true));
        }
    }

    const pubTable = [];
    pubTable.push("publics = (")
    for (let i = 0; i < fflonkInfo.nPublics; i++) {
        const comma = i == 0 ? "     " : "     ,";
        if (fflonkInfo.publicsCode[i]) {
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

    if (optcodes && multipleCodeFiles) {
        code.push(compileCode_parser(fflonkInfo, config, "step2prev_first", fflonkInfo.step2prev.first, "n"));
        result.step2prev_parser = code.join("\n\n") + "\n";
        code.length = 0;
    }

    code.push(compileCode("step2prev_first", fflonkInfo.step2prev.first, "n"));
    code.push(compileCode("step2prev_i", fflonkInfo.step2prev.first, "n"));
    code.push(compileCode("step2prev_last", fflonkInfo.step2prev.first, "n"));

    if (multipleCodeFiles) {
        result.step2 = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        code.push(compileCode_parser(fflonkInfo, config, "step3prev_first", fflonkInfo.step3prev.first, "n"));
        result.step3prev_parser = code.join("\n\n") + "\n";
        code.length = 0;
    }

    code.push(compileCode("step3prev_first", fflonkInfo.step3prev.first, "n"));
    code.push(compileCode("step3prev_i", fflonkInfo.step3prev.first, "n"));
    code.push(compileCode("step3prev_last", fflonkInfo.step3prev.first, "n"));

    if (multipleCodeFiles) {
        result.step3prev = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        code.push(compileCode_parser(fflonkInfo, config, "step3_first", fflonkInfo.step3.first, "n"));
        result.step3_parser = code.join("\n\n") + "\n";
        code.length = 0;
    }

    code.push(compileCode("step3_first", fflonkInfo.step3.first, "n"));
    code.push(compileCode("step3_i", fflonkInfo.step3.first, "n"));
    code.push(compileCode("step3_last", fflonkInfo.step3.first, "n"));

    if (multipleCodeFiles) {
        result.step3 = code.join("\n\n") + "\n";
        code.length = 0;
    }

    if (optcodes && multipleCodeFiles) {
        code.push(compileCode_42ns(fflonkInfo, "step42ns_first", fflonkInfo.step42ns.first, "2ns"));
        result.step42ns_parser = code.join("\n\n") + "\n";
        code.length = 0;
    }
    code.push(compileCode("step42ns_first", fflonkInfo.step42ns.first, "2ns"));
    code.push(compileCode("step42ns_i", fflonkInfo.step42ns.first, "2ns"));
    code.push(compileCode("step42ns_last", fflonkInfo.step42ns.first, "2ns"));

    if (multipleCodeFiles) {
        result.step42ns = code.join("\n\n") + "\n";
        code.length = 0;
    }

    return code.join("\n\n");

    function compileCode(functionName, code, dom, ret) {
        const body = [];

        const nBits = zkey.power;
        const extendBits = Math.ceil(Math.log2(fflonkInfo.qDeg + 1));
        const nBitsExt = zkey.power + extendBits;
        
        // ZK data
        const extendBitsZK = zkey.powerZK - zkey.power;
        const factorZK = (1 << extendBitsZK);
    


        const next = (dom == "n" ? 1 : (1 << extendBits) * factorZK).toString();
        const N = ((dom == "n" ? (1 << nBits) : (1 << nBitsExt)) * factorZK).toString();

        for (let j = 0; j < code.length; j++) {
            const src = [];
            const r = code[j];
            for (k = 0; k < r.src.length; k++) {
                src.push(getRef(r.src[k]));
            }
            let lexp = getLRef(r);
            //TODO: OPERATIONS ARE NOT GOLDILOCKS !!!
            switch (r.op) {
                case 'add': {
                    body.push(`     Goldilocks::add(${lexp}, ${src[0]}, ${src[1]});`)
                    break;
                }
                case 'sub': {
                    body.push(`     Goldilocks::sub(${lexp}, ${src[0]}, ${src[1]});`)
                    break;
                }
                case 'mul': {
                    body.push(`     Goldilocks::mul(${lexp}, ${src[0]}, ${src[1]});`)
                    break;
                }
                case 'copy': {
                    body.push(`     Goldilocks::copy(${lexp}, ${src[0]});`)
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

        // TODO: FIX
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
                        return evalMap(fflonkInfo.tmpExp_n[r.id], r.prime)
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
                case "cm": {
                    if (dom == "n") {
                        return evalMap(fflonkInfo.cm_n[r.id], r.prime)
                    } else if (dom == "2ns") {
                        return evalMap(fflonkInfo.cm_2ns[r.id], r.prime)
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
               
                case "number": return `Goldilocks::fromU64(${BigInt(r.value).toString()}ULL)`;
                case "public": return `params.publicInputs[${r.id}]`;
                case "challenge": return `params.challenges[${r.id}]`;
                case "eval": return `params.evals[${r.id}]`;
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
                    body.push(`     Goldilocks::Element tmp_${r.dest.id};`);
                    eDst = `tmp_${r.dest.id}`;
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
                    } else {
                        throw new Error("Invalid dom");
                    }
                    break;
                }
                default: throw new Error("Invalid reference type get: " + r.dest.type);
            }
            return eDst;
        }

        function evalMap(polId, prime) {

            const next = (dom == "n" ? 1 : (1 << extendBits) * factorZK).toString();
            const N = ((dom == "n" ? (1 << nBits) : (1 << nBitsExt)) * factorZK).toString();

            let p = fflonkInfo.varPolMap[polId];
            if (!p) {
                console.log("xx");
            }
            let offset = fflonkInfo.mapOffsets[p.section];
            offset += p.sectionPos;
            let index = prime ? `((i + ${next})%${N})` : "i";
            let size = ctx.fflonkInfo.mapSectionsN[p.section];
            //TODO: FIX
            return `params.pols.slice((${offset} + ${index}*${size})*${ctx.Fr.n8},(${offset} + ${index}*${size} + 1)*${ctx.Fr.n8})`;
        }

    }

}