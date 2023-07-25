const compileCode_parser = require("./compileCode_parser.js")
const compileCode_42ns = require("./compileCode_42ns.js")

module.exports = function buildCHelpers(fflonkInfo, config = {}) {

    const extendBits = Math.ceil(Math.log2(fflonkInfo.qDeg + 1));

    const nBits = fflonkInfo.pilPower;
    const nBitsExt = fflonkInfo.pilPower + extendBits + fflonkInfo.nBitsZK;
    
    const extendBitsTotal = (nBitsExt - nBits);

    const domainSize = 1 << nBits;
    const domainSizeExt = 1 << nBitsExt;

    const code = [];
    const multipleCodeFiles = config && config.multipleCodeFiles;
    const optcodes = config && config.optcodes;

    const bigIntsCode = [];
    const bigIntsFound = [];
    let vIndex = 0;

    const codePublics = [];
    for (let i = 0; i < fflonkInfo.nPublics; i++) {
        if (fflonkInfo.publicsCode[i]) {
            codePublics.push(compileCode(i, fflonkInfo.publicsCode[i].first, "n", true));
        }
    }

    code.push(
        [
        `void ${config.className}::publics_first(AltBn128::Engine &E, StepsParams &params, uint64_t i, uint64_t pub) {`,
        ...codePublics,
        `}`
        ].join("\n")
    );

    code.push(
        [
        `void ${config.className}::publics_i(AltBn128::Engine &E, StepsParams &params, uint64_t i, uint64_t pub) {`,
        ...codePublics,
        `}`
        ].join("\n")
    );

    code.push(
        [
        `void ${config.className}::publics_last(AltBn128::Engine &E, StepsParams &params, uint64_t i, uint64_t pub) {`,
        ...codePublics,
        `}`
        ].join("\n")
    );

    let result = {};

    if (multipleCodeFiles) {
        result.publics = code.join("\n\n") + "\n";
        code.length = 0;
    }


    if (optcodes && multipleCodeFiles) {
        code.push(compileCode_parser(fflonkInfo, nBits, "step2prev_first", fflonkInfo.step2prev.first, "n"));
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
        code.push(compileCode_parser(fflonkInfo, nBits, "step3prev_first", fflonkInfo.step3prev.first, "n"));
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
        code.push(compileCode_parser(fflonkInfo, nBits, "step3_first", fflonkInfo.step3.first, "n"));
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
    code.push(compileCode("step42ns_first", fflonkInfo.step42ns.first, "2ns", false));
    code.push(compileCode("step42ns_i", fflonkInfo.step42ns.first, "2ns", false));
    code.push(compileCode("step42ns_last", fflonkInfo.step42ns.first, "2ns", false));

    if (multipleCodeFiles) {
        result.step42ns = code.join("\n\n") + "\n";
        result.constValues =  [
            `u_int64_t ${config.className}::getNumConstValues() { return ${vIndex}; }\n`,
            `void ${config.className}::setConstValues(AltBn128::Engine &E, StepsParams &params) {`,
            ...bigIntsCode,
            `}`
        ].join("\n");

        return result;
    }

    return code.join("\n\n");

    function compileCode(functionName, code, dom, ret = false) {
        const body = [];    

        const next = (dom == "n" ? 1 : (1 << extendBitsTotal)).toString();
        const N = ((dom == "n" ? domainSize : domainSizeExt)).toString();

        for (let j = 0; j < code.length; j++) {
            const src = [];
            const r = code[j];
            for (k = 0; k < r.src.length; k++) {
                src.push(getRef(r.src[k]));
            }
            let lexp = getLRef(r);
            switch (r.op) {
                case 'add': {
                    body.push(`     ${lexp} = E.fr.add(${src[0]}, ${src[1]});`)
                    break;
                }
                case 'sub': {
                    body.push(`     ${lexp} = E.fr.sub(${src[0]}, ${src[1]});`)
                    break;
                }
                case 'mul': {
                    body.push(`     ${lexp} = E.fr.mul(${src[0]}, ${src[1]});`)
                    break;
                }
                case 'copy': {
                    body.push(`     ${lexp} = ${src[0]};`);
                    break;
                }
                default: throw new Error("Invalid op:" + c[j].op);
            }


        }

        if (ret) {
            body.push(`     params.publicInputs[i] = ${getRef(code[code.length - 1].dest)};`);
        }

        let res;
        if (ret) {
            res = [
                `   if (pub == ${functionName}) {`,
                        ...body,
                `   }`
            ].join("\n");
        } else {
            res = [
                `void ${config.className}::${functionName}(AltBn128::Engine &E, StepsParams &params, uint64_t i) {`,
                ...body,
                `}`
            ].join("\n");
        }

        
        return res;

        function getRef(r) {
            switch (r.type) {
                case "tmp": return `tmp_${r.id}`;
                case "const": {
                    const next = dom === "n" ? 1 : (1 << extendBitsTotal);
                    const index = r.prime ? `((i + ${next})%${N})` : "i"
                    if (dom == "n") {
                        return `params.const_n[${r.id} + ${index} * ${fflonkInfo.nConstants}]`;
                    } else if (dom == "2ns") {
                        return `params.const_2ns[${r.id} + ${index} * ${fflonkInfo.nConstants}]`;
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
               
                case "number": {
                    if(bigIntsFound.findIndex(v => v === BigInt(r.value)) == -1) {
                        bigIntsFound.push(BigInt(r.value));
                        if(BigInt(r.value) >= BigInt(4294967296)) {
                            bigIntsCode.push(`     AltBn128::FrElement v${vIndex};`);
                            bigIntsCode.push(`     E.fr.fromString(v${vIndex}, "${BigInt(r.value).toString()}");`);
                            bigIntsCode.push(`     params.constValues[${vIndex}] = v${vIndex};`);
                        } else {
                            bigIntsCode.push(`     params.constValues[${vIndex}] = E.fr.set(${BigInt(r.value).toString()});`);
                        }
                        return `params.constValues[${vIndex++}]`;
                    } else {
                        return `params.constValues[${bigIntsFound.indexOf(BigInt(r.value))}]`;
                    }
                }
                case "public": return `params.publicInputs[${r.id}]`;
                case "challenge": return `params.challenges[${r.id}]`;
                case "eval": return `params.evals[${r.id}]`;
                case "x": {
                    if (dom == "n") {
                        return `params.x_n[i]`;
                    } else if (dom == "2ns") {
                        return `params.x_2ns[i]`;
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
                default: throw new Error("Invalid reference type get: " + r.type);
            }
        }

        function getLRef(r) {
            let eDst;
            switch (r.dest.type) {
                case "tmp": {
                    eDst = `AltBn128::FrElement tmp_${r.dest.id}`;
                    break;
                }
                case "q": {
                    if (dom == "n") {
                        throw new Error("Accessing q in domain n");
                    } else if (dom == "2ns") {
                        eDst = `params.q_2ns[i]`
                    } else {
                        throw new Error("Invalid dom");
                    }
                    break;
                }
                case "cm": {
                    if (dom == "n") {
                        eDst = evalMap(fflonkInfo.cm_n[r.dest.id], r.dest.prime)
                    } else if (dom == "2ns") {
                        eDst = evalMap(fflonkInfo.cm_2ns[r.dest.id], r.dest.prime)
                    } else {
                        throw new Error("Invalid dom");
                    }
                    break;
                }
                case "tmpExp": {
                    if (dom == "n") {
                        eDst = evalMap(fflonkInfo.tmpExp_n[r.dest.id], r.dest.prime)
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

            let p = fflonkInfo.varPolMap[polId];
            if (!p) {
                console.log("xx");
            }
            let offset = p.sectionPos;
            let index = prime ? `((i + ${next})%${N})` : "i";
            let size = fflonkInfo.mapSectionsN[p.section];
            return `params.${p.section}[${offset} + ${index}*${size}]`;
        }
    }

}
