const { assert } = require("chai");
const { getIdMaps } = require("./helpers");
const { getOperation } = require("./generateParser");

const operationsTypeMap = {
    "add": 0,
    "sub": 1,
    "mul": 2,
    "sub_swap": 3,
}

module.exports.getParserArgs = function getParserArgs(starkInfo, operations, code, dom, stage, executeBefore = true) {

    var ops = [];
    var args = [];
    var numbers = [];

    var counters_ops = new Array(operations.length).fill(0);

    const nBits = starkInfo.starkStruct.nBits;
    const nBitsExt = starkInfo.starkStruct.nBitsExt;

    const next = (dom == "n" ? 1 : 1 << (nBitsExt - nBits));

    // Evaluate max and min temporal variable for tmp_ and tmp3_
    let maxid = 100000;
    let ID1D = new Array(maxid).fill(-1);
    let ID3D = new Array(maxid).fill(-1);
    let { count1d, count3d } = getIdMaps(maxid, ID1D, ID3D, code);
        
    for (let j = 0; j < code.length; j++) {
        const r = code[j];
        
        let operation = getOperation(r);

        if(operation.op !== "copy" && !["q", "f"].includes(operation.dest_type)) {
            args.push(operationsTypeMap[operation.op]);
        }

        pushResArg(r, r.dest.type);
        for(let i = 0; i < r.src.length; i++) {
            pushSrcArg(r.src[i], r.src[i].type);
        }

        let opsIndex = r.op === "copy" 
            ? operations.findIndex(op => op.dest_type === operation.dest_type && op.src0_type === operation.src0_type && !op.src1_type)
            : operations.findIndex(op => op.dest_type === operation.dest_type && op.src0_type === operation.src0_type && op.src1_type === operation.src1_type);
        
        if (opsIndex === -1) throw new Error("Operation not considered: " + JSON.stringify(operation));

        ops.push(opsIndex);

        counters_ops[opsIndex] += 1;
    }

    const stageInfo = {
        stage,
        executeBefore: executeBefore ? 1 : 0,
        nTemp1: count1d,
        nTemp3: count3d,
        nOps: ops.length,
        ops,
        nArgs: args.length,
        numbers,
        args,
    }
    
    const operationsUsed = counters_ops.reduce((acc, currentValue, currentIndex) => {
        if (currentValue !== 0) {
          acc.push(currentIndex);
        }
        return acc;
    }, []);

    console.log("Number of operations: ", ops.length);
    console.log("Number of arguments: ", args.length);
    console.log("Different operations types: ", operationsUsed.length, " of ", operations.length);
    console.log("Operations used: ", operationsUsed.join(", "));
    console.log("--------------------------------");

    return {operationsUsed, stageInfo};

    function pushResArg(r, type) {
        switch (type) {
            case "tmp": {
                if (r.dest.dim == 1) {
                    args.push(ID1D[r.dest.id]);
                } else {
                    assert(r.dest.dim == 3);
                    args.push(ID3D[r.dest.id]);
                }
                break;
            }
            case "q": {
                break;
            }
            case "cm": {
                if (dom == "n") {
                    evalMap_(starkInfo.cm_n[r.dest.id], r.dest.prime)
                } else if (dom == "2ns") {
                    evalMap_(starkInfo.cm_2ns[r.dest.id], r.dest.prime)
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            }
            case "tmpExp": {
                if (dom == "n") {
                    evalMap_(starkInfo.tmpExp_n[r.dest.id], r.dest.prime)
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
    }


    function pushSrcArg(r, type) {
        switch (type) {
            case "tmp": {
                if (r.dim == 1) {
                    args.push(ID1D[r.id]);
                } else {
                    assert(r.dim == 3);
                    args.push(ID3D[r.id]);
                }
                break;
            }
            case "const": {
                let offset_prime = r.prime ? next : 0;

                args.push(0);
                args.push(r.id);
                args.push(offset_prime);
                
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
                let numString = `${BigInt(r.value).toString()}`;
                if(!numbers.includes(numString)) numbers.push(numString); 
                args.push(numbers.indexOf(numString));
                break;
            }
            case "public":
            case "challenge":
            case "eval": 
            {
                args.push(r.id);
                break;
            }
        }
    }

    function evalMap_(polId, prime) {
        let p = starkInfo.varPolMap[polId];

        let offset_prime = prime ? next : 0;

        let step;
        if(["cm1_n", "cm1_2ns"].includes(p.section)) {
            step = 1;
        } else if(["cm2_n", "cm2_2ns"].includes(p.section)) {
            step = 2;
        } else if(["cm3_n", "cm3_2ns"].includes(p.section)) {
            step = 3;
        } else if(["tmpExp_n", "cm4_2ns"].includes(p.section)) {
            step = 4;
        }
        args.push(Number(step));
        args.push(Number(p.sectionPos));
        args.push(Number(offset_prime));
    }
}
