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

module.exports.generateParser = function generateParser(className, stageName = "", operations, operationsUsed, vectorizeEvals = false) {

    let c_args = 0;

    let isStage = stageName !== "";
    let parserName = isStage ? `${stageName}_parser_avx` : "parser_avx";
    
    if(operationsUsed && operationsUsed.length === 0) {
        return `#include "${className}.hpp"\nvoid ${className}::${parserName}(StepsParams &params, ParserParams &parserParams, uint32_t rowStart, uint32_t rowEnd, uint32_t nrowsBatch, uint32_t domainSize, bool domainExtended, bool const includesEnds) {};`;
    }

    const parserCPP = [
        `#include "${className}.hpp"\n`,

        `void ${className}::${parserName}(StepsParams &params, ParserParams &parserParams, uint32_t rowStart, uint32_t rowEnd, uint32_t nrowsBatch, uint32_t domainSize, bool domainExtended, bool const includesEnds) {`,
        "    uint64_t numConstPols = params.pConstPols->numPols();",
        "    Polinomial &x = domainExtended ? params.x_2ns : params.x_n;", 
        "    ConstantPolsStarks *constPols = domainExtended ? params.pConstPols2ns : params.pConstPols;",
        "    __m256i tmp1[parserParams.nTemp1];",
        "    Goldilocks3::Element_avx tmp3[parserParams.nTemp3];",
        "    uint64_t offsetsDest[4], offsetsSrc0[4], offsetsSrc1[4];",
        "    Goldilocks3::Element_avx challenges[params.challenges.degree()];",
        "    Goldilocks3::Element_avx tmp3_;",
        "    Goldilocks3::Element_avx tmp3_0;",
        "    Goldilocks3::Element_avx tmp3_1;",
        "    __m256i tmp1_;",
        "    __m256i tmp1_0;",
        "    __m256i tmp1_1;",
        "#pragma omp parallel for",
        "    for(uint64_t i = 0; i < params.challenges.degree(); ++i) {",
        "        challenges[i][0] = _mm256_set1_epi64x(params.challenges[i][0].fe);",
        "        challenges[i][1] = _mm256_set1_epi64x(params.challenges[i][1].fe);",
        "        challenges[i][2] = _mm256_set1_epi64x(params.challenges[i][2].fe);",
        "    }",
    ];

    parserCPP.push(...[
        "    __m256i publics[50];",
        "#pragma omp parallel for",
        "    for(uint64_t i = 0; i < 50; ++i) {",
        "        publics[i] = _mm256_set1_epi64x(params.publicInputs[i].fe);",
        "    }",
    ]);
    if(vectorizeEvals) {
        parserCPP.push(...[
            "    Goldilocks3::Element_avx evals[params.evals.degree()];",
            "#pragma omp parallel for",
            "    for(uint64_t i = 0; i < params.evals.degree(); ++i) {",
            "        evals[i][0] = _mm256_set1_epi64x(params.evals[i][0].fe);",
            "        evals[i][1] = _mm256_set1_epi64x(params.evals[i][1].fe);",
            "        evals[i][2] = _mm256_set1_epi64x(params.evals[i][2].fe);",
            "    }",
        ]);
    }
    parserCPP.push(...[
        "#pragma omp parallel for private(tmp1, tmp3, offsetsDest, offsetsSrc0, offsetsSrc1, tmp1_, tmp3_, tmp1_0, tmp1_1, tmp3_0, tmp3_1)",
        `    for (uint64_t i = rowStart; i < rowEnd; i+= nrowsBatch) {`,
        "        uint64_t i_args = 0;",
        "        \n",
        "        for (uint64_t kk = 0; kk < parserParams.nOps; ++kk) {",
        `            switch (parserParams.ops[kk]) {`,
    ]);
           
    const edgeCases = ["const", "commit1", "commit3"];

    for(let i = 0; i < operations.length; i++) {
        if(operationsUsed && !operationsUsed.includes(i)) continue;
        const op = operations[i];
        
        
        const operationCase = [`            case ${i}: {`];
        
        if(!op.isGroupOps) {
            let operationDescription;
            if(op.src1_type) {
                operationDescription = `                    // OPERATION WITH DEST: ${op.dest_type} - SRC0: ${op.src0_type} - SRC1: ${op.src1_type}`;
            } else {
                operationDescription = `                    // COPY ${op.src0_type} to ${op.dest_type}`;
            }
            operationCase.push(operationDescription);
        }
        
        let includeEnds = false;
        if(!isStage) {
            if(!op.isGroupOps) {
                if(!["q", "f"].includes(op.dest_type) && (edgeCases.includes(op.dest_type) || edgeCases.includes(op.src0_type) || (op.src1_type && edgeCases.includes(op.src1_type)))) includeEnds = true;
            } else {
                for(let j = 0; j < op.ops.length; j++) {
                    let opr = operations[op.ops[j]];
                    if(!["q", "f"].includes(opr.dest_type) && (edgeCases.includes(opr.dest_type) || edgeCases.includes(opr.src0_type) || (opr.src1_type && edgeCases.includes(opr.src1_type)))) {
                        includeEnds = true;
                        break;
                    }
                }
            }
        }
        if(!includeEnds) {
            if(op.isGroupOps) {
                for(let j = 0; j < op.ops.length; j++) {
                    let opr = operations[op.ops[j]];
                    operationCase.push(writeOperation(opr, false));
                    let numberArgs = nArgs(opr.dest_type) + nArgs(opr.src0_type);
                    if(opr.src1_type && !["q", "f"].includes(opr.dest_type)) numberArgs += nArgs(opr.src1_type) + 1;
                    operationCase.push(`                    i_args += ${numberArgs};`);
                }
            } else {
                operationCase.push(writeOperation(op, false));
                let numberArgs = nArgs(op.dest_type) + nArgs(op.src0_type);
                if(op.src1_type && !["q", "f"].includes(op.dest_type)) numberArgs += nArgs(op.src1_type) + 1;
                operationCase.push(`                    i_args += ${numberArgs};`);
            }
        } else {
            operationCase.push("                if(!includesEnds) {");
            if(op.isGroupOps) {
                for(let j = 0; j < op.ops.length; j++) {
                    let opr = operations[op.ops[j]];
                    operationCase.push(writeOperation(opr, false));
                    let numberArgs = nArgs(opr.dest_type) + nArgs(opr.src0_type);
                    if(opr.src1_type && !["q", "f"].includes(opr.dest_type)) numberArgs += nArgs(opr.src1_type) + 1;
                    operationCase.push(`                    i_args += ${numberArgs};`);
                }
            } else {
                operationCase.push(writeOperation(op, false));
                let numberArgs = nArgs(op.dest_type) + nArgs(op.src0_type);
                if(op.src1_type && !["q", "f"].includes(op.dest_type)) numberArgs += nArgs(op.src1_type) + 1;
                operationCase.push(`                    i_args += ${numberArgs};`);
            }
            operationCase.push("                } else {");
            if(op.isGroupOps) {
                for(let j = 0; j < op.ops.length; j++) {
                    let opr = operations[op.ops[j]];
                    operationCase.push(writeOperation(opr, true));
                    let numberArgs = nArgs(opr.dest_type) + nArgs(opr.src0_type);
                    if(opr.src1_type && !["q", "f"].includes(opr.dest_type)) numberArgs += nArgs(opr.src1_type) + 1;
                    operationCase.push(`                i_args += ${numberArgs};`);
                }
            } else {
                operationCase.push(writeOperation(op, true));
                let numberArgs = nArgs(op.dest_type) + nArgs(op.src0_type);
                if(op.src1_type && !["q", "f"].includes(op.dest_type)) numberArgs += nArgs(op.src1_type) + 1;
                operationCase.push(`                    i_args += ${numberArgs};`);
            }
            operationCase.push("                }");
        }

        operationCase.push(...[
            "                    break;",
            "            }",
        ])
        parserCPP.push(operationCase.join("\n"));
        
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

    return parserCPPCode;

    function writeOperation(operation, includesEnds = false) {
        if(operation.dest_type === "q") {
            const qOperation = [
                "                    Goldilocks::Element tmp_inv[3];",
                "                    Goldilocks::Element ti0[4];",
                "                    Goldilocks::Element ti1[4];",
                "                    Goldilocks::Element ti2[4];",
                `                    Goldilocks::store_avx(ti0, tmp3[parserParams.args[i_args]][0]);`,
                `                    Goldilocks::store_avx(ti1, tmp3[parserParams.args[i_args]][1]);`,
                `                    Goldilocks::store_avx(ti2, tmp3[parserParams.args[i_args]][2]);`,
                "                    for (uint64_t j = 0; j < AVX_SIZE_; ++j) {",
                "                        tmp_inv[0] = ti0[j];",
                "                        tmp_inv[1] = ti1[j];",
                "                        tmp_inv[2] = ti2[j];",
                "                        Goldilocks3::mul((Goldilocks3::Element &)(params.q_2ns[(i + j) * 3]), params.zi.zhInv((i + j)),(Goldilocks3::Element &)tmp_inv);",
                "                    }",
            ].join("\n");
            return qOperation;
        } else if(operation.dest_type === "f") {
            const fOperation = "                    Goldilocks3::copy_avx(&params.f_2ns[i*3], uint64_t(3), tmp3[parserParams.args[i_args]]);"
            return fOperation;
        }
        let name = ["tmp1", "commit1"].includes(operation.dest_type) ? "Goldilocks::" : "Goldilocks3::";
        name += operation.src1_type ? "op" : "copy";

        if(["tmp3", "commit3"].includes(operation.dest_type)) {
            if(operation.src1_type)  {
                let dimType = "";
                let dims1 = ["public", "x", "commit1", "tmp1", "const", "number"];
                let dims3 = ["commit3", "tmp3", "challenge", "eval", "xDivXSubXi", "xDivXSubWXi"];
                if(dims1.includes(operation.src0_type)) dimType += "1";
                if (dims3.includes(operation.src0_type)) dimType += "3";
                if(dims1.includes(operation.src1_type)) dimType += "1";
                if (dims3.includes(operation.src1_type)) dimType += "3";
    
                if(dimType !== "33") name += "_" + dimType;
            }
        } 
        
        name += "_avx(";

        c_args = 0;

        if(operation.src1_type) {
            name += `parserParams.args[i_args + ${c_args++}], `;
        }      

        let typeDest = writeType(operation.dest_type, includesEnds);
        let {offset: offsetDest, offsetCall: offsetDestCall} = getOffset(operation.dest_type,"dest", includesEnds);
        c_args += nArgs(operation.dest_type);

        let typeSrc0 = writeType(operation.src0_type, includesEnds);
        let {offset: offsetSrc0, offsetCall: offsetSrc0Call} = getOffset(operation.src0_type, "src0", includesEnds);
        c_args += nArgs(operation.src0_type);

        let offsetSrc1;
        let offsetSrc1Call;
        let typeSrc1;

        if(operation.src1_type) {
            typeSrc1 = writeType(operation.src1_type, includesEnds);

            let offsets = getOffset(operation.src1_type, "src1", includesEnds);
            if(offsets.offset) offsetSrc1 = offsets.offset;
            if(offsets.offsetCall) offsetSrc1Call = offsets.offsetCall;
            c_args += nArgs(operation.src1_type);
        }
        
        const operationCall = [];

        if(includesEnds && (offsetDest || offsetSrc0 || offsetSrc1)) {
            const offsetLoop = ["                    for (uint64_t j = 0; j < AVX_SIZE_; ++j) {"];
            if(offsetDest) offsetLoop.push(offsetDest);
            if(offsetSrc0) offsetLoop.push(offsetSrc0);
            if(offsetSrc1) offsetLoop.push(offsetSrc1);
            offsetLoop.push("                    }");
            operationCall.push(...offsetLoop);
        }
            
        if(offsetSrc0Call) {
            if(["x", "commit1", "const"].includes(operation.src0_type)) {
                operationCall.push(`                    Goldilocks::load_avx(tmp1_0, ${typeSrc0}, ${offsetSrc0Call});`);
                typeSrc0 = "tmp1_0";
            } else if(["commit3", "xDivXSubXi", "xDivXSubWXi"].includes(operation.src0_type)) {
                operationCall.push(`                    Goldilocks3::load_avx(tmp3_0, ${typeSrc0}, ${offsetSrc0Call});`);
                typeSrc0 = "tmp3_0";
            } else throw new Error("Something went wrong!");
        }

        if(offsetSrc1Call) {
            if(["x", "commit1", "const"].includes(operation.src1_type)) {
                operationCall.push(`                    Goldilocks::load_avx(tmp1_1, ${typeSrc1}, ${offsetSrc1Call});`);
                typeSrc1 = "tmp1_1";
            } else if(["commit3", "xDivXSubXi", "xDivXSubWXi"].includes(operation.src1_type)) {
                operationCall.push(`                    Goldilocks3::load_avx(tmp3_1, ${typeSrc1}, ${offsetSrc1Call});`);
                typeSrc1 = "tmp3_1";
            } else throw new Error("Something went wrong!");
        }

        if(offsetDestCall) {
            if(operation.dest_type === "commit1") {
                name += "tmp1_, ";
            } else if(operation.dest_type === "commit3") {
                name += "tmp3_, ";
            } else throw new Error("Something went wrong!");
        } else {
            name += typeDest + ", ";
        }
        name += typeSrc0 + ", ";
        if(operation.src1_type) name += typeSrc1 + ", ";

        name = name.substring(0, name.lastIndexOf(", ")) + ");";

        operationCall.push(`                    ${name}`);

        if(offsetDestCall) {
            if(operation.dest_type === "commit1") {
                operationCall.push(`                    Goldilocks::store_avx(${typeDest}, ${offsetDestCall}, tmp1_);`);
            } else if(operation.dest_type === "commit3") {
                operationCall.push(`                    Goldilocks3::store_avx(${typeDest}, ${offsetDestCall}, tmp3_);`);
            } else throw new Error("Something went wrong!");
        }


        return operationCall.join("\n").replace(/i_args \+ 0/, "i_args");
    }

    function writeType(type, includesEnds = false) {
        switch (type) {
            case "public":
                return `publics[parserParams.args[i_args + ${c_args}]]`;
            case "tmp1":
                return `tmp1[parserParams.args[i_args + ${c_args}]]`; 
            case "tmp3":
                return `tmp3[parserParams.args[i_args + ${c_args}]]`;
            case "commit1":
            case "commit3":
                if(includesEnds) {
                    return `&params.pols[0]`;
                } else {
                    return `&params.pols[parserParams.args[i_args + ${c_args}] + (i + parserParams.args[i_args + ${c_args+1}]) * parserParams.args[i_args + ${c_args+2}]]`;
                }
            case "const":
                if(includesEnds) {
                    return `&constPols->getElement(0, 0)`;
                } else {
                    return `&constPols->getElement(parserParams.args[i_args + ${c_args}], i + parserParams.args[i_args + ${c_args + 1}])`;
                }
            case "challenge":
                return `challenges[parserParams.args[i_args + ${c_args}]]`;
            case "eval":
                return `evals[parserParams.args[i_args + ${c_args}]]`;
            case "number":
                return `_mm256_set1_epi64x(parserParams.args[i_args + ${c_args}])`;
            case "x":
                return `x[i]`;
            case "xDivXSubXi": 
                return "params.xDivXSubXi[i]";
            case "xDivXSubWXi":
                return "params.xDivXSubWXi[i]";
            default:
                throw new Error("Invalid type: " + type);
        }
    }

    function getOffset(type, operand, includesEnds = false) {
        if(!["src0", "src1", "dest"].includes(operand)) throw new Error("Invalid type: " + operand);
        const strideTypes = ["commit1", "commit3"];
        if(operand !== "dest") strideTypes.push("const");

        let offset;
        let offsetCall;

        if(includesEnds) {
            let offsetName = `offsets${operand[0].toUpperCase() + operand.substring(1)}`;
            if(["commit1", "commit3", "const"].includes(type)) {
                let numPols = type === "const" ? "numConstPols" : `parserParams.args[i_args + ${c_args+2}]`;
                offset = `                        ${offsetName}[j] = parserParams.args[i_args + ${c_args}] + (((i + j) + parserParams.args[i_args + ${c_args+1}]) % domainSize) * ${numPols};`;
                offsetCall = `${offsetName}`;
            } else if (["x", "xDivXSubXi", "xDivXSubWXi"].includes(type)) {
                let nameType = type === "x" ? "x" : `params.${type}`;
                offset = `                        ${offsetName}[j] = j*${nameType}.offset();`;
                offsetCall = `${offsetName}`;
            }
        } else {
            if(["commit1", "commit3", "const"].includes(type)) {
                let numPols = type === "const" ? "numConstPols" : `parserParams.args[i_args + ${c_args+2}]`;
                offsetCall = `${numPols}`;
            } else if (["x", "xDivXSubXi", "xDivXSubWXi"].includes(type)) {
                let nameType = type === "x" ? "x" : `params.${type}`;
                offsetCall = `${nameType}.offset()`;
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
}

module.exports.getAllOperations = function getAllOperations() {
    const possibleOps = [];

    const possibleDestinationsDim1 = [ "commit1", "tmp1" ];
    const possibleDestinationsDim3 = [ "commit3", "tmp3" ];

    const possibleSrcDim1 = [ "commit1", "const", "tmp1", "public", "x", "number" ];
    const possibleSrcDim3 = [ "commit3", "tmp3", "challenge" ];

    // Dim1 destinations
    for(let j = 0; j < possibleDestinationsDim1.length; j++) {
        let dest_type = possibleDestinationsDim1[j];
        for(let k = 0; k < possibleSrcDim1.length; ++k) {
            let src0_type = possibleSrcDim1[k];
            possibleOps.push({dest_type, src0_type}); // Copy operation
            if(src0_type === "x") continue;
            for (let l = k; l < possibleSrcDim1.length; ++l) {
                let src1_type = possibleSrcDim1[l];
                if(src1_type === "x") continue;
                possibleOps.push({dest_type, src0_type, src1_type})
            } 
        }
    }

    // Dim3 destinations
    for(let j = 0; j < possibleDestinationsDim3.length; j++) {
        let dest_type = possibleDestinationsDim3[j];


        // Dest dim 3, sources dimension 3 and 1
        for(let k = 0; k < possibleSrcDim3.length; ++k) {
            let src0_type = possibleSrcDim3[k];
            
            for (let l = 0; l < possibleSrcDim1.length; ++l) {
                let src1_type = possibleSrcDim1[l];
                possibleOps.push({dest_type, src0_type, src1_type});
            }
        }

        for(let k = 0; k < possibleSrcDim3.length; ++k) {
            let src0_type = possibleSrcDim3[k];
            if(["commit3", "tmp3"].includes(src0_type)) possibleOps.push({dest_type, src0_type}); // Copy operation
            for (let l = k; l < possibleSrcDim3.length; ++l) {
                let src1_type = possibleSrcDim3[l];
                possibleOps.push({dest_type, src0_type, src1_type})
            }
        }
    }

    // Step FRI
    possibleOps.push({ dest_type: "tmp3", src0_type: "eval"});
    possibleOps.push({ dest_type: "tmp3", src0_type: "challenge", src1_type: "eval"});
    possibleOps.push({ dest_type: "tmp3", src0_type: "tmp3", src1_type: "eval"});

    possibleOps.push({ dest_type: "tmp3", src0_type: "commit1", src1_type: "eval"});
    possibleOps.push({ dest_type: "tmp3", src0_type: "eval", src1_type: "commit1"});

    possibleOps.push({ dest_type: "tmp3", src0_type: "commit3", src1_type: "eval"});
    possibleOps.push({ dest_type: "tmp3", src0_type: "eval", src1_type: "commit3"});

    possibleOps.push({ dest_type: "tmp3", src0_type: "const", src1_type: "eval"});
    possibleOps.push({ dest_type: "tmp3", src0_type: "eval", src1_type: "const"});
    
    possibleOps.push({ dest_type: "tmp3", src0_type: "tmp3", src1_type: "xDivXSubXi"});
    possibleOps.push({ dest_type: "tmp3", src0_type: "tmp3", src1_type: "xDivXSubWXi"});

    possibleOps.push({ dest_type: "q", src0_type: "tmp3", src1_type: "Zi"});
    possibleOps.push({ dest_type: "f", src0_type: "tmp3"});

    return possibleOps;
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
    
    if(r.op !== "copy") {
        r.src.sort((a, b) => {
            let opA =  ["cm", "tmpExp"].includes(a.type) ? operationsMap[`commit${a.dim}`] : a.type === "tmp" ? operationsMap[`tmp${a.dim}`] : operationsMap[a.type];
            let opB = ["cm", "tmpExp"].includes(b.type) ? operationsMap[`commit${b.dim}`] : b.type === "tmp" ? operationsMap[`tmp${b.dim}`] : operationsMap[b.type];
            let swap = a.dim !== b.dim ? b.dim - a.dim : opA - opB;
            if(r.op === "sub" && swap < 0) _op.op = "sub_swap";
            return swap;
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
