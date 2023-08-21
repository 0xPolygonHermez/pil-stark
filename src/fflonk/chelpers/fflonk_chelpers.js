const compileCode_parser = require("./compileCode_parser.js")
const compileCode_QPolynomial = require("./compileCode_QPolynomial.js")

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
            codePublics.push(compileCode(i, fflonkInfo.publicsCode[i], "n", true));
        }
    }

    code.push(
        [
        `void PilFflonkSteps::publics(AltBn128::Engine &E, PilFflonkStepsParams &params, uint64_t i, uint64_t pub) {`,
        ...codePublics,
        `}`
        ].join("\n")
    );

    let result = {};

    if (multipleCodeFiles) {
        result.publics = code.join("\n\n") + "\n";
        code.length = 0;
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

    if(multipleCodeFiles) {
        result.constValues =  [
            `u_int64_t PilFflonkSteps::getNumConstValues() { return ${vIndex}; }\n`,
            `void PilFflonkSteps::setConstValues(AltBn128::Engine &E, PilFflonkStepsParams &params) {`,
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
                `void PilFflonkSteps::${functionName}(AltBn128::Engine &E, PilFflonkStepsParams &params, uint64_t i) {`,
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
                    } else if (dom == "ext") {
                        return `params.const_ext[${r.id} + ${index} * ${fflonkInfo.nConstants}]`;
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
                    } else if (dom == "ext") {
                        return `params.x_ext[i]`;
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
                    } else if (dom == "ext") {
                        eDst = `params.q_ext[i]`
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
                default: throw new Error("Invalid reference type get: " + r.dest.type);
            }
            return eDst;
        }

        function evalMap(polId, prime, extend) {

            let p = fflonkInfo.cmPolsMap[polId];
            if (!p) {
                console.log("xx");
            }
            let offset = p.stagePos;
            let index = prime ? `((i + ${next})%${N})` : "i";
            let size = fflonkInfo.mapSectionsN[p.stage];
            let stage = extend ? p.stage + "_n" : p.stage + "_ext";
            return `params.${stage}[${offset} + ${index}*${size}]`;
        }
    }

}
