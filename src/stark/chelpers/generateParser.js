const operationsMap = {
    "commit1": 1,
    "x": 2,
    "const": 2,
    "tmp1": 3,
    "public": 4,
    "number": 6,
    "commit3": 7,
    "xDivXSubXi": 7,
    "xDivXSubWXi": 7,
    "q": 7, 
    "f": 7,
    "tmp3": 8,
    "challenge": 9, 
    "eval": 10,
}

module.exports.generateParser = function generateParser(operations, operationsUsed, parserType = "avx") {

    let c_args = 0;

    if(!["avx", "avx512", "pack"].includes(parserType)) throw new Error("Invalid parser type");

    let isAvx = ["avx", "avx512"].includes(parserType);

    let avxTypeElement;
    let avxTypeExtElement;
    let avxSet1Epi64;
    let avxLoad;
    let avxStore;

    if(isAvx) {
        avxTypeElement = parserType === "avx" ? "__m256i" : "__m512i";
        avxTypeExtElement = parserType === "avx" ? "Goldilocks3::Element_avx" : "Goldilocks3::Element_avx512";
        avxSet1Epi64 = parserType === "avx" ? "_mm256_set1_epi64x" : "_mm512_set1_epi64";
        avxLoad = parserType === "avx" ? "load_avx" : "load_avx512";
        avxStore = parserType === "avx" ? "store_avx" : "store_avx512";
    }
    
    let functionType = !operationsUsed ? "virtual void" : "void";
    const parserCPP = [];

    if(parserType === "avx") {
        parserCPP.push("uint64_t nrowsPack = 4;");
    } else if (parserType === "avx512") {
        parserCPP.push("uint64_t nrowsPack = 8;");
    }

    parserCPP.push(...[
        "uint64_t nCols;",
        "vector<uint64_t> nColsStages;",
        "vector<uint64_t> nColsStagesAcc;",
        "vector<uint64_t> offsetsStages;\n",
        `inline ${functionType} setBufferTInfo(StarkInfo& starkInfo, uint64_t stage) {`,
        "    bool domainExtended = stage <= 3 ? false : true;",
        "    nColsStagesAcc.resize(10 + 2);",
        "    nColsStages.resize(10 + 2);",
        "    offsetsStages.resize(10 + 2);\n",
        "    nColsStages[0] = starkInfo.nConstants + 2;",
        "    offsetsStages[0] = 0;\n",
        "    for(uint64_t s = 1; s <= 3; ++s) {",
        `        nColsStages[s] = starkInfo.mapSectionsN.section[string2section("cm" + to_string(s) + "_n")];`,
        "        if(domainExtended) {",
        `            offsetsStages[s] = starkInfo.mapOffsets.section[string2section("cm" + to_string(s) + "_2ns")];`,
        "        } else {",
        `            offsetsStages[s] = starkInfo.mapOffsets.section[string2section("cm" + to_string(s) + "_n")];`,
        "        }",
        "    }",
        "    if(domainExtended) {",
        "        nColsStages[4] = starkInfo.mapSectionsN.section[eSection::cm4_2ns];",
        "        offsetsStages[4] = starkInfo.mapOffsets.section[eSection::cm4_2ns];",
        "    } else {",
        "        nColsStages[4] = starkInfo.mapSectionsN.section[eSection::tmpExp_n];",
        "        offsetsStages[4] = starkInfo.mapOffsets.section[eSection::tmpExp_n];",
        "    }",
        "    for(uint64_t o = 0; o < 2; ++o) {",
        "        for(uint64_t s = 0; s < 5; ++s) {",
        "            if(s == 0) {",
        "                if(o == 0) {",
        "                    nColsStagesAcc[0] = 0;",
        "                } else {",
        "                    nColsStagesAcc[5*o] = nColsStagesAcc[5*o - 1] + nColsStages[4];",
        "                }",
        "            } else {",
        "                nColsStagesAcc[5*o + s] = nColsStagesAcc[5*o + (s - 1)] + nColsStages[(s - 1)];",
        "            }",
        "        }",
        "    }",
        "    nColsStagesAcc[10] = nColsStagesAcc[9] + nColsStages[9]; // Polinomials f & q",
        "    if(stage == 4) {",
        "        offsetsStages[10] = starkInfo.mapOffsets.section[eSection::q_2ns];",
        "        nColsStages[10] = starkInfo.qDim;",
        "    } else if(stage == 5) {",
        "        offsetsStages[10] = starkInfo.mapOffsets.section[eSection::f_2ns];",
        "        nColsStages[10] = 3;",
        "    }",
        "    nColsStagesAcc[11] = nColsStagesAcc[10] + 3; // xDivXSubXi", 
        "    nCols = nColsStagesAcc[11] + 6;",
        "}\n",
    ]);

    parserCPP.push(...[
        `inline ${functionType} storePolinomials(StarkInfo &starkInfo, StepsParams &params, ${isAvx ? avxTypeElement : "Goldilocks::Element"} *bufferT_, uint8_t* storePol, uint64_t row, uint64_t nrowsPack, uint64_t domainExtended) {`,
        "    if(domainExtended) {",
        "        // Store either polinomial f or polinomial q",
        "        for(uint64_t k = 0; k < nColsStages[10]; ++k) {",
        `            ${isAvx ? avxTypeElement : "Goldilocks::Element"} *buffT = &bufferT_[(nColsStagesAcc[10] + k)${!isAvx ? "* nrowsPack" : ""}];`,
        `            Goldilocks::${isAvx ? avxStore : "copy_pack"}(${!isAvx ? "nrowsPack, " : ""}&params.pols[offsetsStages[10] + k + row * nColsStages[10]], nColsStages[10], ${!isAvx ? "buffT" : "buffT[0]"});`,
        "        }",
        "    } else {",
        "        uint64_t nStages = 3;",
        "        uint64_t domainSize = domainExtended ? 1 << starkInfo.starkStruct.nBitsExt : 1 << starkInfo.starkStruct.nBits;",
        "        for(uint64_t s = 2; s <= nStages + 1; ++s) {",
        "            bool isTmpPol = !domainExtended && s == 4;",
        "            for(uint64_t k = 0; k < nColsStages[s]; ++k) {",
        "                uint64_t dim = storePol[nColsStagesAcc[s] + k];",
        "                if(storePol[nColsStagesAcc[s] + k]) {",
        `                    ${isAvx ? avxTypeElement : "Goldilocks::Element"} *buffT = &bufferT_[(nColsStagesAcc[s] + k)${!isAvx ? "* nrowsPack" : ""}];`,
        "                    if(isTmpPol) {",
        "                        for(uint64_t i = 0; i < dim; ++i) {",
        `                            Goldilocks::${isAvx ? avxStore : "copy_pack"}(${!isAvx ? "nrowsPack, " : ""}&params.pols[offsetsStages[s] + k * domainSize + row * dim + i], uint64_t(dim), ${!isAvx ? "&buffT[i*nrowsPack]" : "buffT[i]"});`,
        "                        }",
        "                    } else {",
        `                        Goldilocks::${isAvx ? avxStore : "copy_pack"}(${!isAvx ? "nrowsPack, " : ""}&params.pols[offsetsStages[s] + k + row * nColsStages[s]], nColsStages[s], ${!isAvx ? "buffT" : "buffT[0]"});`,
        "                    }",
        "                }",
        "            }",
        "        }",
        "    }",
        "}\n",
    ]);

    if(isAvx) {
        parserCPP.push(...[
            `inline ${functionType} loadPolinomials(StarkInfo &starkInfo, StepsParams &params, ${avxTypeElement} *bufferT_, uint64_t row, uint64_t stage, uint64_t nrowsPack, uint64_t domainExtended) {`,
            "    Goldilocks::Element bufferT[2*nrowsPack];",
            "    ConstantPolsStarks *constPols = domainExtended ? params.pConstPols2ns : params.pConstPols;",
            "    Polinomial &x = domainExtended ? params.x_2ns : params.x_n;",
            "    uint64_t domainSize = domainExtended ? 1 << starkInfo.starkStruct.nBitsExt : 1 << starkInfo.starkStruct.nBits;",
            "    uint64_t nStages = 3;",
            "    uint64_t nextStride = domainExtended ?  1 << (starkInfo.starkStruct.nBitsExt - starkInfo.starkStruct.nBits) : 1;",
            "    std::vector<uint64_t> nextStrides = {0, nextStride};",
            "    for(uint64_t k = 0; k < starkInfo.nConstants; ++k) {",
            "        for(uint64_t o = 0; o < 2; ++o) {",
            "            for(uint64_t j = 0; j < nrowsPack; ++j) {",
            "                uint64_t l = (row + j + nextStrides[o]) % domainSize;",
            "                bufferT[nrowsPack*o + j] = ((Goldilocks::Element *)constPols->address())[l * starkInfo.nConstants + k];",
            "            }",
            `            Goldilocks::${avxLoad}(bufferT_[nColsStagesAcc[5*o] + k], &bufferT[nrowsPack*o]);`,
            "        }",
            "    }\n",
            "    // Load x and Zi",
            "    for(uint64_t j = 0; j < nrowsPack; ++j) {",
            "        bufferT[j] = x[row + j][0];",
            "    }",
            `    Goldilocks::${avxLoad}(bufferT_[starkInfo.nConstants], &bufferT[0]);`,
            "    for(uint64_t j = 0; j < nrowsPack; ++j) {",
            "        bufferT[j] = params.zi[row + j][0];",
            "    }\n",
            `    Goldilocks::${avxLoad}(bufferT_[starkInfo.nConstants + 1], &bufferT[0]);\n`,
            "    for(uint64_t s = 1; s <= nStages; ++s) {",
            "        if(stage < s) break;",
            "        for(uint64_t k = 0; k < nColsStages[s]; ++k) {",
            "            for(uint64_t o = 0; o < 2; ++o) {",
            "                for(uint64_t j = 0; j < nrowsPack; ++j) {",
            "                    uint64_t l = (row + j + nextStrides[o]) % domainSize;",
            "                    bufferT[nrowsPack*o + j] = params.pols[offsetsStages[s] + l * nColsStages[s] + k];",
            "                }",
            `                Goldilocks::${avxLoad}(bufferT_[nColsStagesAcc[5*o + s] + k], &bufferT[nrowsPack*o]);`,
            "            }",
            "        }",
            "    }\n",
            "    if(stage == 5) {",
            "       for(uint64_t k = 0; k < nColsStages[nStages + 1]; ++k) {",
            "           for(uint64_t o = 0; o < 2; ++o) {",
            "               for(uint64_t j = 0; j < nrowsPack; ++j) {",
            "                   uint64_t l = (row + j + nextStrides[o]) % domainSize;",
            "                   bufferT[nrowsPack*o + j] = params.pols[offsetsStages[nStages + 1] + l * nColsStages[nStages + 1] + k];",
            "               }",
            `               Goldilocks::${avxLoad}(bufferT_[nColsStagesAcc[5*o + nStages + 1] + k], &bufferT[nrowsPack*o]);`,
            "           }",
            "       }\n",
            "       // Load xDivXSubXi & xDivXSubWXi",
            "       for(uint64_t d = 0; d < 2; ++d) {",
            "           for(uint64_t i = 0; i < FIELD_EXTENSION; ++i) {",
            "               for(uint64_t j = 0; j < nrowsPack; ++j) {",
            "                   bufferT[j] = params.xDivXSubXi[d*domainSize + row + j][i];",
            "               }",
            `               Goldilocks::${avxLoad}(bufferT_[nColsStagesAcc[11] + FIELD_EXTENSION*d + i], &bufferT[0]);`,
            "           }",
            "       }",
            "   }",
            "}\n",
        ]);    
    } else {
        parserCPP.push(...[
            `inline ${functionType} loadPolinomials(StarkInfo &starkInfo, StepsParams &params, Goldilocks::Element *bufferT_, uint64_t row, uint64_t stage, uint64_t nrowsPack, uint64_t domainExtended) {`,
            "    ConstantPolsStarks *constPols = domainExtended ? params.pConstPols2ns : params.pConstPols;",
            "    uint64_t domainSize = domainExtended ? 1 << starkInfo.starkStruct.nBitsExt : 1 << starkInfo.starkStruct.nBits;",
            "    Polinomial &x = domainExtended ? params.x_2ns : params.x_n;",
            "    uint64_t nStages = 3;",
            "    uint64_t nextStride = domainExtended ?  1 << (starkInfo.starkStruct.nBitsExt - starkInfo.starkStruct.nBits) : 1;",
            "    std::vector<uint64_t> nextStrides = {0, nextStride};",
            "    for(uint64_t k = 0; k < starkInfo.nConstants; ++k) {",
            "        for(uint64_t o = 0; o < 2; ++o) {",
            "            for(uint64_t j = 0; j < nrowsPack; ++j) {",
            "                uint64_t l = (row + j + nextStrides[o]) % domainSize;",
            "                bufferT_[(nColsStagesAcc[5*o] + k)*nrowsPack + j] = ((Goldilocks::Element *)constPols->address())[l * starkInfo.nConstants + k];",
            "            }",
            "        }",
            "    }\n",
            "    // Load x and Zi",
            "    for(uint64_t j = 0; j < nrowsPack; ++j) {",
            "        bufferT_[starkInfo.nConstants*nrowsPack + j] = x[row + j][0];",
            "    }",
            "    for(uint64_t j = 0; j < nrowsPack; ++j) {",
            "        bufferT_[(starkInfo.nConstants + 1)*nrowsPack + j] = params.zi[row + j][0];",
            "    }\n",
            "    for(uint64_t s = 1; s <= nStages; ++s) {",
            "        for(uint64_t k = 0; k < nColsStages[s]; ++k) {",
            "            for(uint64_t o = 0; o < 2; ++o) {",
            "                for(uint64_t j = 0; j < nrowsPack; ++j) {",
            "                    uint64_t l = (row + j + nextStrides[o]) % domainSize;",
            "                    bufferT_[(nColsStagesAcc[5*o + s] + k)*nrowsPack + j] = params.pols[offsetsStages[s] + l * nColsStages[s] + k];",
            "                }",
            "            }",
            "        }",
            "    }\n",
            "    if(stage == 5) {",
            "        for(uint64_t k = 0; k < nColsStages[nStages + 1]; ++k) {",
            "            for(uint64_t o = 0; o < 2; ++o) {",
            "                for(uint64_t j = 0; j < nrowsPack; ++j) {",
            "                    uint64_t l = (row + j + nextStrides[o]) % domainSize;",
            "                    bufferT_[(nColsStagesAcc[5*o + nStages + 1] + k)*nrowsPack + j] = params.pols[offsetsStages[nStages + 1] + l * nColsStages[nStages + 1] + k];",
            "                }",
            "            }",
            "        }\n",
            "       // Load xDivXSubXi & xDivXSubWXi",
            "       for(uint64_t d = 0; d < 2; ++d) {",
            "           for(uint64_t i = 0; i < FIELD_EXTENSION; ++i) {",
            "               for(uint64_t j = 0; j < nrowsPack; ++j) {",
            "                  bufferT_[(nColsStagesAcc[11] + FIELD_EXTENSION*d + i)*nrowsPack + j] = params.xDivXSubXi[d*domainSize + row + j][i];",
            "               }",
            "           }",
            "       }",
            "    }",
            "}\n"
        ]);
    }
    
    parserCPP.push(...[
        `${functionType} calculateExpressions(StarkInfo &starkInfo, StepsParams &params, ParserArgs &parserArgs, ParserParams &parserParams) {`,
    ]);

    if(parserType === "avx512" || parserType === "avx") {
        parserCPP.push(`    assert(nrowsPack == ${parserType === "avx512" ? 8 : 4});`);
    }

    parserCPP.push(...[
        `    bool domainExtended = parserParams.stage > 3 ? true : false;`,
        "    uint64_t domainSize = domainExtended ? 1 << starkInfo.starkStruct.nBitsExt : 1 << starkInfo.starkStruct.nBits;",
        "    uint8_t *ops = &parserArgs.ops[parserParams.opsOffset];",
        "    uint16_t *args = &parserArgs.args[parserParams.argsOffset];",
        "    uint64_t *numbers = &parserArgs.numbers[parserParams.numbersOffset];",
        "    uint8_t *storePol = &parserArgs.storePols[parserParams.storePolsOffset];\n",
        "    setBufferTInfo(starkInfo, parserParams.stage);",
    ]);
   
    if(isAvx) {
        parserCPP.push(...[
            `    ${avxTypeExtElement} challenges[params.challenges.degree()];`,
            `    ${avxTypeExtElement} challenges_ops[params.challenges.degree()];`,
            "    for(uint64_t i = 0; i < params.challenges.degree(); ++i) {",
            `        challenges[i][0] = ${avxSet1Epi64}(params.challenges[i][0].fe);`,
            `        challenges[i][1] = ${avxSet1Epi64}(params.challenges[i][1].fe);`,
            `        challenges[i][2] = ${avxSet1Epi64}(params.challenges[i][2].fe);\n`,
            "        Goldilocks::Element challenges_aux[3];",
            "        challenges_aux[0] = params.challenges[i][0] + params.challenges[i][1];",
            "        challenges_aux[1] = params.challenges[i][0] + params.challenges[i][2];",
            "        challenges_aux[2] = params.challenges[i][1] + params.challenges[i][2];",
            `        challenges_ops[i][0] = ${avxSet1Epi64}(challenges_aux[0].fe);`,
            `        challenges_ops[i][1] =  ${avxSet1Epi64}(challenges_aux[1].fe);`,
            `        challenges_ops[i][2] =  ${avxSet1Epi64}(challenges_aux[2].fe);`,
            "    }\n",
        ]);
    
        parserCPP.push(...[
            `    ${avxTypeElement} numbers_[parserParams.nNumbers];`,
            "    for(uint64_t i = 0; i < parserParams.nNumbers; ++i) {",
            `        numbers_[i] = ${avxSet1Epi64}(numbers[i]);`,
            "    }\n",
        ])
    
        parserCPP.push(...[
            `    ${avxTypeElement} publics[starkInfo.nPublics];`,
            "    for(uint64_t i = 0; i < starkInfo.nPublics; ++i) {",
            `        publics[i] = ${avxSet1Epi64}(params.publicInputs[i].fe);`,
            "    }\n",
        ]);
        
        parserCPP.push(...[
            `    ${avxTypeExtElement} evals[params.evals.degree()];`,
            "    for(uint64_t i = 0; i < params.evals.degree(); ++i) {",
            `        evals[i][0] = ${avxSet1Epi64}(params.evals[i][0].fe);`,
            `        evals[i][1] = ${avxSet1Epi64}(params.evals[i][1].fe);`,
            `        evals[i][2] = ${avxSet1Epi64}(params.evals[i][2].fe);`,
            "    }\n",
        ]);
    } else {
        parserCPP.push(...[
            `    Goldilocks::Element challenges[params.challenges.degree()*FIELD_EXTENSION*nrowsPack];`,
            `    Goldilocks::Element challenges_ops[params.challenges.degree()*FIELD_EXTENSION*nrowsPack];`,
            "    for(uint64_t i = 0; i < params.challenges.degree(); ++i) {",
            "        for(uint64_t j = 0; j < nrowsPack; ++j) {",
            `            challenges[(i*FIELD_EXTENSION)*nrowsPack + j] = params.challenges[i][0];`,
            `            challenges[(i*FIELD_EXTENSION + 1)*nrowsPack + j] = params.challenges[i][1];`,
            `            challenges[(i*FIELD_EXTENSION + 2)*nrowsPack + j] = params.challenges[i][2];`,
            "            challenges_ops[(i*FIELD_EXTENSION)*nrowsPack + j] = params.challenges[i][0] + params.challenges[i][1];",
            "            challenges_ops[(i*FIELD_EXTENSION + 1)*nrowsPack + j] = params.challenges[i][0] + params.challenges[i][2];",
            "            challenges_ops[(i*FIELD_EXTENSION + 2)*nrowsPack + j] = params.challenges[i][1] + params.challenges[i][2];",
            "        }",
            "    }\n",
        ]);

        parserCPP.push(...[
            "    Goldilocks::Element numbers_[parserParams.nNumbers*nrowsPack];",
            "    for(uint64_t i = 0; i < parserParams.nNumbers; ++i) {",
            "        for(uint64_t j = 0; j < nrowsPack; ++j) {",
            `            numbers_[i*nrowsPack + j] = Goldilocks::fromU64(numbers[i]);`,
            "        }",
            "    }\n",
        ])

        parserCPP.push(...[
            "    Goldilocks::Element publics[starkInfo.nPublics*nrowsPack];",
            "    for(uint64_t i = 0; i < starkInfo.nPublics; ++i) {",
            "        for(uint64_t j = 0; j < nrowsPack; ++j) {",
            `            publics[i*nrowsPack + j] = params.publicInputs[i];`,
            "        }",
            "    }\n",
        ])

        parserCPP.push(...[
            `    Goldilocks::Element evals[params.evals.degree()*FIELD_EXTENSION*nrowsPack];`,
            "    for(uint64_t i = 0; i < params.evals.degree(); ++i) {",
            "        for(uint64_t j = 0; j < nrowsPack; ++j) {",
            `            evals[(i*FIELD_EXTENSION)*nrowsPack + j] = params.evals[i][0];`,
            `            evals[(i*FIELD_EXTENSION + 1)*nrowsPack + j] = params.evals[i][1];`,
            `            evals[(i*FIELD_EXTENSION + 2)*nrowsPack + j] = params.evals[i][2];`,
            "        }",
            "    }\n",
        ]);
    }
        
        
    parserCPP.push(...[
        `#pragma omp parallel for`,
        `    for (uint64_t i = 0; i < domainSize; i+= nrowsPack) {`,
        "        uint64_t i_args = 0;\n",
    ]);

    if(isAvx) {
        parserCPP.push(...[
            `        ${avxTypeElement} bufferT_[2*nCols];`,
            `        ${avxTypeElement} tmp1[parserParams.nTemp1];`,
            `        ${avxTypeExtElement} tmp3[parserParams.nTemp3];\n`,
        ]);
    } else {
        parserCPP.push(...[
            `        Goldilocks::Element bufferT_[2*nCols*nrowsPack];`,
            `        Goldilocks::Element tmp1[parserParams.nTemp1*nrowsPack];`,
            `        Goldilocks::Element tmp3[parserParams.nTemp3*nrowsPack*FIELD_EXTENSION];\n`,
        ]);
    }

    parserCPP.push("        loadPolinomials(starkInfo, params, bufferT_, i, parserParams.stage, nrowsPack, domainExtended);\n");
    
    parserCPP.push(...[
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
                if(opr.src1_type) numberArgs += numberOfArgs(opr.src1_type) + 1;
                operationCase.push(`                    i_args += ${numberArgs};`);
            }
        } else {
            operationCase.push(writeOperation(op));
            let numberArgs = numberOfArgs(op.dest_type) + numberOfArgs(op.src0_type);
            if(op.src1_type) numberArgs += numberOfArgs(op.src1_type) + 1;
            operationCase.push(`                    i_args += ${numberArgs};`);
        }

        operationCase.push(...[
            "                    break;",
            "                }",
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

    parserCPP.push("        storePolinomials(starkInfo, params, bufferT_, storePol, i, nrowsPack, domainExtended);");

    parserCPP.push(...[
        `        if (i_args != parserParams.nArgs) std::cout << " " << i_args << " - " << parserParams.nArgs << std::endl;`,
        "        assert(i_args == parserParams.nArgs);",
        "    }"
        ]);

    parserCPP.push("}");
       
    
    const parserCPPCode = parserCPP.map(l => `    ${l}`).join("\n");

    return parserCPPCode;

    function writeOperation(operation) {
        let name = ["tmp1", "commit1"].includes(operation.dest_type) ? "    Goldilocks::" : "    Goldilocks3::";
        
        if(operation.op === "mul") {
            name += "mul";
        } else if (operation.src1_type) {
            name += "op";
        } else {
            name += "copy";
        }

        if(["tmp3", "commit3", "q", "f"].includes(operation.dest_type)) {
            if(operation.src1_type)  {
                let dimType = "";
                let dims1 = ["public", "x", "commit1", "tmp1", "const", "number", "Zi"];
                let dims3 = ["q", "f", "commit3", "tmp3", "challenge", "eval", "xDivXSubXi"];
                if(dims1.includes(operation.src0_type)) dimType += "1";
                if (dims3.includes(operation.src0_type)) dimType += "3";
                if(dims1.includes(operation.src1_type)) dimType += "1";
                if (dims3.includes(operation.src1_type)) dimType += "3";
    
                if(dimType !== "33") name += "_" + dimType;
            }
        } 
        
        if(parserType === "avx") {
            name += "_avx(";
        } else if(parserType === "avx512") {
            name += "_avx512(";
        } else if(parserType === "pack") {
            name += "_pack(nrowsPack, ";
        }

        c_args = 0;

        if(operation.src1_type) {
            if(!operation.op) {
                name += `args[i_args + ${c_args}], `;
            }
            c_args++;
        }      

        let typeDest = writeType(operation.dest_type);

        let operationStoreAvx;

        c_args += numberOfArgs(operation.dest_type);

        let typeSrc0 = writeType(operation.src0_type);
        c_args += numberOfArgs(operation.src0_type);

        let typeSrc1;
        if(operation.src1_type) {
            typeSrc1 = writeType(operation.src1_type);
        }
        
        const operationCall = [];
  
        name += typeDest + ", ";
        name += typeSrc0 + ", ";
        if(operation.src1_type) {
            if(operation.op === "mul" && operation.src1_type === "challenge") {
                name += `${typeSrc1}, ${typeSrc1.replace("challenges", "challenges_ops")}, \n                        `;
            } else {
                name += typeSrc1 + ", ";
            }
        }
        

        name = name.substring(0, name.lastIndexOf(", ")) + ");";

        operationCall.push(`                ${name}`);
        if(operationStoreAvx) {
            operationCall.push(operationStoreAvx);
        }

        return operationCall.join("\n").replace(/i_args \+ 0/g, "i_args");
    }

    function writeType(type) {
        switch (type) {
            case "public":
                return parserType === "pack" ? `&publics[args[i_args + ${c_args}] * nrowsPack]` : `publics[args[i_args + ${c_args}]]`;
            case "tmp1":
                return parserType === "pack" ? `&tmp1[args[i_args + ${c_args}] * nrowsPack]` : `tmp1[args[i_args + ${c_args}]]`;
            case "tmp3":
                return parserType === "pack" ? `&tmp3[args[i_args + ${c_args}] * nrowsPack * FIELD_EXTENSION]` : `tmp3[args[i_args + ${c_args}]]`;
            case "commit1":
            case "commit3":
            case "const":
            case "xDivXSubXi":
            case "x":
            case "Zi":
                return parserType === "pack"
                    ? `&bufferT_[(nColsStagesAcc[args[i_args + ${c_args}]] + args[i_args + ${c_args + 1}]) * nrowsPack]`
                    : `${type === "commit3" ? `(${avxTypeExtElement} &)` : ""}bufferT_[nColsStagesAcc[args[i_args + ${c_args}]] + args[i_args + ${c_args + 1}]]`
            case "challenge":
                return parserType === "pack" ? `&challenges[args[i_args + ${c_args}]*FIELD_EXTENSION*nrowsPack]` : `challenges[args[i_args + ${c_args}]]`;
            case "eval":
                return parserType === "pack" ? `&evals[args[i_args + ${c_args}]*FIELD_EXTENSION*nrowsPack]` : `evals[args[i_args + ${c_args}]]`;
            case "number":
                return parserType === "pack" ? `&numbers_[args[i_args + ${c_args}]*nrowsPack]` : `numbers_[args[i_args + ${c_args}]]`;
            default:
                throw new Error("Invalid type: " + type);
        }
    }

    function numberOfArgs(type) {
        switch (type) {
            case "public":            
            case "tmp1":
            case "tmp3":
            case "challenge":
            case "eval":
            case "number":
                return 1;
            case "x":
            case "Zi":
            case "f":
            case "q":
            case "xDivXSubXi":
            case "const":
            case "commit1":
            case "commit3":
                return 2;  
            default:
                throw new Error("Invalid type: " + type);
        }
    }
}

module.exports.getAllOperations = function getAllOperations() {
    const possibleOps = [];

    const possibleDestinationsDim1 = [ "commit1", "tmp1" ];
    const possibleDestinationsDim3 = [ "commit3", "tmp3" ];

    const possibleSrcDim1 = [ "commit1", "tmp1", "public", "number" ];
    const possibleSrcDim3 = [ "commit3", "tmp3", "challenge" ];

    // Dim1 destinations
    for(let j = 0; j < possibleDestinationsDim1.length; j++) {
        let dest_type = possibleDestinationsDim1[j];
        for(let k = 0; k < possibleSrcDim1.length; ++k) {
            let src0_type = possibleSrcDim1[k];
            possibleOps.push({dest_type, src0_type}); // Copy operation
            for (let l = k; l < possibleSrcDim1.length; ++l) {
                let src1_type = possibleSrcDim1[l];
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
    
    return possibleOps;
}

module.exports.getOperation = function getOperation(r) {
    const _op = {};
    _op.op = r.op;
    if(["cm", "tmpExp", "q", "f", "x", "Zi"].includes(r.dest.type)) {
        _op.dest_type = `commit${r.dest.dim}`;
    } else if(r.dest.type === "tmp") {
        _op.dest_type = `tmp${r.dest.dim}`;
    } else {
        _op.dest_type = r.dest.type;
    }
    
    for(let i = 0; i < r.src.length; ++i) {
        if(["xDivXSubXi", "xDivXSubWXi"].includes(r.src[i].type)) r.src[i].dim = 3;
    }

    let src = [...r.src];
    if(r.op !== "copy") {
        src.sort((a, b) => {
            let opA =  ["cm", "tmpExp"].includes(a.type) ? operationsMap[`commit${a.dim}`] : a.type === "tmp" ? operationsMap[`tmp${a.dim}`] : operationsMap[a.type];
            let opB = ["cm", "tmpExp"].includes(b.type) ? operationsMap[`commit${b.dim}`] : b.type === "tmp" ? operationsMap[`tmp${b.dim}`] : operationsMap[b.type];
            let swap = a.dim !== b.dim ? b.dim - a.dim : opA - opB;
            if(r.op === "sub" && swap < 0) _op.op = "sub_swap";
            return swap;
        });
    }

    for(let i = 0; i < src.length; i++) {
        if(["cm", "tmpExp"].includes(src[i].type)) {
            _op[`src${i}_type`] = `commit${src[i].dim}`;
        } else if(["const", "x", "Zi"].includes(src[i].type)) {
            _op[[`src${i}_type`]] = "commit1";
        } else if(src[i].type === "tmp") {
            _op[`src${i}_type`] =  `tmp${src[i].dim}`;
        } else if(["xDivXSubXi", "xDivXSubWXi"].includes(src[i].type)) {
            _op[`src${i}_type`] = "commit3";
        } else {
            _op[`src${i}_type`] = src[i].type;
        }
    }

    _op.src = src;
    
    return _op;
}
