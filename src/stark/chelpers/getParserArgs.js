const { assert } = require("chai");
const { getIdMaps } = require("./helpers");
const { getOperation } = require("./generateParser");

const operationsTypeMap = {
    "add": 0,
    "sub": 1,
    "mul": 2,
    "copy": 3,
}

module.exports.getParserArgs = function getParserArgs(starkInfo, operations, code, dom, stage, executeBefore = true) {

    var ops = [];
    var cont_ops = 0;
    var opsString = "{"
    var args = [];
    var cont_args = 0;
    var argsString = "{"

    var counters_ops = new Array(operations.length).fill(0);

    const nBits = starkInfo.starkStruct.nBits;
    const nBitsExt = starkInfo.starkStruct.nBitsExt;

    const next = (dom == "n" ? 1 : 1 << (nBitsExt - nBits)).toString();
    const N = (dom == "n" ? (1 << nBits) : (1 << nBitsExt)).toString();

    // Evaluate max and min temporal variable for tmp_ and tmp3_
    let maxid = 100000;
    let ID1D = new Array(maxid).fill(-1);
    let ID3D = new Array(maxid).fill(-1);
    let { count1d, count3d } = getIdMaps(maxid, ID1D, ID3D, code);
        
    for (let j = 0; j < code.length; j++) {
        const r = code[j];
        args.push(operationsTypeMap[r.op]);
        argsString += `${operationsTypeMap[r.op]}, `;
        ++cont_args;
        pushResArg(r, r.dest.type);
        ++cont_ops;
        
        for(let i = 0; i < r.src.length; i++) {
            pushSrcArg(r.src[i], r.src[i].type);
        }

        let operation = getOperation(r);
        let opsIndex = operations.findIndex(op => 
            op.dest_type === operation.dest_type
            && op.src0_type === operation.src0_type
            && ((!op.hasOwnProperty("src1_type")) || (op.src1_type === operation.src1_type)));
        
            
        if (opsIndex === -1) throw new Error("Operation not considered: " + JSON.stringify(operation));

        ops.push(opsIndex);
        opsString += `${opsIndex}, `;

        counters_ops[opsIndex] += 1;
    }

    assert(cont_ops == ops.length);
    assert(cont_args == args.length);


    if(opsString !== "{") opsString = opsString.substring(0, opsString.lastIndexOf(","));
    opsString += "};"
    if(argsString !== "{") argsString = argsString.substring(0, argsString.lastIndexOf(","));
    argsString += "};"

    const stageInfo = {
        stage,
        executeBefore: executeBefore ? 1 : 0,
        nTemp1: count1d,
        nTemp3: count3d,
        nOps: cont_ops,
        ops,
        nArgs: cont_args,
        args: args.map(v => typeof v === 'string' && v.endsWith('ULL') ? parseInt(v.replace('ULL', '')) : v),
    }
    
    const operationsUsed = counters_ops.reduce((acc, currentValue, currentIndex) => {
        if (currentValue !== 0) {
          acc.push(currentIndex);
        }
        return acc;
    }, []);

    console.log("Number of operations: ", cont_ops);
    console.log("Number of arguments: ", cont_args);
    console.log("Different operations types: ", operationsUsed.length, " of ", operations.length);
    console.log("--------------------------------");

    return {operationsUsed, stageInfo};

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
