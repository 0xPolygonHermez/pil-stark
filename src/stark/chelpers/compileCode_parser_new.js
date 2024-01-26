const { assert } = require("chai");
const { getIdMaps, getAllOperations } = require("./helpers");

const operationsTypeMap = {
    "add": 0,
    "sub": 1,
    "mul": 2,
    "copy": 3,
}

const operationsMap = {
    "commit1": 1,
    "const": 2,
    "tmp1": 3,
    "public": 4,
    "x": 5,
    "number": 6,
    "commit3": 7,
    "tmp3": 8,
    "challenge": 9, 
    "eval": 10,
    "xDivXSubXi": 11,
    "xDivXSubWXi": 12, 
    "q": 13, 
    "f": 14,
}

module.exports = function compileCode_parser(starkInfo, config, functionName, code, dom) {

    var ops = [];
    var cont_ops = 0;
    var opsString = "{"
    var args = [];
    var c_args = 0;
    var cont_args = 0;
    var argsString = "{"

    var counters_ops = [];

    const nBits = starkInfo.starkStruct.nBits;
    const nBitsExt = starkInfo.starkStruct.nBitsExt;

    let step;

    if (functionName == "step3_first") {
        step = "3";
    } else if (functionName == "step3prev_first") {
        step = "3prev";
    } else if (functionName == "step2prev_first") {
        step = "2prev";
    } else if (functionName == "step42ns_first") {
        step = "42ns";
    } else if (functionName == "step52ns_first") {
        step = "52ns";
    } else throw new Error(`Invalid function name: ${functionName}`)

    const next = (dom == "n" ? 1 : 1 << (nBitsExt - nBits)).toString();
    const N = (dom == "n" ? (1 << nBits) : (1 << nBitsExt)).toString();

    // Evaluate max and min temporal variable for tmp_ and tmp3_
    let maxid = 100000;
    let ID1D = new Array(maxid).fill(-1);
    let ID3D = new Array(maxid).fill(-1);
    let { count1d, count3d } = getIdMaps(maxid, ID1D, ID3D, code);

    let isGeneric = true;
    let includesEnds = false;

    const operations = isGeneric ? getAllOperations() : [];
    
    for (let j = 0; j < code.length; j++) {
        const r = code[j];
        args.push(operationsTypeMap[r.op]);
        argsString += `${operationsTypeMap[r.op]}, `;
        ++cont_args;
        pushResArg(r, r.dest.type);
        ++cont_ops;
        
        let operation = getOperation(r);
        let opsIndex = operations.findIndex(op => 
            op.dest_type === operation.dest_type
            && op.src0_type === operation.src0_type
            && ((!op.hasOwnProperty("src1_type")) || (op.src1_type === operation.src1_type)));
        
            
        if (opsIndex === -1) {
            if(isGeneric) {
                throw new Error("Operation not considered: " + JSON.stringify(operation));
            } else {
                opsIndex = operations.length;
                operations.push(operation);
            }
        }

        ops.push(opsIndex);
        opsString += `${opsIndex}, `;

        if(!counters_ops[opsIndex]) counters_ops[opsIndex] = 0;
        counters_ops[opsIndex] += 1;
    }

    assert(cont_ops == ops.length);
    assert(cont_args == args.length);

    console.log("\n", functionName);
    console.log("NOPS: ", cont_ops, ops.length);
    console.log("NARGS: ", cont_args, args.length);
    console.log("DIFF OPERATIONS: ", operations.length);

    if(opsString !== "{") opsString = opsString.substring(0, opsString.lastIndexOf(","));
    opsString += "};"
    if(argsString !== "{") argsString = argsString.substring(0, argsString.lastIndexOf(","));
    argsString += "};"


    const parserCPP = [
        `void ${config.className}::parser_avx(StepsParams &params, uint64_t rowStart, uint64_t rowEnd, uint64_t nrowsBatch, uint64_t domainSize) {`,
        "    bool includesEnds = rowEnd == domainSize || rowStart == 0;",
        "#pragma omp parallel for",
        `    for (uint64_t i = rowStart; i < rowEnd; i+= nrowsBatch) {`,
        "        int i_args = 0;",
        "        __m256i tmp1[NTEMP1_];",
        "        Goldilocks3::Element_avx tmp3[NTEMP3_];",
    ];
    if(includesEnds) {
        parserCPP.push("        uint64_t offsetsDest[4], offsetsSrc0[4], offsetsSrc1[4];");
    } else {
        parserCPP.push("        uint64_t offsetDest, offsetSrc0, offsetSrc1;");
    }
    parserCPP.push(...[
        "        uint64_t numConstPols = params.pConstPols->numPols();",
        "        \n",
        "        for (int kk = 0; kk < NOPS_; ++kk) {",
        `            switch (op${step}[kk]) {`,
    ]);
       
    for(let i = 0; i < operations.length; i++) {
        const op = operations[i];
        if(op.dest_type === "q") {
            const q = [
                `            case ${i}: {`,
                "               Goldilocks::Element tmp_inv[3];",
                "               Goldilocks::Element ti0[4];",
                "               Goldilocks::Element ti1[4];",
                "               Goldilocks::Element ti2[4];",
                `               Goldilocks::store_avx(ti0, tmp3[args${step}[i_args]][0]);`,
                `               Goldilocks::store_avx(ti1, tmp3[args${step}[i_args]][1]);`,
                `               Goldilocks::store_avx(ti2, tmp3[args${step}[i_args]][2]);`,
                "               for (uint64_t j = 0; j < AVX_SIZE_; ++j) {",
                "                   tmp_inv[0] = ti0[j];",
                "                   tmp_inv[1] = ti1[j];",
                "                   tmp_inv[2] = ti2[j];",
                "                   Goldilocks3::mul((Goldilocks3::Element &)(params.q_2ns[(i + j) * 3]), params.zi.zhInv((i + j)),(Goldilocks3::Element &)tmp_inv);",
                "               }",
                "               i_args += 1;",
                "               break;",
                "           }",
            ].join("\n");
            parserCPP.push(q);
        } else {

            let operationDescription = `                // DEST: ${op.dest_type} - SRC0: ${op.src0_type}`;
            if(op.src1_type) {
                operationDescription += ` - SRC1: ${op.src1_type}`;
            }
            const operationCase = [
                `            case ${i}: {`,
                operationDescription,
            ];
            
            operationCase.push(writeOperation(op, includesEnds));

            operationCase.push(...[
                "                break;",
                "            }",
            ])
            parserCPP.push(operationCase.join("\n"));
        }
    }

    parserCPP.push(...[
        "              default: {",
        `                  std::cout << " Wrong operation in step${step}_first!" << std::endl;`,
        "                  exit(1);",
        "              }",
        "          }",
        "       }",
        `       if (i_args != NARGS_) std::cout << " " << i_args << " - " << NARGS_ << std::endl;`,
        "       assert(i_args == NARGS_);",
        "   }"
        ]);

    parserCPP.push("}");
       
    const parserHPP = [
        `#define NOPS_ ${cont_ops}`,
        `#define NARGS_ ${cont_args}`,
        `#define NTEMP1_ ${count1d}`,
        `#define NTEMP3_ ${count3d}`,
        "\n",
        `uint64_t op${step}[NOPS_] = ${opsString}`,
        "\n",
        `uint64_t args${step}[NARGS_] = ${argsString}`
    ];
    
    const parserCPPCode = parserCPP.join("\n");
    const parserHPPCode = parserHPP.join("\n");

    return {parserHPPCode, parserCPPCode};

    function writeOperation(operation, includesEnds = false) {
        let name = ["tmp1", "commit1"].includes(operation.dest_type) ? `Goldilocks::op` : `Goldilocks3::op`;
        if(["tmp3", "commit3"].includes(operation.dest_type) && operation.src1_type)  {
            if((!["tmp3", "commit3"].includes(operation.src0_type) || !["tmp3", "commit3"].includes(operation.src1_type))) {
                if(["public", "x", "commit1", "tmp1", "const"].includes(operation.src0_type)) name += "1";
                if(operation.src0_type === "number") name += "1c";
                if (["commit3", "tmp3"].includes(operation.src0_type)) name += "3";
                if(operation.src0_type === "challenge") name += "3c";
                if(["public", "x", "commit1", "tmp1", "const"].includes(operation.src1_type)) name += "1";
                if(operation.src1_type === "number") name += "1c";
                if (["commit3", "tmp3"].includes(operation.src1_type)) name += "3";
                if(operation.src1_type === "challenge") name += "3c";
            }
        }
        
        name += "_avx(";

        let offsetDest = "";
        let offsetSrc0 = "";
        let offsetSrc1 = "";

        let offsetSrc0Call = "";
        let offsetSrc1Call = "";
        
        name += `i_args, `;

        c_args = 1;

        name += writeType(operation.dest_type, includesEnds);

        if(["commit1", "commit3"].includes(operation.dest_type)) {
            let numPols = `args${step}[i_args + ${c_args+2}]`;
            if (operation.dest_prime && includesEnds) {
                    offsetDest = `                  offsetsDest[j] = args${step}[i_args + ${c_args}] + (((i + j) + args${step}[i_args + ${c_args+1}]) % domainSize) * ${numPols};`,
                    name += "offsetsDest, ";
            } else {
                name += `${numPols}, `;
            }
        }
        c_args += nArgs(operation.dest_type);
        name += "\n                    ";

        name += writeType(operation.src0_type, includesEnds);

        if(["commit1", "commit3", "const"].includes(operation.src0_type) && operation.src0_prime) {
            let numPols = operation.src0_type === "const" ? "numConstPols" : `args${step}[i_args + ${c_args+2}]`;
            if(includesEnds) {
                offsetSrc0 = `                  offsetsSrc0[j] = args${step}[i_args + ${c_args}] + (((i + j) + args${step}[i_args + ${c_args+1}]) % domainSize) * ${numPols};`;
                offsetSrc0Call = "offsetsSrc0, ";
            } else {
                offsetSrc0Call += `${numPols}, `;
            }
        } else if (operation.src0_type === "x") {
            offsetSrc0Call = `params.x_${dom}.offset(), `;
        }
        c_args += nArgs(operation.src0_type);
        name += "\n                    ";

        if(operation.src1_type) {
            name += writeType(operation.src1_type, includesEnds);

            if(["commit1", "commit3", "const"].includes(operation.src1_type) && operation.src1_prime) {
                let numPols = operation.src1_type === "const" ? "numConstPols" : `args${step}[i_args + ${c_args+2}]`;
                if(includesEnds) {
                    offsetSrc1 = `                  offsetsSrc1[j] = args${step}[i_args + ${c_args}] + (((i + j) + args${step}[i_args + ${c_args+1}]) % domainSize) * ${numPols};`;
                    offsetSrc1Call = "offsetsSrc1, ";
                } else {
                    offsetSrc1Call += `${numPols}, `;
                }
            } else if (operation.src1_type === "x") {
                offsetSrc1Call = `params.x_${dom}.offset(), `;
            }
            c_args += nArgs(operation.src1_type);
            name += "\n                    ";
        }

        
        name += offsetSrc0Call;
        name += offsetSrc1Call;
        name = name.substring(0, name.lastIndexOf(", ")) + "\n                );";
        
        const operationCall = [];

        if(includesEnds) {
            if(offsetDest !== "" || offsetSrc0 !== "" || offsetSrc1 !== "") {
                const offsetLoop = [ "               for (uint64_t j = 0; j < AVX_SIZE_; ++j) {"];
                if(offsetDest !== "") offsetLoop.push(offsetDest);
                if(offsetSrc0 !== "") offsetLoop.push(offsetSrc0);
                if(offsetSrc1 !== "") offsetLoop.push(offsetSrc1);
                offsetLoop.push("               }");
                operationCall.push(...offsetLoop);
            }
        }

        operationCall.push(...[
            `                ${name}`,
            `                i_args += ${c_args};`,
        ])
        
        return operationCall.join("\n").replace(/i_args \+ 0/, "i_args");
    }

    function writeType(type, includesEnds = false) {
        switch (type) {
            case "public":
                return `params.publicInputs[args${step}[i_args + ${c_args}]], `;
            case "tmp1":
                return `tmp1[args${step}[i_args + ${c_args}]], `; 
            case "tmp3":
                    return `tmp3[args${step}[i_args + ${c_args}]], `;
            case "commit1":
            case "commit3":
                if(includesEnds) {
                    return `&params.pols[0], `;
                } else {
                    return `&params.pols[args${step}[i_args + ${c_args}] + (i + args${step}[i_args + ${c_args+1}]) * args${step}[i_args + ${c_args+2}]], `;
                }
            case "const":
                let constPols = dom === "n" ? "&params.pConstPols" : `&params.pConstPols2ns`;
                if(includesEnds) {
                    return `${constPols}->getElement(0, 0), `;
                } else {
                    return `${constPols}->getElement(args${step}[i_args + ${c_args}], i), `;
                }
            case "challenge":
                return `(Goldilocks3::Element &)*params.challenges[args${step}[i_args + ${c_args}]], `;
            case "x":
                return `params.x_${dom}[i], `;
            case "number":
                return `Goldilocks::fromU64(args${step}[i_args + ${c_args}]), `;
            case "Zi": 
                return "params.zi.zhInv(i), ";
            case "q":
                "params.q_2ns[i * 3], ";
            case "f": 
                return "params.f_2ns[i * 3], ";
            case "eval":
                return `&evals_[args${step}[i_args + ${c_args}] * 3], `;
            case "xDivXSubXi": 
                return "params.xDivXSubXi[i], ";
            case "xDivXSubWXi":
                return "params.xDivXSubWXi[i], ";
            default:
                throw new Error("Invalid type: " + type);
        }
    }

    function nArgs(type) {
        switch (type) {
            case "x":
            case "Zi":
            case "q":
            case "xDivXSubXi":
            case "xDivXSubWXi":
            case "f":
                return 0; 
            case "public":            
            case "tmp1":
            case "tmp3":
            case "challenge":
            case "eval":
            case "number":
                return 1;
            case "const":
                return 2;
            case "commit1":
            case "commit3":
                return 3;  
            default:
                throw new Error("Invalid type: " + type);
        }
    }

    function getOperation(r) {
        const _op = {};
        _op.op = r.op;
        if(["cm", "tmpExp"].includes(r.dest.type)) {
            _op.dest_type = `commit${r.dest.dim}`;
        } else if(r.dest.type === "tmp") {
            _op.dest_type = `tmp${r.dest.dim}`;
        } else {
            _op.dest_type = r.dest.type;
        }
        _op.dest_prime = (r.dest.type !== "tmp" && r.dest.prime) || false;

        if(r.op !== "sub") {
            r.src.sort((a, b) => {
                let opA =  ["cm", "tmpExp"].includes(a.type) ? operationsMap[`commit${a.dim}`] : a.type === "tmp" ? operationsMap[`tmp${a.dim}`] : operationsMap[a.type];
                let opB = ["cm", "tmpExp"].includes(b.type) ? operationsMap[`commit${b.dim}`] : b.type === "tmp" ? operationsMap[`tmp${b.dim}`] : operationsMap[b.type];
                return opA - opB;
            });
        }

        for(let i = 0; i < r.src.length; i++) {
            pushSrcArg(r.src[i], r.src[i].type);
            if(["cm", "tmpExp"].includes(r.src[i].type)) {
                _op[`src${i}_type`] = `commit${r.src[i].dim}`;
            } else if(r.src[i].type === "tmp") {
                _op[`src${i}_type`] =  `tmp${r.src[i].dim}`;
            } else {
                _op[`src${i}_type`] = r.src[i].type;
            }
            _op[`src${i}_prime`] = (r.src[i].type !== "tmp" && r.src[i].prime) || false;
        }

        return _op;
    }

    function pushResArg(r, type) {
        let eDst;
        switch (type) {
            case "tmp": {
                if (r.dest.dim == 1) {
                    args.push(ID1D[r.dest.id]);
                    argsString += `${ID1D[r.dest.id]}, `;
                } else {
                    assert(r.dest.dim == 3);
                    args.push(ID3D[r.dest.id]);
                    argsString += `${ID3D[r.dest.id]}, `;
                }
                cont_args += 1;
                break;
            }
            case "q": {
                break;
            }
            case "cm": {
                if (dom == "n") {
                    eDst = evalMap_(starkInfo.cm_n[r.dest.id], r.dest.prime)
                } else if (dom == "2ns") {
                    eDst = evalMap_(starkInfo.cm_2ns[r.dest.id], r.dest.prime)
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            }
            case "tmpExp": {
                if (dom == "n") {
                    eDst = evalMap_(starkInfo.tmpExp_n[r.dest.id], r.dest.prime)
                } else if (dom == "2ns") {
                    throw new Error("Invalid dom");
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            }
            case "f": {
                break;
            }
            default: throw new Error("Invalid reference type set: " + r.dest.type);
        }
        return eDst;
    }


    function pushSrcArg(r, type) {
        switch (type) {
            case "tmp": {
                if (r.dim == 1) {
                    args.push(ID1D[r.id]);
                    argsString += `${ID1D[r.id]}, `;
                } else {
                    assert(r.dim == 3);
                    args.push(ID3D[r.id]);
                    argsString += `${ID3D[r.id]}, `;

                }
                cont_args += 1;
                break;
            }
            case "const": {
                let offset_prime = r.prime ? next : 0;

                args.push(r.id);
                args.push(offset_prime);

                argsString += `${r.id}, `;
                argsString += `${offset_prime}, `;
                
                cont_args += 2;
                break;
            }
            case "tmpExp": {
                if (dom == "n") {
                    evalMap_(starkInfo.tmpExp_n[r.id], r.prime)
                } else if (dom == "2ns") {
                    throw new Error("Invalid dom");
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            }
            case "cm": {
                if (dom == "n") {
                    evalMap_(starkInfo.cm_n[r.id], r.prime)
                } else if (dom == "2ns") {
                    evalMap_(starkInfo.cm_2ns[r.id], r.prime)
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            }
            case "q": {
                if (dom == "n") {
                    throw new Error("Accessing q in domain n");
                } else if (dom == "2ns") {
                    evalMap_(starkInfo.qs[r.id], r.prime)
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            }
            case "number": {
                args.push(`${BigInt(r.value).toString()}ULL`);
                argsString += `${BigInt(r.value).toString()}ULL, `;
                cont_args += 1;
                break;
            }
            case "public":
            case "challenge":
            case "eval": 
            {
                args.push(r.id);
                argsString += `${r.id}, `;
                cont_args += 1;
                break;
            }
        }
    }

    function evalMap_(polId, prime) {
        let p = starkInfo.varPolMap[polId];

        let offset = starkInfo.mapOffsets[p.section] + p.sectionPos;
        let offset_prime = prime ? next : 0;
        let size = starkInfo.mapSectionsN[p.section];

        args.push(Number(offset));
        args.push(Number(offset_prime));
        args.push(Number(size));

        argsString += `${offset}, `;
        argsString += `${offset_prime}, `;
        argsString += `${N}, `;
        
        cont_args += 3;
    }
}
