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

module.exports.generateParser = function generateParser(code = []) {

    let operations;

    var c_args = 0;

    if(code.length === 0) {
        operations = getAllOperations();
    } else {
        operations = [];
        for (let j = 0; j < code.length; j++) {
            const r = code[j];
            let operation = module.exports.getOperation(r);
    
            let opsIndex = operations.findIndex(op => 
                op.dest_type === operation.dest_type
                && op.src0_type === operation.src0_type
                && ((!op.hasOwnProperty("src1_type")) || (op.src1_type === operation.src1_type)));
            
            if (opsIndex === -1) {
                opsIndex = operations.length;
                operations.push(operation);
            }
        }
    }
    

    const parserCPP = [
        `void CHelpers::parser_avx(StepsParams &params, ParserParams &parserParams, uint64_t rowStart, uint64_t rowEnd, uint64_t nrowsBatch, bool const includesEnds) {`,
        "#pragma omp parallel for",
        `    for (uint64_t i = rowStart; i < rowEnd; i+= nrowsBatch) {`,
        "        int i_args = 0;",
        "        __m256i tmp1[parserParams.nTemp1];",
        "        Goldilocks3::Element_avx tmp3[parserParams.nTemp3];",
        "        uint64_t offsetDest, offsetSrc0, offsetSrc1;",
        "        uint64_t numConstPols = params.pConstPols->numPols();",
        "        Polinomial x = parserParams.domainExtended == 1 ? params.x_2ns : params.x_n;", 
        "        ConstantPolsStarks *constPols = parserParams.domainExtended == 1 ? params.pConstPols2ns : params.pConstPols;",
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
       
    
    const parserCPPCode = parserCPP.join("\n");

    
    return {operations, parserCPPCode};

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

        let {offset: offsetDest, offsetCall: offsetDestCall} = getOffset(operation.dest_type, includesEnds, "dest");
        if(offsetDestCall) name += offsetDestCall;

        c_args += nArgs(operation.dest_type);
        name += "\n                        ";

        name += writeType(operation.src0_type, includesEnds);

        let {offset: offsetSrc0, offsetCall: offsetSrc0Call} = getOffset(operation.src0_type, includesEnds, "src0");
        if(offsetSrc0Call) name += offsetSrc0Call;

        c_args += nArgs(operation.src0_type);
        name += "\n                        ";

        let offsetSrc1;

        if(operation.src1_type) {
            name += writeType(operation.src1_type, includesEnds);

            let offsets = getOffset(operation.src1_type, includesEnds, "src1");
            if(offsets.offset) offsetSrc1 = offsets.offset;
            if(offsets.offsetCall) name += offsets.offsetCall;

            c_args += nArgs(operation.src1_type);
            name += "\n                        ";
        }

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
                return `${includesEnds ? "&" : ""}params.publicInputs[parserParams.args[i_args + ${c_args}]], `;
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
                if(includesEnds) {
                    return `constPols->getElement(0, 0), `;
                } else {
                    return `constPols->getElement(parserParams.args[i_args + ${c_args}], i), `;
                }
            case "challenge":
                return `${includesEnds ? "&" : ""}params.challenges[parserParams.args[i_args + ${c_args}]], `;
            case "x":
                return `x[i], `;
            case "number":
                return `${includesEnds ? "&" : ""}Goldilocks::fromU64(parserParams.args[i_args + ${c_args}]), `;
            case "Zi": 
                return `${includesEnds ? "&" : ""}params.zi.zhInv(i), `;
            case "q":
                "params.q_2ns[i * 3], ";
            case "f": 
                return "params.f_2ns[i * 3], ";
            case "eval":
                return `params.evals[parserParams.args[i_args + ${c_args}] * 3], `;
            case "xDivXSubXi": 
                return "params.xDivXSubXi[i], ";
            case "xDivXSubWXi":
                return "params.xDivXSubWXi[i], ";
            default:
                throw new Error("Invalid type: " + type);
        }
    }

    function getOffset(type, includesEnds = false, operand) {
        if(!["src0", "src1", "dest"].includes(operand)) throw new Error("Invalid type: " + operand);
        const strideTypes = ["commit1", "commit3"];
        if(operand !== "dest") strideTypes.push("const");

        let offset;
        let offsetCall;

        if(includesEnds) {
            let offsetName = `offsets${operand[0].toUpperCase() + operand.substring(1)}`;
            if(["commit1", "commit3", "const"].includes(type)) {
                let numPols = type === "const" ? "numConstPols" : `parserParams.args[i_args + ${c_args+2}]`;
                offset = `                        ${offsetName}[j] = parserParams.args[i_args + ${c_args}] + (((i + j) + parserParams.args[i_args + ${c_args+1}]) % parserParams.domainSize) * ${numPols};`;
                offsetCall = `${offsetName}, `;
            } else if (["x", "xDivXSubXi", "xDivXSubWXi", "eval"].includes(type)) {
                offsetCall = `${type}.offset(), `;
            } else if (["challenges", "Zi", "public", "number"].includes(type)) {
                offset = `                        ${offsetName}[j] = 0;`;
            } else if (type === "tmp3") {
                offset = `                        ${offsetName}[j] = 3;`;
            } else if (type === "tmp1") {
                offset = `                        ${offsetName}[j] = 1;`;
            }
        } else {
            if(["commit1", "commit3", "const"].includes(type)) {
                let numPols = type === "const" ? "numConstPols" : `parserParams.args[i_args + ${c_args+2}]`;
                offsetCall = `${numPols}, `;
            } else if (["x", "xDivXSubXi", "xDivXSubWXi"].includes(type)) {
                offsetCall = `${type}.offset(), `;
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

    function getAllOperations() {
        const operations = [];

        const possibleDestinationsDim1 = [ "commit1", "tmp1" ];
        const possibleDestinationsDim3 = [ "commit3", "tmp3" ];
    
        const possibleSrcDim1 = [ "commit1", "const", "tmp1", "public", "x", "number" ];
        const possibleSrcDim3 = [ "commit3", "tmp3", "challenge" ];

        // Dim1 destinations
        for(let j = 0; j < possibleDestinationsDim1.length; j++) {
            let dest_type = possibleDestinationsDim1[j];
            for(let k = 0; k < possibleSrcDim1.length; ++k) {
                let src0_type = possibleSrcDim1[k];
                if(["commit1", "const", "tmp1"].includes(src0_type)) operations.push({dest_type, src0_type}); // Copy operation
                if(src0_type === "x") continue;
                for (let l = 0; l < possibleSrcDim1.length; ++l) {
                    let src1_type = possibleSrcDim1[l];
                    if(src1_type === "x") continue;
                    operations.push({dest_type, src0_type, src1_type})
                } 
            }
        }

        // Dim3 destinations
        for(let j = 0; j < possibleDestinationsDim3.length; j++) {
            let dest_type = possibleDestinationsDim3[j];

            // Dest dim 3, sources dimension 1 and 3
            for(let k = 0; k < possibleSrcDim1.length; ++k) {
                let src0_type = possibleSrcDim1[k];
                for (let l = 0; l < possibleSrcDim3.length; ++l) {
                    let src1_type = possibleSrcDim3[l];
                    operations.push({dest_type, src0_type, src1_type})
                }
            }

            // Dest dim 3, sources dimension 3 and 1
            for(let k = 0; k < possibleSrcDim3.length; ++k) {
                let src0_type = possibleSrcDim3[k];
                
                for (let l = 0; l < possibleSrcDim1.length; ++l) {
                    let src1_type = possibleSrcDim1[l];
                    if(src1_type === "x") continue;
                    operations.push({dest_type, src0_type, src1_type});
                }
            }

            for(let k = 0; k < possibleSrcDim3.length; ++k) {
                let src0_type = possibleSrcDim3[k];
                if(["commit3", "tmp3"].includes(src0_type)) operations.push({dest_type, src0_type}); // Copy operation
                for (let l = 0; l < possibleSrcDim3.length; ++l) {
                    let src1_type = possibleSrcDim3[l];
                    operations.push({dest_type, src0_type, src1_type})
                }
            }
        }

        // Step FRI
        operations.push({ dest_type: "tmp3", src0_type: "eval"});
        operations.push({ dest_type: "tmp3", src0_type: "challenge", src1_type: "eval"});
        operations.push({ dest_type: "tmp3", src0_type: "tmp3", src1_type: "eval"});

        operations.push({ dest_type: "tmp3", src0_type: "commit1", src1_type: "eval"});
        operations.push({ dest_type: "tmp3", src0_type: "eval", src1_type: "commit1"});

        operations.push({ dest_type: "tmp3", src0_type: "commit3", src1_type: "eval"});
        operations.push({ dest_type: "tmp3", src0_type: "eval", src1_type: "commit3"});

        operations.push({ dest_type: "tmp3", src0_type: "const", src1_type: "eval"});
        operations.push({ dest_type: "tmp3", src0_type: "eval", src1_type: "const"});
        
        operations.push({ dest_type: "tmp3", src0_type: "tmp3", src1_type: "xDivXSubXi"});
        operations.push({ dest_type: "tmp3", src0_type: "tmp3", src1_type: "xDivXSubWXi"});

        operations.push({ dest_type: "q", src0_type: "tmp3", src1_type: "Zi"});
        operations.push({ dest_type: "f", src0_type: "tmp3"});

        return operations;
    } 
}

module.exports.getOperation = function getOperation(r) {
    const _op = {};
    _op.op = r.op;
    if(["cm", "tmpExp"].includes(r.dest.type)) {
        _op.dest_type = `commit${r.dest.dim}`;
    } else if(r.dest.type === "tmp") {
        _op.dest_type = `tmp${r.dest.dim}`;
    } else {
        _op.dest_type = r.dest.type;
    }
    
    if(r.op !== "sub") {
        r.src.sort((a, b) => {
            let opA =  ["cm", "tmpExp"].includes(a.type) ? operationsMap[`commit${a.dim}`] : a.type === "tmp" ? operationsMap[`tmp${a.dim}`] : operationsMap[a.type];
            let opB = ["cm", "tmpExp"].includes(b.type) ? operationsMap[`commit${b.dim}`] : b.type === "tmp" ? operationsMap[`tmp${b.dim}`] : operationsMap[b.type];
            return opA - opB;
        });
    }

    for(let i = 0; i < r.src.length; i++) {
        if(["cm", "tmpExp"].includes(r.src[i].type)) {
            _op[`src${i}_type`] = `commit${r.src[i].dim}`;
        } else if(r.src[i].type === "tmp") {
            _op[`src${i}_type`] =  `tmp${r.src[i].dim}`;
        } else {
            _op[`src${i}_type`] = r.src[i].type;
        }
    }

    return _op;
}