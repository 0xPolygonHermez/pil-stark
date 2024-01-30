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

module.exports.generateParser = function generateParser(operations, operationsUsed, stageName) {

    let c_args = 0;

    let parserName = operationsUsed && stageName ? `${stageName}_parser_avx` : "parser_avx";
    const parserCPP = [
        `#include "chelpers_steps.hpp"\n`,
        `void CHelpersSteps::${parserName}(StepsParams &params, ParserParams &parserParams, uint32_t rowStart, uint32_t rowEnd, uint32_t nrowsBatch, uint32_t domainSize, bool domainExtended, bool const includesEnds) {`,
        "    uint64_t numConstPols = params.pConstPols->numPols();",
        "    Polinomial &x = domainExtended ? params.x_2ns : params.x_n;", 
        "    ConstantPolsStarks *constPols = domainExtended ? params.pConstPols2ns : params.pConstPols;",
        "    __m256i tmp1[parserParams.nTemp1];",
        "    Goldilocks3::Element_avx tmp3[parserParams.nTemp3];",
        "    uint64_t offsetsDest[4], offsetsSrc0[4], offsetsSrc1[4];",
        "#pragma omp parallel for private(tmp1, tmp3, offsetsDest, offsetsSrc0, offsetsSrc1)",
        `    for (uint64_t i = rowStart; i < rowEnd; i+= nrowsBatch) {`,
        "        uint64_t i_args = 0;",
        "        \n",
        "        for (int kk = 0; kk < parserParams.nOps; ++kk) {",
        `            switch (parserParams.ops[kk]) {`,
    ];
       
    let nCopyOperations = 0;
    
    for(let i = 0; i < operations.length; i++) {
        const op = operations[i];
        if(operationsUsed && !operationsUsed.includes(i)) continue;
        let operationDescription;
        if(op.src1_type) {
            operationDescription = `                // OPERATION WITH DEST: ${op.dest_type} - SRC0: ${op.src0_type} - SRC1: ${op.src1_type}`;
        } else {
            operationDescription = `                // COPY ${op.src0_type} to ${op.dest_type}`;
        }

        if(!op.src1_type) nCopyOperations++;
        const operationCase = [
            `            case ${i}: {`,
            operationDescription,
        ];
        
        if(["q", "f"].includes(op.dest_type)) {
            operationCase.push(writeOperation(op, false));
        } else {
            operationCase.push(...[
                "                if(!includesEnds) {",
                `    ${writeOperation(op, false)}`,
                "                } else {",
                `    ${writeOperation(op, true)}`,
                "                }",
            ]);
        }

        let numberArgs = 1 + nArgs(op.dest_type) + nArgs(op.src0_type);
        if(op.src1_type) numberArgs += nArgs(op.src1_type);
        
        operationCase.push(...[
            `                i_args += ${numberArgs};`,
            "                break;",
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

    console.log("Number of copy operations: ", nCopyOperations)
    return parserCPPCode;

    function writeOperation(operation, includesEnds = false) {
        if(operation.dest_type === "q") {
            const qOperation = [
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
            ].join("\n");
            return qOperation;
        } else if(operation.dest_type === "f") {
            const fOperation = "                Goldilocks3::copy_avx(&params.f_2ns[i*3], uint64_t(0), tmp3[parserParams.args[i_args]]);"
            return fOperation;
        }
        let name = ["tmp1", "commit1"].includes(operation.dest_type) ? "Goldilocks::" : "Goldilocks3::";
        name += operation.src1_type ? "op" : "copy";

        let addOffset = false;
        if(["tmp3", "commit3"].includes(operation.dest_type)) {
            addOffset = true;
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

        name += writeType(operation.dest_type, includesEnds, "dest");

        let {offset: offsetDest, offsetCall: offsetDestCall} = getOffset(operation.dest_type,"dest", addOffset, includesEnds);
        if(offsetDestCall) name += offsetDestCall;

        c_args += nArgs(operation.dest_type);
        name += "\n                        ";

        name += writeType(operation.src0_type, includesEnds, "src0");

        let {offset: offsetSrc0, offsetCall: offsetSrc0Call} = getOffset(operation.src0_type, "src0", addOffset, includesEnds);
        if(offsetSrc0Call) name += offsetSrc0Call;

        c_args += nArgs(operation.src0_type);
        name += "\n                        ";

        let offsetSrc1;

        if(operation.src1_type) {
            name += writeType(operation.src1_type, includesEnds, "src1");

            let offsets = getOffset(operation.src1_type, "src1", addOffset, includesEnds);
            if(offsets.offset) offsetSrc1 = offsets.offset;
            if(offsets.offsetCall) name += offsets.offsetCall;

            c_args += nArgs(operation.src1_type);
            name += "\n                        ";
        }

        name = name.substring(0, name.lastIndexOf(", ")) + "\n                    );";
        
        const operationCall = [];

        if(includesEnds) {
            if(offsetDest || offsetSrc0 || offsetSrc1) {
                const offsetLoop = ["                for (uint64_t j = 0; j < AVX_SIZE_; ++j) {"];
                if(offsetDest) offsetLoop.push(offsetDest);
                if(offsetSrc0) offsetLoop.push(offsetSrc0);
                if(offsetSrc1) offsetLoop.push(offsetSrc1);
                offsetLoop.push("                    }");
                operationCall.push(...offsetLoop);
            }
            if(operation.src0_type === "number") operationCall.push(`                    Goldilocks::Element tmp0__[1] = {Goldilocks::fromU64(parserParams.args[i_args + ${c_args}])};`)
            if(operation.src1_type === "number") operationCall.push(`               Goldilocks::Element tmp1__[1] = {Goldilocks::fromU64(parserParams.args[i_args + ${c_args}])};`)
            operationCall.push(`                    ${name}`);
        } else {
            operationCall.push(`                ${name}`);
        }

        return operationCall.join("\n").replace(/i_args \+ 0/, "i_args");
    }

    function writeType(type, includesEnds = false, operand) {
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
                    return `&constPols->getElement(0, 0), `;
                } else {
                    return `&constPols->getElement(parserParams.args[i_args + ${c_args}], i), `;
                }
            case "challenge":
                return `params.challenges[parserParams.args[i_args + ${c_args}]], `;
            case "x":
                return `x[i], `;
            case "number":
                if(includesEnds) {
                    return `${operand === "src0" ? "tmp0__" : "tmp1__"}, `;
                } else {
                    return `Goldilocks::fromU64(parserParams.args[i_args + ${c_args}]), `;
                }
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

    function getOffset(type, operand, addOffset = false, includesEnds = false) {
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
                offsetCall = `${offsetName}, `;
            } else if (type === "x") {
                offset = `                        ${offsetName}[j] = j*${type}.offset();`;
                offsetCall = `${offsetName}, `;
            } else if(["xDivXSubXi", "xDivXSubWXi"].includes(type)) {
                offset = `                        ${offsetName}[j] = j*params.${type}.offset();`;
                offsetCall = `${offsetName}, `;
            } else if (["challenge", "public", "number", "eval"].includes(type)) {
                offset = `                        ${offsetName}[j] = 0;`;
                offsetCall = `${offsetName}, `;
            }
        } else {
            if(["commit1", "commit3", "const"].includes(type)) {
                let numPols = type === "const" ? "numConstPols" : `parserParams.args[i_args + ${c_args+2}]`;
                offsetCall = `${numPols}, `;
            } else if (type === "x") {
                offsetCall = `${type}.offset(), `;
            } else if(["xDivXSubXi", "xDivXSubWXi"].includes(type)) {
                offsetCall = `params.${type}.offset(), `;
            } else if (addOffset) {
                if (["challenge", "eval"].includes(type)) {
                    offsetCall = "uint64_t(0), ";
                }
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
            operations.push({dest_type, src0_type}); // Copy operation
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
