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
    "xDivXSubWXi": 11,
    "q": 12, 
    "f": 13,
}

module.exports.generateParser = function generateParser(operations, operationsUsed, vectorizeEvals = false) {

    let c_args = 0;
    
    const parserCPP = [
        "    uint64_t domainSize = domainExtended ? 1 << starkInfo.starkStruct.nBitsExt : 1 << starkInfo.starkStruct.nBits;",
        "    Polinomial &x = domainExtended ? params.x_2ns : params.x_n;", 
        "    ConstantPolsStarks *constPols = domainExtended ? params.pConstPols2ns : params.pConstPols;",
        "    Goldilocks3::Element_avx challenges[params.challenges.degree()];",
        "    Goldilocks3::Element_avx challenges_ops[params.challenges.degree()];\n",
        "    uint8_t *ops = &parserArgs.ops[parserParams.opsOffset];\n",
        "    uint16_t *args = &parserArgs.args[parserParams.argsOffset]; \n",
        "    uint64_t* numbers = &parserArgs.numbers[parserParams.numbersOffset];\n",
        "    __m256i numbers_[parserParams.nNumbers];\n",
        "    uint64_t nStages = 3;",
        "    uint64_t nextStride = domainExtended ? 1 << (starkInfo.starkStruct.nBitsExt - starkInfo.starkStruct.nBits) : 1;",
        "    uint64_t nextStrides[2] = { 0, nextStride };",
    ];

    
    parserCPP.push(...[
        `    uint64_t nCols = starkInfo.nConstants;`,
        `    uint64_t buffTOffsetsSteps_[nStages + 2];`,
        `    uint64_t nColsSteps[nStages + 2];`,
        `    uint64_t offsetsSteps[nStages + 2];\n`,
        `    nColsSteps[0] = starkInfo.nConstants;`,
        `    buffTOffsetsSteps_[0] = 0;`,
        `    offsetsSteps[1] = domainExtended ? starkInfo.mapOffsets.section[eSection::cm1_2ns] : starkInfo.mapOffsets.section[eSection::cm1_n];`,
        `    nColsSteps[1] = starkInfo.mapSectionsN.section[eSection::cm1_2ns];`,
        `    buffTOffsetsSteps_[1] = 2*nColsSteps[0];`,
        `    nCols += nColsSteps[1];\n`,
        `    offsetsSteps[2] = domainExtended ? starkInfo.mapOffsets.section[eSection::cm2_2ns] : starkInfo.mapOffsets.section[eSection::cm2_n];`,
        `    nColsSteps[2] = starkInfo.mapSectionsN.section[eSection::cm2_2ns];`,
        `    buffTOffsetsSteps_[2] = buffTOffsetsSteps_[1] + 2*nColsSteps[1];`,
        `    nCols += nColsSteps[2];\n`,
        `    offsetsSteps[3] = domainExtended ? starkInfo.mapOffsets.section[eSection::cm3_2ns] : starkInfo.mapOffsets.section[eSection::cm3_n];`,
        `    nColsSteps[3] = starkInfo.mapSectionsN.section[eSection::cm3_2ns];`,
        `    buffTOffsetsSteps_[3] = buffTOffsetsSteps_[2] + 2*nColsSteps[2];`,
        `    nCols += nColsSteps[3];\n`,
    ]);

    parserCPP.push(...[
        "    if(parserParams.stage <= nStages) {",
        `        offsetsSteps[4] = starkInfo.mapOffsets.section[eSection::tmpExp_n];`,
        `        nColsSteps[4] = starkInfo.mapSectionsN.section[eSection::tmpExp_n];`,
        "    } else {",
        `        offsetsSteps[4] = starkInfo.mapOffsets.section[eSection::cm4_2ns];`,
        `        nColsSteps[4] = starkInfo.mapSectionsN.section[eSection::cm4_2ns];`,
        "    }",
        `    buffTOffsetsSteps_[4] = buffTOffsetsSteps_[3] + 2*nColsSteps[3];`,
        `    nCols += nColsSteps[4];\n`,
    ]);
       
    parserCPP.push(...[
        "#pragma omp parallel for",
        "    for(uint64_t i = 0; i < params.challenges.degree(); ++i) {",
        "        challenges[i][0] = _mm256_set1_epi64x(params.challenges[i][0].fe);",
        "        challenges[i][1] = _mm256_set1_epi64x(params.challenges[i][1].fe);",
        "        challenges[i][2] = _mm256_set1_epi64x(params.challenges[i][2].fe);\n",
        "        Goldilocks::Element challenges_aux[3];",
        "        challenges_aux[0] = params.challenges[i][0] + params.challenges[i][1];",
        "        challenges_aux[1] = params.challenges[i][0] + params.challenges[i][2];",
        "        challenges_aux[2] = params.challenges[i][1] + params.challenges[i][2];",
        "        challenges_ops[i][0] = _mm256_set1_epi64x(challenges_aux[0].fe);",
        "        challenges_ops[i][1] =  _mm256_set1_epi64x(challenges_aux[1].fe);",
        "        challenges_ops[i][2] =  _mm256_set1_epi64x(challenges_aux[2].fe);",
        "    }",
    ]);

    parserCPP.push(...[
        "#pragma omp parallel for",
        "    for(uint64_t i = 0; i < parserParams.nNumbers; ++i) {",
        "        numbers_[i] = _mm256_set1_epi64x(numbers[i]);",
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
        `#pragma omp parallel for`,
        `    for (uint64_t i = 0; i < domainSize; i+= nrowsBatch) {`,
        "        bool const needModule = i + nrowsBatch + nextStride >= domainSize;",
        "        uint64_t i_args = 0;\n",
        "        uint64_t offsetsDest[4];",
        "        __m256i tmp1[parserParams.nTemp1];",
        "        Goldilocks3::Element_avx tmp3[parserParams.nTemp3];",
        "        Goldilocks3::Element_avx tmp3_;",
        "        // Goldilocks3::Element_avx tmp3_0;",
        "        Goldilocks3::Element_avx tmp3_1;",
        "        // __m256i tmp1_0;",
        "        __m256i tmp1_1;",
        "        __m256i bufferT_[2*nCols];\n",
    ]); 

    parserCPP.push(...[
        "        uint64_t kk = 0;",
        "        Goldilocks::Element bufferT[2*nrowsBatch];\n",
        "        for(uint64_t k = 0; k < nColsSteps[0]; ++k) {",
        "            for(uint64_t o = 0; o < 2; ++o) {",
        "                for(uint64_t j = 0; j < nrowsBatch; ++j) {",
        "                    uint64_t l = (i + j + nextStrides[o]) % domainSize;",
        "                    bufferT[nrowsBatch*o + j] = ((Goldilocks::Element *)constPols->address())[l * nColsSteps[0] + k];",
        "                }",
        "                Goldilocks::load_avx(bufferT_[kk++], &bufferT[nrowsBatch*o]);",
        "            }",
        "        }",
        "        for(uint64_t s = 1; s <= nStages; ++s) {",
        "            if(parserParams.stage < s) break;",
        "            for(uint64_t k = 0; k < nColsSteps[s]; ++k) {",
        "                for(uint64_t o = 0; o < 2; ++o) {",
        "                    for(uint64_t j = 0; j < nrowsBatch; ++j) {",
        "                        uint64_t l = (i + j + nextStrides[o]) % domainSize;",
        "                        bufferT[nrowsBatch*o + j] = params.pols[offsetsSteps[s] + l * nColsSteps[s] + k];",
        "                    }",
        "                    Goldilocks::load_avx(bufferT_[kk++], &bufferT[nrowsBatch*o]);",
        "                }",
        "            }",
        "        }",
        "        for(uint64_t k = 0; k < nColsSteps[nStages + 1]; ++k) {",
        "            for(uint64_t o = 0; o < 2; ++o) {",
        "                for(uint64_t j = 0; j < nrowsBatch; ++j) {",
        "                    uint64_t l = (i + j + nextStrides[o]) % domainSize;",
        "                    bufferT[nrowsBatch*o + j] = params.pols[offsetsSteps[nStages + 1] + l * nColsSteps[nStages + 1] + k];",
        "                }",
        "                Goldilocks::load_avx(bufferT_[kk++], &bufferT[nrowsBatch*o]);",
        "            }",
        "        }"
    ]);
    
    parserCPP.push(...[
        "\n",
        "        for (uint64_t kk = 0; kk < parserParams.nOps; ++kk) {",
        `            switch (ops[kk]) {`,
    ]);
           
    for(let i = 0; i < operations.length; i++) {
        if(operationsUsed && !operationsUsed.includes(i)) continue;
        const op = operations[i];
        
        
        const operationCase = [`            case ${i}: {`];
        
        if(!op.isGroupOps) {
            let operationDescription;
            if(op.op === "mul") {
                operationDescription = `                    // MULTIPLICATION WITH DEST: ${op.dest_type} - SRC0: ${op.src0_type} - SRC1: ${op.src1_type}`;
            } else if(op.src1_type) {
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
                let numberArgs = numberOfArgs(opr.dest_type) + numberOfArgs(opr.src0_type);
                if(opr.src1_type && opr.dest_type !== "q") numberArgs += numberOfArgs(opr.src1_type) + 1;
                operationCase.push(`                    i_args += ${numberArgs};`);
            }
        } else {
            operationCase.push(writeOperation(op));
            let numberArgs = numberOfArgs(op.dest_type) + numberOfArgs(op.src0_type);
            if(op.src1_type && op.dest_type !== "q") numberArgs += numberOfArgs(op.src1_type) + 1;
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
        `        if (i_args != parserParams.nArgs) std::cout << " " << i_args << " - " << parserParams.nArgs << std::endl;`,
        "        assert(i_args == parserParams.nArgs);",
        "    }"
        ]);

    parserCPP.push("}");
       
    
    const parserCPPCode = parserCPP.map(l => `    ${l}`).join("\n");

    return parserCPPCode;

    function writeOperation(operation) {
        if(operation.dest_type === "q") {
            const qOperation = [
                "                    Goldilocks::Element tmp_inv[3];",
                "                    Goldilocks::Element ti0[4];",
                "                    Goldilocks::Element ti1[4];",
                "                    Goldilocks::Element ti2[4];",
                `                    Goldilocks::store_avx(ti0, tmp3[args[i_args]][0]);`,
                `                    Goldilocks::store_avx(ti1, tmp3[args[i_args]][1]);`,
                `                    Goldilocks::store_avx(ti2, tmp3[args[i_args]][2]);`,
                "                    for (uint64_t j = 0; j < AVX_SIZE_; ++j) {",
                "                        tmp_inv[0] = ti0[j];",
                "                        tmp_inv[1] = ti1[j];",
                "                        tmp_inv[2] = ti2[j];",
                "                        Goldilocks3::mul((Goldilocks3::Element &)(params.q_2ns[(i + j) * 3]), params.zi[i + j][0],(Goldilocks3::Element &)tmp_inv);",
                "                    }",
            ].join("\n");
            return qOperation;
        } else if(operation.dest_type === "f" && !operation.src1_type) {
            const fOperation = [
                "                    Goldilocks3::copy_avx(tmp3_, tmp3[args[i_args]]);",
                "                    Goldilocks3::store_avx(&params.f_2ns[i*3], uint64_t(3), tmp3_);",
            ].join("\n");
            return fOperation;
        }
        let name = ["tmp1", "commit1"].includes(operation.dest_type) ? "Goldilocks::" : "Goldilocks3::";
        
        if(operation.op === "mul") {
            name += "mul";
        } else if (operation.src1_type) {
            name += "op";
        } else {
            name += "copy";
        }

        if(["tmp3", "commit3"].includes(operation.dest_type)) {
            if(operation.src1_type)  {
                let dimType = "";
                let dims1 = ["public", "x", "commit1", "tmp1", "const", "number"];
                let dims3 = ["commit3", "tmp3", "challenge", "eval", "xDivXSubXi"];
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
            if(!operation.op) {
                name += `args[i_args + ${c_args}], `;
            }
            c_args++;
        }      

        let typeDest = writeType(operation.dest_type);

        let operationStoreAvx = [];

        if(operation.dest_type === "commit1" || operation.dest_type === "commit3") {
            operationStoreAvx.push(...[
                `                    if(needModule) {`,
                `                        uint64_t stepOffset = offsetsSteps[args[i_args + ${c_args}]] + args[i_args + ${c_args + 1}];`,
                `                        uint64_t nextStrideOffset = i + nextStride * args[i_args + ${c_args + 2}];`,
                `                        offsetsDest[0] = stepOffset + (nextStrideOffset % domainSize) * nColsSteps[args[i_args + ${c_args}]];`,
                `                        offsetsDest[1] = stepOffset + ((nextStrideOffset + 1) % domainSize) * nColsSteps[args[i_args + ${c_args}]];`,
                `                        offsetsDest[2] = stepOffset + ((nextStrideOffset + 2) % domainSize) * nColsSteps[args[i_args + ${c_args}]];`,
                `                        offsetsDest[3] = stepOffset + ((nextStrideOffset + 3) % domainSize) * nColsSteps[args[i_args + ${c_args}]];`,
            ]);
            if(operation.dest_type === "commit1") {
                operationStoreAvx.push(`                        Goldilocks::store_avx(&params.pols[0], offsetsDest, ${typeDest});`);
            } else {
                operationStoreAvx.push(`                        Goldilocks3::store_avx(&params.pols[0], offsetsDest, &${typeDest}, 2);`);
            }
            operationStoreAvx.push(`                    } else {`);
            if(operation.dest_type === "commit1") {
                operationStoreAvx.push(`                        Goldilocks::store_avx(&params.pols[offsetsSteps[args[i_args + ${c_args}]] + args[i_args + ${c_args + 1}] + (i + nextStride * args[i_args + ${c_args + 2}]) * nColsSteps[args[i_args + ${c_args}]]], nColsSteps[args[i_args + ${c_args}]], ${typeDest});`);
            } else {
                operationStoreAvx.push(`                        Goldilocks3::store_avx(&params.pols[offsetsSteps[args[i_args + ${c_args}]] + args[i_args + ${c_args + 1}] + (i + nextStride * args[i_args + ${c_args + 2}]) * nColsSteps[args[i_args + ${c_args}]]], nColsSteps[args[i_args + ${c_args}]], &${typeDest}, 2);`);
            }
            operationStoreAvx.push(`                    }`);
        } else if(operation.dest_type === "f") {
            operationStoreAvx.push(`                    Goldilocks3::store_avx(&params.f_2ns[i*3], uint64_t(3), tmp3_);`,)
        }


        c_args += numberOfArgs(operation.dest_type);

        let typeSrc0 = writeType(operation.src0_type);
        c_args += numberOfArgs(operation.src0_type);

        let typeSrc1;

        const operationCall = [];

        if ("x" === operation.src0_type){
            operationCall.push(`                    Goldilocks::load_avx(tmp1_0, ${typeSrc0}, x.offset());`);
            typeSrc0 = "tmp1_0";
        } else if(["xDivXSubXi"].includes(operation.src0_type)) {
            operationCall.push(`                    Goldilocks3::load_avx(tmp3_0, ${typeSrc0}, params.${operation.src0_type}.offset());`);
            typeSrc0 = "tmp3_0";
        } 

        if(operation.src1_type) {
            typeSrc1 = writeType(operation.src1_type);

            if ("x" === operation.src1_type){
                operationCall.push(`                    Goldilocks::load_avx(tmp1_1, ${typeSrc1}, x.offset());`);
                typeSrc1 = "tmp1_1";
            } else if(["xDivXSubXi"].includes(operation.src1_type)) {
                operationCall.push(`                    Goldilocks3::load_avx(tmp3_1, ${typeSrc1}, params.${operation.src1_type}.offset());`);
                typeSrc1 = "tmp3_1";
            }

            c_args += numberOfArgs(operation.src1_type);
        }

        if(operation.dest_type == "commit3" || (operation.src0_type === "commit3") || (operation.src1_type && operation.src1_type === "commit3")) {
            if(operation.dest_type === "commit3") {
                name += `&${typeDest}, 2, \n                        `;
            } else {
                name += `&(${typeDest}[0]), 1, \n                        `;
            }

            if(operation.src0_type === "commit3") {
                name += `&${typeSrc0}, 2, \n                        `;
            } else if(["tmp3", "challenge", "eval"].includes(operation.src0_type)) {
                name += `&(${typeSrc0}[0]), 1, \n                        `;
            } else {
                name += typeSrc0 + ", ";
            }
            if(operation.src1_type) {
                if(operation.src1_type === "commit3") {
                    name += `&${typeSrc1}, 2, \n                        `;
                } else if(["tmp3", "eval"].includes(operation.src1_type) || (!operation.op && operation.src1_type === "challenge")) {
                    name += `&(${typeSrc1}[0]), 1, \n                        `;
                } else if(operation.op === "mul" && operation.src1_type === "challenge") {
                    name += `${typeSrc1}, ${typeSrc1.replace("challenges", "challenges_ops")}, \n                        `;
                } else {
                    name += typeSrc1 + ", ";
                }
            }
        } else {
            if(operation.dest_type === "f") {
                name += "tmp3_, ";
	        } else {
                name += typeDest + ", ";
            }
            name += typeSrc0 + ", ";
            if(operation.src1_type) {
                if(operation.op === "mul" && operation.src1_type === "challenge") {
                    name += `${typeSrc1}, ${typeSrc1.replace("challenges", "challenges_ops")}, \n                        `;
                } else {
                    name += typeSrc1 + ", ";
                }
            }
        }

        

        name = name.substring(0, name.lastIndexOf(", ")) + ");";

        operationCall.push(`                    ${name}`);
        operationCall.push(...operationStoreAvx);

        return operationCall.join("\n").replace(/i_args \+ 0/g, "i_args");
    }

    function writeType(type) {
        switch (type) {
            case "public":
                return `publics[args[i_args + ${c_args}]]`;
            case "tmp1":
                return `tmp1[args[i_args + ${c_args}]]`; 
            case "tmp3":
                return `tmp3[args[i_args + ${c_args}]]`;
            case "commit1":
            case "commit3":
            case "const":
                    return `bufferT_[buffTOffsetsSteps_[args[i_args + ${c_args}]] + 2 * args[i_args + ${c_args + 1}] + args[i_args + ${c_args + 2}]]`;
            case "challenge":
                return `challenges[args[i_args + ${c_args}]]`;
            case "eval":
                return `evals[args[i_args + ${c_args}]]`;
            case "number":
                return `numbers_[args[i_args + ${c_args}]]`;
            case "x":
                return `x[i]`;
            case "xDivXSubXi": 
                return `params.xDivXSubXi[i + args[i_args + ${c_args}]*domainSize]`;
            case "f":
                return "&params.f_2ns[i*3]";
            default:
                throw new Error("Invalid type: " + type);
        }
    }

    function numberOfArgs(type) {
        switch (type) {
            case "x":
            case "Zi":
            case "q":
            case "f":
                return 0; 
            case "public":            
            case "tmp1":
            case "tmp3":
            case "challenge":
            case "eval":
            case "number":
            case "xDivXSubXi":
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
                if(src0_type === "challenge") {
                    possibleOps.push({op: "mul", dest_type, src0_type: src1_type, src1_type: src0_type});
                } else if(src1_type === "challenge") {
                    possibleOps.push({op: "mul", dest_type, src0_type, src1_type});
                }
                possibleOps.push({dest_type, src0_type, src1_type})
            }
        }
    }

    // Step FRI
    possibleOps.push({ dest_type: "tmp3", src0_type: "eval"});
    possibleOps.push({ op: "mul", dest_type: "tmp3", src0_type: "eval", src1_type: "challenge"});
    possibleOps.push({ dest_type: "tmp3", src0_type: "challenge", src1_type: "eval"});
    possibleOps.push({ dest_type: "tmp3", src0_type: "tmp3", src1_type: "eval"});

    possibleOps.push({ dest_type: "tmp3", src0_type: "eval", src1_type: "commit1"});
    possibleOps.push({ dest_type: "tmp3", src0_type: "commit3", src1_type: "eval"});
    
    possibleOps.push({ dest_type: "tmp3", src0_type: "tmp3", src1_type: "xDivXSubXi"});

    possibleOps.push({ dest_type: "q", src0_type: "tmp3", src1_type: "Zi"});
    possibleOps.push({ dest_type: "f", src0_type: "tmp3", src1_type: "tmp3"});
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
        } else if(["xDivXSubXi", "xDivXSubWXi"].includes(r.src[i].type)) {
            _op[`src${i}_type`] = "xDivXSubXi";
        } else {
            _op[`src${i}_type`] = r.src[i].type;
        }
    }

    return _op;
}
