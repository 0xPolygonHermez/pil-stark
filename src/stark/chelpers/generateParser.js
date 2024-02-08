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
    
    let functionName = `void ${className}::${parserName}(StarkInfo &starkInfo, StepsParams &params, ParserParams &parserParams, uint32_t nrowsBatch, bool domainExtended) {`;

    if(operationsUsed && operationsUsed.length === 0) {
        return `#include "${className}.hpp"\n${functionName}`;
    }

    const parserCPP = [
        `#include "${className}.hpp"\n`,
        `${functionName}`,
        "    uint64_t domainSize = domainExtended ? 1 << starkInfo.starkStruct.nBitsExt : 1 << starkInfo.starkStruct.nBits;",
        "    Polinomial &x = domainExtended ? params.x_2ns : params.x_n;", 
        "    ConstantPolsStarks *constPols = domainExtended ? params.pConstPols2ns : params.pConstPols;",
        "    __m256i tmp1[parserParams.nTemp1];",
        "    Goldilocks3::Element_avx tmp3[parserParams.nTemp3];",
        "    Goldilocks3::Element_avx challenges[params.challenges.degree()];\n",
        "    __m256i numbers[parserParams.nNumbers];\n",
    ];

    
    parserCPP.push(...[
        `    uint64_t nrowsBuff = nrowsBatch + (1<<(starkInfo.starkStruct.nBitsExt - starkInfo.starkStruct.nBits));\n`,
        `    uint64_t nColsConstants = starkInfo.nConstants;`,
        `    uint64_t bOffsetConstants = 0;`,
        `    uint64_t nColsCm1 = starkInfo.mapSectionsN.section[eSection::cm1_2ns];`,
        `    uint64_t offsetCm1 = domainExtended ? starkInfo.mapOffsets.section[eSection::cm1_2ns] : starkInfo.mapOffsets.section[eSection::cm1_n];`,
        `    uint64_t bOffsetCm1 = nrowsBuff*nColsConstants;`,
        `    uint64_t nColsCm2 = starkInfo.mapSectionsN.section[eSection::cm2_2ns];`,
        `    uint64_t offsetCm2 = domainExtended ? starkInfo.mapOffsets.section[eSection::cm2_2ns] : starkInfo.mapOffsets.section[eSection::cm2_n];`,
        `    uint64_t bOffsetCm2 = nrowsBuff*(nColsConstants + nColsCm1);`,
        `    uint64_t nColsCm3 = starkInfo.mapSectionsN.section[eSection::cm3_2ns];`,
        `    uint64_t offsetCm3 = domainExtended ? starkInfo.mapOffsets.section[eSection::cm3_2ns] : starkInfo.mapOffsets.section[eSection::cm3_n];`,
        `    uint64_t bOffsetCm3 = nrowsBuff*(nColsConstants + nColsCm1 + nColsCm2);\n`,
        `    uint64_t nCols = nColsConstants + nColsCm1 + nColsCm2 + nColsCm3;\n`,
    ]);

    parserCPP.push(...[
        "    uint64_t nColsTmpExp = starkInfo.mapSectionsN.section[eSection::tmpExp_n];",
        "    uint64_t offsetTmpExp = starkInfo.mapOffsets.section[eSection::tmpExp_n];",
        "    uint64_t bOffsetTmpExp = nrowsBuff*(nColsConstants + nColsCm1 + nColsCm2 + nColsCm3);\n",
        "    uint64_t nColsCm4 = starkInfo.mapSectionsN.section[eSection::cm4_2ns];",
        "    uint64_t offsetCm4 = starkInfo.mapOffsets.section[eSection::cm4_2ns];",
        "    uint64_t bOffsetCm4 = nrowsBuff*(nColsConstants + nColsCm1 + nColsCm2 + nColsCm3);\n",
        "    nCols += domainExtended ? nColsCm4 : nColsTmpExp;\n",
    ]);

    parserCPP.push(...[
        "    Goldilocks::Element bufferT[nrowsBuff*nCols];\n",
    ]);
    
        
    parserCPP.push(...[
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
    ]);

    parserCPP.push(...[
        "#pragma omp parallel for",
        "    for(uint64_t i = 0; i < parserParams.nNumbers; ++i) {",
        "        numbers[i] = _mm256_set1_epi64x(parserParams.numbers[i]);",
        "    }",
    ])

    parserCPP.push(...[
        "    __m256i publics[starkInfo.nPublics];",
        "#pragma omp parallel for",
        "    for(uint64_t i = 0; i < starkInfo.nPublics; ++i) {",
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
        `#pragma omp parallel for private(tmp1, tmp3, tmp1_, tmp3_, tmp1_0, tmp1_1, tmp3_0, tmp3_1, bufferT)`,
        `    for (uint64_t i = 0; i < domainSize; i+= nrowsBatch) {`,
        "        uint64_t i_args = 0;\n",
    ]); 

    
    parserCPP.push(...[
        "        for(uint64_t j = 0; j < nrowsBuff; ++j) {",
        "            uint64_t l = i + j;",
        "            if(l >= domainSize) l -= domainSize;",
        "            for(uint64_t k = 0; k < nColsConstants; ++k) {",
        "                bufferT[bOffsetConstants + k*nrowsBuff + j] = ((Goldilocks::Element *)constPols->address())[l * nColsConstants + k];",
        "            }",
        "            for(uint64_t k = 0; k < nColsCm1; ++k) {",
        "                bufferT[bOffsetCm1 + k*nrowsBuff + j] = params.pols[offsetCm1 + l * nColsCm1 + k];",
        "            }",
        "            for(uint64_t k = 0; k < nColsCm2; ++k) {",
        "                bufferT[bOffsetCm2 + k*nrowsBuff + j] = params.pols[offsetCm2 + l * nColsCm2 + k];",
        "            }",
        "            for(uint64_t k = 0; k < nColsCm3; ++k) {",
        "                bufferT[bOffsetCm3 + k*nrowsBuff + j] = params.pols[offsetCm3 + l * nColsCm3 + k];",
        "            }",
    ]);

    parserCPP.push(...[
        "            if(parserParams.stage <= 3) {",
        "                for(uint64_t k = 0; k < nColsTmpExp; ++k) {",
        "                    bufferT[bOffsetTmpExp + k*nrowsBuff + j] = params.pols[offsetTmpExp + l * nColsTmpExp + k];",
        "                }",
        "            } else {",
        "                for(uint64_t k = 0; k < nColsCm4; ++k) {",
        "                    bufferT[bOffsetCm4 + k*nrowsBuff + j] = params.pols[offsetCm4 + l * nColsCm4 + k];",
        "                }",
        "            }",
    ]);

    parserCPP.push("        }");
    

    parserCPP.push(...[
        "\n",
        "        for (uint64_t kk = 0; kk < parserParams.nOps; ++kk) {",
        `            switch (parserParams.ops[kk]) {`,
    ]);
           
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
                
        
        if(op.isGroupOps) {
            for(let j = 0; j < op.ops.length; j++) {
                let opr = operations[op.ops[j]];
                operationCase.push(writeOperation(opr));
                let numberArgs = nArgs(opr.dest_type) + nArgs(opr.src0_type);
                if(opr.src1_type && !["q", "f"].includes(opr.dest_type)) numberArgs += nArgs(opr.src1_type) + 1;
                operationCase.push(`                    i_args += ${numberArgs};`);
            }
        } else {
            operationCase.push(writeOperation(op));
            let numberArgs = nArgs(op.dest_type) + nArgs(op.src0_type);
            if(op.src1_type && !["q", "f"].includes(op.dest_type)) numberArgs += nArgs(op.src1_type) + 1;
            operationCase.push(`                    i_args += ${numberArgs};`);
        }

        operationCase.push(...[
            "                    break;",
            "            }",
        ])
        parserCPP.push(operationCase.join("\n"));
        
    }

    parserCPP.push(...[
        "                default: {",
        `                    std::cout << " Wrong operation!" << std::endl;`,
        "                    exit(1);",
        "                }",
        "            }",
        "        }",
    ]);

    parserCPP.push(...[
        "        if(parserParams.stage <= 3) {",
        "            for(uint64_t j = 0; j < nrowsBatch; ++j) {",
        "                uint64_t l = i + j;",
        "                if(l >= domainSize) l -= domainSize;",
        "                for(uint64_t k = 0; k < nColsCm2; ++k) {",
        "                    params.pols[offsetCm2 + l * nColsCm2 + k] = bufferT[bOffsetCm2 + k*nrowsBuff + j];",
        "                }",
        "                for(uint64_t k = 0; k < nColsCm3; ++k) {",
        "                    params.pols[offsetCm3 + l * nColsCm3 + k] = bufferT[bOffsetCm3 + k*nrowsBuff + j];",
        "                }",
        "                for(uint64_t k = 0; k < nColsTmpExp; ++k) {",
        "                   params.pols[offsetTmpExp + l * nColsTmpExp + k] = bufferT[bOffsetTmpExp + k*nrowsBuff + j];",
        "                }",
        "            }",
        "        }"
    ]);
    

    parserCPP.push(...[
        `        if (i_args != parserParams.nArgs) std::cout << " " << i_args << " - " << parserParams.nArgs << std::endl;`,
        "        assert(i_args == parserParams.nArgs);",
        "    }"
        ]);

    parserCPP.push("}");
       
    
    const parserCPPCode = parserCPP.join("\n");

    return parserCPPCode;

    function writeOperation(operation) {
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

        let typeDest = writeType(operation.dest_type);
        c_args += nArgs(operation.dest_type);

        let typeSrc0 = writeType(operation.src0_type);
        c_args += nArgs(operation.src0_type);

        let typeSrc1;

        const operationCall = [];

        if(["commit1", "const"].includes(operation.src0_type)) {
            operationCall.push(`                    Goldilocks::load_avx(tmp1_0, ${typeSrc0});`);
            typeSrc0 = "tmp1_0";
        } else if ("x" === operation.src0_type){
            operationCall.push(`                    Goldilocks::load_avx(tmp1_0, ${typeSrc0}, x.offset());`);
            typeSrc0 = "tmp1_0";
        } else if(operation.src0_type === "commit3") {
            operationCall.push(`                    Goldilocks::load_avx(tmp3_0[0], ${typeSrc0});`);
            operationCall.push(`                    Goldilocks::load_avx(tmp3_0[1], ${typeSrc0.substring(0, typeSrc0.length - 1)} + nrowsBuff]);`);
            operationCall.push(`                    Goldilocks::load_avx(tmp3_0[2], ${typeSrc0.substring(0, typeSrc0.length - 1)} + 2*nrowsBuff]);`);
            typeSrc0 = "tmp3_0";
        } else if(["xDivXSubXi", "xDivXSubWXi"].includes(operation.src0_type)) {
            operationCall.push(`                    Goldilocks3::load_avx(tmp3_0, ${typeSrc0}, params.${operation.src0_type}.offset());`);
            typeSrc0 = "tmp3_0";
        }

        if(operation.src1_type) {
            typeSrc1 = writeType(operation.src1_type);

            if(["commit1", "const"].includes(operation.src1_type)) {
                operationCall.push(`                    Goldilocks::load_avx(tmp1_1, ${typeSrc1});`);
                typeSrc1 = "tmp1_1";
            } else if ("x" === operation.src1_type){
                operationCall.push(`                    Goldilocks::load_avx(tmp1_1, ${typeSrc1}, x.offset());`);
                typeSrc1 = "tmp1_1";
            } else if(operation.src1_type === "commit3") {
                operationCall.push(`                    Goldilocks::load_avx(tmp3_1[0], ${typeSrc1});`);
                operationCall.push(`                    Goldilocks::load_avx(tmp3_1[1], ${typeSrc1.substring(0, typeSrc1.length - 1)} + nrowsBuff]);`);
                operationCall.push(`                    Goldilocks::load_avx(tmp3_1[2], ${typeSrc1.substring(0, typeSrc1.length - 1)} + 2*nrowsBuff]);`);
                typeSrc1 = "tmp3_1";
            } else if(["xDivXSubXi", "xDivXSubWXi"].includes(operation.src1_type)) {
                operationCall.push(`                    Goldilocks3::load_avx(tmp3_1, ${typeSrc1}, params.${operation.src1_type}.offset());`);
                typeSrc1 = "tmp3_1";
            }

            c_args += nArgs(operation.src1_type);
        }

        if(operation.dest_type === "commit1") {
            name += "tmp1_, ";
        } else if(operation.dest_type === "commit3") {
            name += "tmp3_, ";
        } else {
            name += typeDest + ", ";
        }

        name += typeSrc0 + ", ";
        if(operation.src1_type) name += typeSrc1 + ", ";

        name = name.substring(0, name.lastIndexOf(", ")) + ");";

        operationCall.push(`                    ${name}`);

        if(operation.dest_type === "commit1") {
            operationCall.push(`                    Goldilocks::store_avx(${typeDest}, tmp1_);`);
        } else if(operation.dest_type === "commit3") {
            operationCall.push(`                    Goldilocks::store_avx(${typeDest}, tmp3_[0]);`);
            operationCall.push(`                    Goldilocks::store_avx(${typeDest.substring(0, typeDest.length - 1)} + nrowsBuff], tmp3_[1]);`);
            operationCall.push(`                    Goldilocks::store_avx(${typeDest.substring(0, typeDest.length - 1)} + 2*nrowsBuff], tmp3_[2]);`);
        }

        return operationCall.join("\n").replace(/i_args \+ 0/, "i_args");
    }

    function writeType(type) {
        switch (type) {
            case "public":
                return `publics[parserParams.args[i_args + ${c_args}]]`;
            case "tmp1":
                return `tmp1[parserParams.args[i_args + ${c_args}]]`; 
            case "tmp3":
                return `tmp3[parserParams.args[i_args + ${c_args}]]`;
            case "commit1":
            case "commit3":
            case "const":
                    return `&bufferT[parserParams.args[i_args + ${c_args}] + nrowsBuff * parserParams.args[i_args + ${c_args + 1}] + parserParams.args[i_args + ${c_args + 2}]]`;
            case "challenge":
                return `challenges[parserParams.args[i_args + ${c_args}]]`;
            case "eval":
                return `evals[parserParams.args[i_args + ${c_args}]]`;
            case "number":
                return `numbers[parserParams.args[i_args + ${c_args}]]`;
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

    const possibleSrcDim1 = [ "commit1", "tmp1", "public", "x", "number" ];
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

    possibleOps.push({ dest_type: "tmp3", src0_type: "eval", src1_type: "commit1"});
    possibleOps.push({ dest_type: "tmp3", src0_type: "commit3", src1_type: "eval"});
    
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
        } else if(r.src[i].type === "const") {
            _op[[`src${i}_type`]] = "commit1";
        } else if(r.src[i].type === "tmp") {
            _op[`src${i}_type`] =  `tmp${r.src[i].dim}`;
        } else {
            _op[`src${i}_type`] = r.src[i].type;
        }
    }

    return _op;
}
