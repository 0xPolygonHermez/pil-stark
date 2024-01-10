const { assert } = require("chai");
const { findPatterns } = require("./helpers");

var dbg = 0;

const operationsMap = {
    "public": 1,
    "x": 2,
    "commit": 3,
    "tmp": 4,
    "const": 5,
    "number": 6,
    "challenge": 7, 
    "eval": 8, 
    "q": 9, 
    "f": 10
}

module.exports = function compileCode_parser(starkInfo, config, functionName, code, dom, ret) {

    const operations = [];

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
    var counters_add = 0;
    var counters_sub = 0;
    var counters_mul = 0;
    var counters_copy = 0;

    let step;

    if (functionName == "step3_first") {
        step = "3";
    } else if (functionName == "step3prev_first") {
        step = "3prev";
    } else if (functionName == "step2prev_first") {
        step = "2prev";
    } else if (functionName == "step42ns_first") {
        step = "42ns";
    }

    const next = (dom == "n" ? 1 : 1 << (nBitsExt - nBits)).toString();
    const N = (dom == "n" ? (1 << nBits) : (1 << nBitsExt)).toString();

    // Evaluate max and min temporal variable for tmp_ and tmp3_
    let maxid = 100000;
    let ID1D = new Array(maxid).fill(-1);
    let ID3D = new Array(maxid).fill(-1);
    let { count1d, count3d } = getIdMaps(maxid);

    for (let j = 0; j < code.length; j++) {
        const r = code[j];
        pushResArg(r, r.dest.type);
        ++cont_ops;
        
        let operation = getOperation(r);
        if (!operations.find(c => c === JSON.stringify(operation))) {
            operations.push(JSON.stringify(operation));
        }

        let opsIndex = operations.indexOf(JSON.stringify(operation));
        if (opsIndex === -1) throw new Error("Operation not found: " + JSON.stringify(operation));

        ops.push(opsIndex);
        opsString += `${opsIndex}, `;

        if(!counters_ops[opsIndex]) counters_ops[opsIndex] = 0;
        counters_ops[opsIndex] += 1;
        if(operation.op === "add") {
            ++counters_add;
        } else if(operation.op === "sub") {
            ++counters_sub;
        } else if(operation.op === "mul") {
            ++counters_mul;
        } else if(operation.op === "copy") {
            ++counters_copy;
        }
    }

    assert(cont_ops == ops.length);

    if (dbg) {
        console.log(functionName);
        console.log(counters_add);
        console.log(counters_sub);
        console.log(counters_mul);
        console.log("\n");
        console.log(counters_ops)
        console.log("NOPS: ", cont_ops, ops.length);
        console.log("NARGS: ", cont_args, args.length);
    }
    assert(cont_ops == counters_add + counters_sub + counters_mul + counters_copy)

    console.log("\n", functionName);
    console.log("NOPS: ", cont_ops, ops.length);
    console.log("NARGS: ", cont_args, args.length);
    console.log("DIFF OPERATIONS ", operations.length, "\n");
    process.stdout.write(JSON.stringify(counters_ops));

    if(opsString !== "{") opsString = opsString.substring(0, opsString.lastIndexOf(","));
    opsString += "};"
    if(argsString !== "{") argsString = argsString.substring(0, argsString.lastIndexOf(","));
    argsString += "};"

    const parserCPP = [
        "#pragma omp parallel for",
        `   for (uint64_t i = 0; i < nrows; i+= nrowsBatch) {`,
        "      int i_args = 0;",
        "      __m256i tmp1[NTEMP1_];",
        "      Goldilocks3::Element_avx tmp3[NTEMP3_];",
        "      uint64_t offsetsDest[4], offsetsSrc0[4], offsetsSrc1[4];",
        "      uint64_t numConstPols = params.pConstPols->numPols();",
        "      \n",
        "      for (int kk = 0; kk < NOPS_; ++kk) {",
        `          switch (op${step}[kk]) {`,
    ];
       
    for(let i = 0; i < operations.length; i++) {
        const op = JSON.parse(operations[i]);
        if(op.dest_type === "q") {
            const q = [
                `           case ${i}: {`,
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
            const operationCase = [
                `           case ${i}: {`,
                `               // operation: ${op.op}`,
                `               // dest: ${op.dest_type} - offset: ${op.dest_prime ? 1 : 0} - dim: ${op.dest_dim}`,
                `               // src0: ${op.src0_type} - offset: ${op.src0_prime ? 1 : 0} - dim: ${op.src0_dim}`,
            ];
        
            if(op.op !== "copy") {
                operationCase.push(`               // src1: ${op.src1_type} - offset: ${op.src1_prime ? 1 : 0} - dim: ${op.src1_dim}`);
            }
            operationCase.push(...[
                writeOperation(op),
                "                break;",
                "            }",
            ])
            parserCPP.push(operationCase.join("\n"));
        }
    }

    const opsArray = opsString.substring(1, opsString.length - 2).split(", ");
    // TODO: WHY 0.03. Fix this
    const patterns = findPatterns(opsArray, Math.ceil(cont_ops*0.03));

    let n = operations.length;
    for(let i = 0; i < patterns.length; ++i) {
        const groupOps = patterns[i].join(", ") + ",";
        let countGroup = opsString.split(groupOps).length - 1;
        cont_ops -= (patterns[i].length - 1)*countGroup;
        opsString = opsString.replace(new RegExp(groupOps, "g"), `${n},`);
        const patternCase = [
            `           case ${n}: {`,
            `               // ${n} -> cases ${groupOps.substring(0, groupOps.length - 1)}`,
        ];
        for(let j = 0; j < patterns[i].length; ++j) {
            patternCase.push(writeOperation(JSON.parse(operations[patterns[i][j]])));
        }
        patternCase.push(...[
            "                break;",
            "            }",
        ]);
        parserCPP.push(patternCase.join("\n"));
        n++;
    }

    parserCPP.push(...[
        "              default: {",
        `                  std::cout << " Wrong operation in step42ns_first!" << std::endl;`,
        "                  exit(1);",
        "              }",
        "          }",
        "       }",
        `       if (i_args != NARGS_) std::cout << " " << i_args << " - " << NARGS_ << std::endl;`,
        "       assert(i_args == NARGS_);",
        "   }"
        ]);

    parserCPP.unshift(`void ${config.className}::step${step}_parser_first_avx(StepsParams &params, uint64_t nrows, uint64_t nrowsBatch) {`);
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

    console.log("Number of operations before join: ", ops.length, " - Number of operations after join: ", cont_ops);

    const parserCPPCode = parserCPP.join("\n");
    const parserHPPCode = parserHPP.join("\n");

    return {parserHPPCode, parserCPPCode};

    function writeOperation(operation) {
        let name = operation.dest_dim === 1 ? `Goldilocks::${operation.op}` : `Goldilocks3::${operation.op}`;
        if(operation.op === "mul" && operation.src1_dim === 1 && operation.src1_type === "tmp" && operation.src0_dim === 1 && operation.src0_type === "tmp") name += "t";
        if(operation.dest_dim === 3) {
            if(["add", "sub", "mul"].includes(operation.op)) {
                let dims = "";
                if(operation.src0_dim === 1) {
                    if(["number"].includes(operation.src0_type)) {
                        dims += "1c";
                    } else {
                        dims += "1";
                    }
                } else if (operation.src0_dim === 3) {
                    if(["challenge"].includes(operation.src0_type)) {
                        dims += "3c";
                    } else {
                        dims += "3";
                    }
                }

                if(operation.src1_dim === 1) {
                    if(["number"].includes(operation.src1_type)) {
                        dims += "1c";
                    } else {
                        dims += "1";
                    }
                } else if (operation.src1_dim === 3) {
                    if(["challenge"].includes(operation.src1_type)) {
                        dims += "3c";
                    } else {
                        dims += "3";
                    }
                }

                if(dims !== "33") name += dims;
            }
        }
        
        name += "_avx(";

        let offsetDest = "";
        let offsetSrc0 = "";
        let offsetSrc1 = "";

        let offsetSrc0Call = "";
        let offsetSrc1Call = "";
        

        c_args = 0;

        name += writeType(operation.dest_type, operation.dest_dim, operation.dest_prime);

        if(operation.dest_prime) {
            if(operation.dest_type !== "tmp") {
                offsetDest = `                  offsetsDest[j] = args${step}[i_args + ${c_args++}] + (((i + j) + args${step}[i_args + ${c_args++}]) % args${step}[i_args + ${c_args++}]) * args${step}[i_args + ${c_args++}];`,
                name += "offsetsDest, ";
            }
        } else if (operation.dest_type === "commit") {
            name += `args${step}[i_args + ${c_args - 1}], `;
        }

        let addOffset = false;
        if(["commit", "const"].includes(operation.src0_type) && ["commit", "const"].includes(operation.src1_type) && (!operation.src0_prime || !operation.src1_prime)) addOffset = true;

        name += writeType(operation.src0_type, operation.src0_dim, operation.src0_prime, addOffset);

        if(operation.src0_prime) {
            if(!["commit", "const"].includes(operation.src0_type)) throw new Error("Invalid src0 type with prime");
            let numPols = operation.src0_type === "const" ? "numConstPols" : `args${step}[i_args + ${c_args+3}]`;
            offsetSrc0 = `                  offsetsSrc0[j] = args${step}[i_args + ${c_args++}] + (((i + j) + args${step}[i_args + ${c_args++}]) % args${step}[i_args + ${c_args++}]) * ${numPols};`;
            if(operation.src0_type !== "const") c_args++;
        } else if (addOffset) {
            let numPols = operation.src0_type === "const" ? "numConstPols" : `args${step}[i_args + ${c_args+1}]`;
            offsetSrc0 = `                  offsetsSrc0[j] = args${step}[i_args + ${c_args++}] + (i + j) * ${numPols};`;
            if(operation.src0_type !== "const") c_args++;
        }

        if(operation.src0_prime || addOffset) {
            offsetSrc0Call = "offsetsSrc0, ";
        } else if(operation.src0_type === "commit" && !operation.src0_prime) {
                offsetSrc0Call = `args${step}[i_args + ${c_args - 1}], `;
        } else if (operation.src0_type === "const" && !operation.src0_prime) {
                offsetSrc0Call = "numConstPols, ";
        } else if (operation.src0_type === "x") {
                offsetSrc0Call = `params.x_${dom}.offset(), `;
        }


        if(operation.op !== "copy") {
            name += writeType(operation.src1_type, operation.src1_dim, operation.src1_prime, addOffset);

            if(operation.src1_prime) {
                if(!["commit", "const"].includes(operation.src1_type)) throw new Error("Invalid src1 type with prime");
                let numPols = operation.src1_type === "const" ? "numConstPols" : `args${step}[i_args + ${c_args+3}]`;
                offsetSrc1 = `                  offsetsSrc1[j] = args${step}[i_args + ${c_args++}] + (((i + j) + args${step}[i_args + ${c_args++}]) % args${step}[i_args + ${c_args++}]) * ${numPols};`;
                if(operation.src1_type !== "const") c_args++;  
            } else if(addOffset) {
                let numPols = operation.src0_type === "const" ? "numConstPols" : `args${step}[i_args + ${c_args+1}]`;
                offsetSrc1 = `                  offsetsSrc1[j] = args${step}[i_args + ${c_args++}] + (i + j) * ${numPols};`;
                if(operation.src1_type !== "const") c_args++;
            }

            if(operation.src1_prime || addOffset) {
                offsetSrc1Call = "offsetsSrc1, ";
            } else if(operation.src1_type === "commit" && !operation.src1_prime) {
                offsetSrc1Call = `args${step}[i_args + ${c_args - 1}], `;
            } else if (operation.src1_type === "const" && !operation.src1_prime) {
                offsetSrc1Call = "numConstPols, ";
            } else if (operation.src1_type === "x") {
                offsetSrc1Call = `params.x_${dom}.offset(), `;
            }
        }

        name += offsetSrc0Call;
        name += offsetSrc1Call;

        name = name.substring(0, name.lastIndexOf(", ")) + ");";
        
        const operationCall = [];

        if(offsetDest !== "" || offsetSrc0 !== "" || offsetSrc1 !== "") {
            const offsetLoop = [ "               for (uint64_t j = 0; j < AVX_SIZE_; ++j) {"];
            if(offsetDest !== "") offsetLoop.push(offsetDest);
            if(offsetSrc0 !== "") offsetLoop.push(offsetSrc0);
            if(offsetSrc1 !== "") offsetLoop.push(offsetSrc1);
            offsetLoop.push("               }");
            operationCall.push(...offsetLoop);
        }

        operationCall.push(...[
            `                ${name}`,
            `                i_args += ${c_args};`,
        ])
        
        return operationCall.join("\n").replace(/i_args \+ 0/, "i_args");
    }

    function writeType(type, dim, offset, addOffset = false) {
        switch (type) {
            case "public":
                return `params.publicInputs[args${step}[i_args + ${c_args++}]], `;
            case "tmp":
                if(dim === 1) {
                    return `tmp1[args${step}[i_args + ${c_args++}]], `
                } else if (dim === 3) {
                    return `tmp3[args${step}[i_args + ${c_args++}]], `
                } else throw new Error("Invalid dim");
            case "commit":
                if(offset || addOffset) {
                    return `&params.pols[0], `;
                } else {
                    return `&params.pols[args${step}[i_args + ${c_args++}] + i * args${step}[i_args + ${c_args++}]], `;
                }
            case "const":
                let constPols = dom === "n" ? "&params.pConstPols" : `&params.pConstPols2ns`;
                if(offset || addOffset) {
                    return `${constPols}->getElement(0, 0), `;
                } else {
                    return `${constPols}->getElement(args${step}[i_args + ${c_args++}], i), `;
                }
            case "challenge":
                return `(Goldilocks3::Element &)*params.challenges[args${step}[i_args + ${c_args++}]], `;
            case "x":
                return `params.x_${dom}[i], `;
            case "number":
                return `Goldilocks::fromU64(args${step}[i_args + ${c_args++}]), `;
            case "Zi": 
                return "params.zi.zhInv(i), ";
            case "q":
                "params.q_2ns[i * 3], ";
            case "f": 
                return "params.f_2ns[i * 3], ";
            case "eval":
                return `&evals_[args52[i_args + ${c_args++}] * 3], `;
            default:
                throw new Error("Invalid type");
        }

    }

    function getOperation(r) {
        const _op = {};
        _op.op = r.op;
        _op.dest_type = ["cm", "tmpExp"].includes(r.dest.type) ? "commit" : r.dest.type;
        _op.dest_dim = r.dest.dim;
        _op.dest_prime = r.dest.prime;

        if(_op.op !== "sub") {
            r.src.sort((a, b) => {
                if(a.dim !== b.dim) {
                    return a.dim - b.dim;
                } else {
                    let opA = ["cm", "tmpExp"].includes(a.type) ? operationsMap["commit"] : a.type === "number" && _op.op === "mul" ? 1 : operationsMap[a.type];
                    let opB = ["cm", "tmpExp"].includes(b.type) ? operationsMap["commit"] : b.type === "number" && _op.op === "mul" ? 1 : operationsMap[b.type];
                    return opA - opB;
                }
            });
        }

        for(let i = 0; i < r.src.length; i++) {
            pushSrcArg(r.src[i], r.src[i].type);
            _op[`src${i}_type`] = ["cm", "tmpExp"].includes(r.src[i].type) ? "commit" : r.src[i].type;
            _op[`src${i}_dim`] = r.src[i].dim;
            _op[`src${i}_prime`] = r.src[i].type === "tmp" ? false : r.src[i].prime;
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
                if (dom == "n") {
                    if (r.prime) {
                        args.push(r.id);
                        args.push(1);
                        args.push(N);
                        argsString += `${r.id}, `;
                        argsString += `1, `;
                        argsString += `${N}, `;
                        cont_args += 3;
                    } else {
                        args.push(r.id);
                        argsString += `${r.id}, `;
                        cont_args += 1;
                    }
                } else if (dom == "2ns") {
                    if (r.prime) {
                        args.push(r.id);
                        args.push(next);
                        args.push(N);
                        argsString += `${r.id}, `;
                        argsString += `${next}, `;
                        argsString += `${N}, `;
                        cont_args += 3;
                    } else {
                        args.push(r.id);
                        argsString += `${r.id}, `;
                        cont_args += 1;
                    }
                }
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
            case "public": {
                args.push(r.id);
                argsString += `${r.id}, `;
                cont_args += 1;
                break;
            }
            case "challenge": {
                args.push(r.id);
                argsString += `${r.id}, `;
                cont_args += 1;
                break;
            }
            case "eval": {
                args.push(r.id);
                argsString += `${r.id}, `;
                cont_args += 1;
                break;
            }
        }
    }

    function evalMap_(polId, prime) {
        let p = starkInfo.varPolMap[polId];
        let offset = starkInfo.mapOffsets[p.section];
        offset += p.sectionPos;
        let size = starkInfo.mapSectionsN[p.section];
        if (p.dim == 1) {
            if (prime) {
                args.push(Number(offset));
                args.push(Number(next));
                args.push(Number(N));
                args.push(Number(size));
                argsString += `${offset}, `;
                argsString += `${next}, `;
                argsString += `${N}, `;
                argsString += `${size}, `;
                cont_args += 4;

            } else {
                args.push(Number(offset));
                args.push(Number(size));
                argsString += `${offset}, `;
                argsString += `${size}, `;
                cont_args += 2;
            }
        } else if (p.dim == 3) {
            if (prime) {
                args.push(Number(offset));
                args.push(Number(next));
                args.push(Number(N));
                args.push(Number(size));
                argsString += `${offset}, `;
                argsString += `${next}, `;
                argsString += `${N}, `;
                argsString += `${size}, `;
                cont_args += 4;
            } else {
                args.push(Number(offset));
                args.push(Number(size));
                argsString += `${offset}, `;
                argsString += `${size}, `;
                cont_args += 2;
            }
        } else {
            throw new Error("invalid dim");
        }
    }

    function getIdMaps(maxid) {

        let Ini1D = new Array(maxid).fill(-1);
        let End1D = new Array(maxid).fill(-1);

        let Ini3D = new Array(maxid).fill(-1);
        let End3D = new Array(maxid).fill(-1);


        for (let j = 0; j < code.length; j++) {
            const r = code[j];
            if (r.dest.type == 'tmp') {

                let id_ = r.dest.id;
                let dim_ = r.dest.dim;
                assert(id_ >= 0 && id_ < maxid);

                if (dim_ == 1) {
                    if (Ini1D[id_] == -1) {
                        Ini1D[id_] = j;
                        End1D[id_] = j;
                    } else {
                        End1D[id_] = j;
                    }
                } else {
                    assert(dim_ == 3);
                    if (Ini3D[id_] == -1) {
                        Ini3D[id_] = j;
                        End3D[id_] = j;
                    } else {
                        End3D[id_] = j;
                    }
                }
            }
            for (k = 0; k < r.src.length; k++) {
                if (r.src[k].type == 'tmp') {

                    let id_ = r.src[k].id;
                    let dim_ = r.src[k].dim;
                    assert(id_ >= 0 && id_ < maxid);

                    if (dim_ == 1) {
                        if (Ini1D[id_] == -1) {
                            Ini1D[id_] = j;
                            End1D[id_] = j;
                        } else {
                            End1D[id_] = j;
                        }
                    } else {
                        assert(dim_ == 3);
                        if (Ini3D[id_] == -1) {
                            Ini3D[id_] = j;
                            End3D[id_] = j;
                        } else {
                            End3D[id_] = j;
                        }
                    }
                }
            }
        }
        const segments1D = [];
        const segments3D = [];
        for (let j = 0; j < maxid; j++) {
            if (Ini1D[j] >= 0) {
                segments1D.push([Ini1D[j], End1D[j], j])
            }
            if (Ini3D[j] >= 0) {
                segments3D.push([Ini3D[j], End3D[j], j])
            }
        }
        subsets1D = temporalsSubsets(segments1D);
        subsets3D = temporalsSubsets(segments3D);
        let count1d = 0;
        for (s of subsets1D) {
            for (a of s) {
                ID1D[a[2]] = count1d;
            }
            ++count1d;
        }
        let count3d = 0;
        for (s of subsets3D) {
            for (a of s) {
                ID3D[a[2]] = count3d;
            }
            ++count3d;
        }
        console.log(count1d, count3d, subsets1D.length, subsets3D.length);
        return { count1d, count3d };
    }

    function temporalsSubsets(segments) {
        segments.sort((a, b, key) => a[1] - b[1]);
        const result = [];
        for (const s of segments) {
            let inserted = false;
            for (a of result) {
                if (!isIntersecting(s, a[a.length - 1])) {
                    a.push(s);
                    inserted = true;
                    break;
                }
            }
            if (!inserted) {
                result.push([s]);
            }
        }
        return result;
    }

    function isIntersecting(segment1, segment2) {
        const [start1, end1, key1] = segment1;
        const [start2, end2, key2] = segment2;
        return start2 <= end1 && start1 <= end2;
    }

}