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

module.exports = function compileCode_parser(starkInfo, config, code, dom, stage, executeBefore) {

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

    const next = (dom == "n" ? 1 : 1 << (nBitsExt - nBits)).toString();
    const N = (dom == "n" ? (1 << nBits) : (1 << nBitsExt)).toString();

    // Evaluate max and min temporal variable for tmp_ and tmp3_
    let maxid = 100000;
    let ID1D = new Array(maxid).fill(-1);
    let ID3D = new Array(maxid).fill(-1);
    let { count1d, count3d } = getIdMaps(maxid, ID1D, ID3D, code);

    let isGeneric = true;

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

    console.log("Number of operations: ", cont_ops, ops.length);
    console.log("Number of arguments: ", cont_args, args.length);
    console.log("Different operations types: ", operations.length);
    console.log("--------------------------------");

    if(opsString !== "{") opsString = opsString.substring(0, opsString.lastIndexOf(","));
    opsString += "};"
    if(argsString !== "{") argsString = argsString.substring(0, argsString.lastIndexOf(","));
    argsString += "};"


    const parserCPP = [
        `void ${config.className}::parser_avx(StepsParams &params, ParserParams &parserParams, uint64_t rowStart, uint64_t rowEnd, uint64_t nrowsBatch, bool const includesEnds) {`,
        "#pragma omp parallel for",
        `    for (uint64_t i = rowStart; i < rowEnd; i+= nrowsBatch) {`,
        "        int i_args = 0;",
        "        __m256i tmp1[parserParams.nTemp1];",
        "        Goldilocks3::Element_avx tmp3[parserParams.nTemp3];",
        "        uint64_t offsetDest, offsetSrc0, offsetSrc1;",
        "        uint64_t numConstPols = params.pConstPols->numPols();",
        "        \n",
        "        for (int kk = 0; kk < parserParams.nOps; ++kk) {",
        `            switch (parserParams.ops[kk]) {`,
    ];
       
    for(let i = 0; i < operations.length; i++) {
        const op = operations[i];
        if(op.dest_type === "q") {
            const q = [
                `            case ${i}: {`,
                "               Goldilocks::Element tmp_inv[3];",
                "               Goldilocks::Element ti0[4];",
                "               Goldilocks::Element ti1[4];",
                "               Goldilocks::Element ti2[4];",
                `               Goldilocks::store_avx(ti0, tmp3[parserParams.args[i_args]][0]);`,
                `               Goldilocks::store_avx(ti1, tmp3[parserParams.args[i_args]][1]);`,
                `               Goldilocks::store_avx(ti2, tmp3[parserParams.args[i_args]][2]);`,
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
            
            operationCase.push(...[
                "                if(!includesEnds) {",
                `    ${writeOperation(op, false)}`,
                "                } else {",
                `    ${writeOperation(op, true)}`,
                "                }",
            ]);

            let numberArgs = 1 + nArgs(op.dest_type) + nArgs(op.src0_type);
            if(op.src1_type) numberArgs += nArgs(op.src1_type);
            
            operationCase.push(...[
                `                i_args += ${numberArgs};`,
                "                break;",
                "            }",
            ])
            parserCPP.push(operationCase.join("\n"));
        }
    }

    parserCPP.push(...[
        "              default: {",
        `                  std::cout << " Wrong operation!" << std::endl;`,
        "                  exit(1);",
        "              }",
        "          }",
        "       }",
        `       if (i_args != parserParams.nArgs) std::cout << " " << i_args << " - " << parserParams.nArgs << std::endl;`,
        "       assert(i_args == parserParams.nArgs);",
        "   }"
        ]);

    parserCPP.push("}");
       
    const parserHPP = [
        `#define NOPS_ ${cont_ops}`,
        `#define NARGS_ ${cont_args}`,
        `#define NTEMP1_ ${count1d}`,
        `#define NTEMP3_ ${count3d}`,
        "\n",
        `uint64_t ops[NOPS_] = ${opsString}`,
        "\n",
        `uint64_t args[NARGS_] = ${argsString}`
    ];
    
    const parserCPPCode = parserCPP.join("\n");
    const parserHPPCode = parserHPP.join("\n");

    const stageInfo = {
        stage,
        executeBefore: executeBefore ? 1 : 0,
        domainSize: dom === "n" ? (1 << nBits) : (1 << nBitsExt),
        nTemp1: count1d,
        nTemp3: count3d,
        nOps: cont_ops,
        ops,
        nArgs: cont_args,
        args: args.map(v => typeof v === 'string' && v.endsWith('ULL') ? parseInt(v.replace('ULL', '')) : v),
    }
    
    return {parserHPPCode, parserCPPCode, stageInfo};

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
        name += `i_args, `;

        c_args = 1;

        name += writeType(operation.dest_type, includesEnds);

        let {offset: offsetDest, offsetCall: offsetDestCall} = getOffset(operation.dest_type, operation.dest_prime, includesEnds, "dest");
        if(offsetDestCall) name += offsetDestCall;

        c_args += nArgs(operation.dest_type);
        name += "\n                        ";

        name += writeType(operation.src0_type, includesEnds);

        let {offset: offsetSrc0, offsetCall: offsetSrc0Call} = getOffset(operation.src0_type, operation.src0_prime, includesEnds, "src0");

        c_args += nArgs(operation.src0_type);
        name += "\n                        ";

        let offsetSrc1;
        let offsetSrc1Call;

        if(operation.src1_type) {
            name += writeType(operation.src1_type, includesEnds);

            let offsets = getOffset(operation.src1_type, operation.src1_prime, includesEnds, "src1");
            if(offsets.offset) offsetSrc1 = offsets.offset;
            if(offsets.offsetCall) offsetSrc1Call = offsets.offsetCall;

            c_args += nArgs(operation.src1_type);
            name += "\n                        ";
        }

        
        if(offsetSrc0Call) name += offsetSrc0Call;
        if(offsetSrc1Call) name += offsetSrc1Call;

        name = name.substring(0, name.lastIndexOf(", ")) + "\n                    );";
        
        const operationCall = [];

        if(includesEnds) {
            if(offsetDest || offsetSrc0 || offsetSrc1) {
                const offsetLoop = [ "                for (uint64_t j = 0; j < AVX_SIZE_; ++j) {"];
                if(offsetDest) offsetLoop.push(offsetDest);
                if(offsetSrc0) offsetLoop.push(offsetSrc0);
                if(offsetSrc1) offsetLoop.push(offsetSrc1);
                offsetLoop.push("                    }");
                operationCall.push(...offsetLoop);
            }
            operationCall.push(`                    ${name}`);
        } else {
            operationCall.push(`                ${name}`);
        }

        return operationCall.join("\n").replace(/i_args \+ 0/, "i_args");
    }

    function writeType(type, includesEnds = false) {
        switch (type) {
            case "public":
                return `params.publicInputs[parserParams.args[i_args + ${c_args}]], `;
            case "tmp1":
                return `tmp1[parserParams.args[i_args + ${c_args}]], `; 
            case "tmp3":
                    return `tmp3[parserParams.args[i_args + ${c_args}]], `;
            case "commit1":
            case "commit3":
                if(includesEnds) {
                    return `&params.pols[0], `;
                } else {
                    return `&params.pols[parserParams.args[i_args + ${c_args}] + (i + parserParams.args[i_args + ${c_args+1}]) * parserParams.args[i_args + ${c_args+2}]], `;
                }
            case "const":
                let constPols = dom === "n" ? "&params.pConstPols" : `&params.pConstPols2ns`;
                if(includesEnds) {
                    return `${constPols}->getElement(0, 0), `;
                } else {
                    return `${constPols}->getElement(parserParams.args[i_args + ${c_args}], i), `;
                }
            case "challenge":
                return `(Goldilocks3::Element &)*params.challenges[parserParams.args[i_args + ${c_args}]], `;
            case "x":
                return `params.x_${dom}[i], `;
            case "number":
                return `Goldilocks::fromU64(parserParams.args[i_args + ${c_args}]), `;
            case "Zi": 
                return "params.zi.zhInv(i), ";
            case "q":
                "params.q_2ns[i * 3], ";
            case "f": 
                return "params.f_2ns[i * 3], ";
            case "eval":
                return `&evals_[parserParams.args[i_args + ${c_args}] * 3], `;
            case "xDivXSubXi": 
                return "params.xDivXSubXi[i], ";
            case "xDivXSubWXi":
                return "params.xDivXSubWXi[i], ";
            default:
                throw new Error("Invalid type: " + type);
        }
    }

    function getOffset(type, prime, includesEnds = false, operand) {
        if(!["src0", "src1", "dest"].includes(operand)) throw new Error("Invalid type: " + operand);
        const strideTypes = ["commit1", "commit3"];
        if(operand !== "dest") strideTypes.push("const");

        let offset;
        let offsetCall;

        if(!includesEnds) {
            if(["commit1", "commit3", "const"].includes(type) && prime) {
                let numPols = type === "const" ? "numConstPols" : `parserParams.args[i_args + ${c_args+2}]`;
                offsetCall = `${numPols}, `;
            } else if (type === "x") {
                offsetCall = `params.x_${dom}.offset(), `;
            }
        } else {
            let offsetName = `offsets${operand[0].toUpperCase() + operand.substring(1)}`;
            if(["commit1", "commit3", "const"].includes(type) && prime) {
                let numPols = type === "const" ? "numConstPols" : `parserParams.args[i_args + ${c_args+2}]`;
                offset = `                        ${offsetName}[j] = parserParams.args[i_args + ${c_args}] + (((i + j) + parserParams.args[i_args + ${c_args+1}]) % parserParams.domainSize) * ${numPols};`;
                offsetCall = `${offsetName}, `;
            }
        }

        return {offset, offsetCall};
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
