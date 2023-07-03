const compileCode_parser = require("./compileCode_parser.js")
const compileCode_42ns = require("./compileCode_42ns.js")

module.exports = function buildCHelpers(zkey, fflonkInfo, config = {}) {

    const nBits = zkey.power;
    const extendBits = Math.ceil(Math.log2(fflonkInfo.qDeg + 1));
    const nBitsExt = zkey.power + extendBits;
    
    const N = 1 << nBits;
    const Next = 1 << nBitsExt;


    // ZK data
    const extendBitsZK = zkey.powerZK - zkey.power;
    const factorZK = (1 << extendBitsZK);

    fflonkInfo.mapOffsets = {};
    fflonkInfo.mapOffsets.cm1_n = 0;
    fflonkInfo.mapOffsets.cm2_n = fflonkInfo.mapOffsets.cm1_n +  N * factorZK * fflonkInfo.mapSectionsN.cm1_n;
    fflonkInfo.mapOffsets.cm3_n = fflonkInfo.mapOffsets.cm2_n +  N * factorZK * fflonkInfo.mapSectionsN.cm2_n;
    fflonkInfo.mapOffsets.tmpExp_n = fflonkInfo.mapOffsets.cm3_n +  N * factorZK * fflonkInfo.mapSectionsN.cm3_n;
    fflonkInfo.mapOffsets.cm1_2ns = fflonkInfo.mapOffsets.tmpExp_n +  N * factorZK * fflonkInfo.mapSectionsN.tmpExp_n;
    fflonkInfo.mapOffsets.cm2_2ns = fflonkInfo.mapOffsets.cm1_2ns +  Next * factorZK * fflonkInfo.mapSectionsN.cm1_2ns;
    fflonkInfo.mapOffsets.cm3_2ns = fflonkInfo.mapOffsets.cm2_2ns +  Next * factorZK * fflonkInfo.mapSectionsN.cm2_2ns;
    fflonkInfo.mapOffsets.q_2ns = fflonkInfo.mapOffsets.cm3_2ns +  Next * factorZK * fflonkInfo.mapSectionsN.cm3_2ns;
    fflonkInfo.mapTotalN = fflonkInfo.mapOffsets.q_2ns +  Next * factorZK * fflonkInfo.mapSectionsN.q_2ns;

    const code = [];
    const multipleCodeFiles = config && config.multipleCodeFiles;
    const optcodes = config && config.optcodes;

    const codePublics = [];
    for (let i = 0; i < fflonkInfo.nPublics; i++) {
        if (fflonkInfo.publicsCode[i]) {
            codePublics.push(compileCode(i, fflonkInfo.publicsCode[i].first, "n", true));
        }
    }

    code.push(
        [
        `AltBn128::FrElement ${config.className}::publics_first(AltBn128::Engine &E, StepsParams &params, uint64_t i, uint64_t pub) {`,
        ...codePublics,
        `}`
        ].join("\n")
    );

    code.push(
        [
        `AltBn128::FrElement ${config.className}::publics_i(AltBn128::Engine &E, StepsParams &params, uint64_t i, uint64_t pub) {`,
        ...codePublics,
        `}`
        ].join("\n")
    );

    code.push(
        [
        `AltBn128::FrElement ${config.className}::publics_last(AltBn128::Engine &E, StepsParams &params, uint64_t i, uint64_t pub) {`,
        ...codePublics,
        `}`
        ].join("\n")
    );

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
        result.publics = code.join("\n\n") + "\n";
        code.length = 0;
    }


    if (optcodes && multipleCodeFiles) {
        code.push(compileCode_parser(fflonkInfo, nBits, factorZK, "step2prev_first", fflonkInfo.step2prev.first, "n"));
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
        code.push(compileCode_parser(fflonkInfo, nBits, factorZK, "step3prev_first", fflonkInfo.step3prev.first, "n"));
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
        code.push(compileCode_parser(fflonkInfo, nBits, factorZK, "step3_first", fflonkInfo.step3.first, "n"));
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
        return result;
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
                    if(r.dest.type === "tmp") {
                        body.push(`     ${lexp} = ${src[0]};`);
                    } else {
                        body.push(`     E.fr.copy(${lexp}, ${src[0]});`)
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
               
                case "number": return `E.fr.set(${BigInt(r.value).toString()})`;
                case "public": return `params.publicInputs[${r.id}]`;
                case "challenge": return `params.challenges[${r.id}]`;
                case "eval": return `params.evals[${r.id}]`;
                case "x": {
                    if (dom == "n") {
                        return `(AltBn128::FrElement &)*params.x_n[i]`;
                    } else if (dom == "2ns") {
                        return `(AltBn128::FrElement &)*params.x_2ns[i]`;
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
                        eDst = `(AltBn128::FrElement &)(params.q_2ns[i])`
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
            let offset = fflonkInfo.mapOffsets[p.section];
            offset += p.sectionPos;
            let index = prime ? `((i + ${next})%${N})` : "i";
            let size = fflonkInfo.mapSectionsN[p.section];
            return `params.pols[${offset} + ${index}*${size}]`;
        }
    }

}