const { assert } = require("chai");

var dbg = 0;
var refcount = 0;
var refpols = 0;
var reftem = 0;
var refconst = 0;
var refchall = 0;
var refnum = 0;
var refevals = 0;
var range_tem = new Array(4).fill(0);
var range_const = new Array(8).fill(0);
var range_chall = new Array(2).fill(0);
var range_evals = new Array(2).fill(0);

const range_pols_1 = new Set();
const range_pols_2 = new Set();
const range_pols_3 = new Set();
const range_pols_4 = new Set();
const range_polsseq_1 = new Set();
const range_polsseq_2 = new Set();
const range_polsseq_3 = new Set();
const range_polsseq_4 = new Set();


module.exports = function compileCode_fri(starkInfo, functionName, code, dom) {

    const body = [];

    var ops = [];
    var cont_ops = 0;
    var opsString = "{ "

    var args = [];
    var cont_args = 0;
    var argsString = "{ "


    var counters_ops = new Array(16).fill(0);
    const nBits = starkInfo.starkStruct.nBits;
    const nBitsExt = starkInfo.starkStruct.nBitsExt;
    var counters_add = new Array(4).fill(0);
    var counters_sub = new Array(4).fill(0);
    var counters_mul = new Array(4).fill(0);
    refcount = 0;
    refpols = 0;
    reftem = 0;
    refconst = 0;
    refchall = 0;
    refnum = 0;
    refevals = 0;
    range_tem = [- 1, -1, -1, -1];
    range_chall = [- 1, -1];
    range_evals = [- 1, -1];
    range_const = [- 1, -1, -1, -1, -1, -1, -1, -1];
    range_pols_1.clear();
    range_pols_2.clear();
    range_pols_3.clear();
    range_pols_4.clear();
    range_polsseq_1.clear();
    range_polsseq_2.clear();
    range_polsseq_3.clear();
    range_polsseq_4.clear();

    const next = (dom == "n" ? 1 : 1 << (nBitsExt - nBits)).toString();
    const N = (dom == "n" ? (1 << nBits) : (1 << nBitsExt)).toString();
    let pivots = [];

    //Define pivots
    for (let j = 0; j < code.length; j++) {
        const r = code[j];
        if (r.src[0].type == 'tmp' && r.src.length > 1 && r.src[1].type == 'tmp') {
            if (r.src[0].id - r.src[1].id > 2 || r.src[0].id - r.src[1].id < -2) {

                //console.log("pivot: ", r.dest.id, r.src[0].id, r.src[1].id);
                let a1 = r.dest.id;
                let a2 = r.src[0].id;
                let a3 = r.src[1].id;
                pivots.push([a1, a2, a3]);
            }
        }
    }

    for (let j = 0; j < code.length; j++) {
        const src = [];
        const r = code[j];
        for (k = 0; k < r.src.length; k++) {
            src.push(getRef(r.src[k], r.op, k));
        }
        let lexp = getLRef(r, r.op);
        ++cont_ops;
        switch (r.op) {
            case 'add': {
                if (r.dest.dim == 1) {
                    if (((r.src[0].dim != 1) || r.src[1].dim != 1)) {
                        throw new Error("Invalid dimension")
                    }
                    //This options is not present
                    assert(0);
                    body.push(`     Goldilocks::add_(${lexp}, ${src[0]}, ${src[1]});`)
                    counters_add[0] += 1;
                } else if (r.dest.dim == 3) {

                    if (r.src[0].dim == 1 || r.src[1].dim == 1) {
                        counters_add[1] += 1;
                    } else {
                        assert(r.src[0].dim == 3 && r.src[1].dim == 3);
                        counters_add[2] += 1;
                    }

                    if (r.src[1].dim == 1) {
                        body.push(`     Goldilocks3::add2(${lexp}, ${src[0]}, ${src[1]});`)
                        ops.push(10);
                        opsString += "10, ";
                        ++counters_ops[10];
                        str = src[1];
                        size = parseInt(str.substring(str.lastIndexOf(" ")));
                        auxstr = str.substring(str.indexOf("[") + 1);
                        offset = parseInt(auxstr.substring(0, auxstr.indexOf(" ")));
                        args.push(offset);
                        args.push(size);
                        argsString += `${offset}, `;
                        argsString += `${size}, `;
                        cont_args += 2;
                    } else if (r.src[1].type == "tmp") {
                        if (`${src[0]}` == 'tmp1') {
                            ops.push(8);
                            opsString += "8, ";
                            ++counters_ops[8];
                        } else {
                            ops.push(7);
                            opsString += "7, ";
                            ++counters_ops[7];
                        }
                        body.push(`     Goldilocks3::add0(${lexp}, ${src[0]}, ${src[1]});`)
                    } else {
                        body.push(`     Goldilocks3::add1(${lexp}, ${src[0]}, ${src[1]});`)
                        ops.push(9);
                        opsString += "9, ";
                        ++counters_ops[9];
                        str = src[1];
                        size = parseInt(str.substring(str.lastIndexOf(" ")));
                        auxstr = str.substring(str.indexOf("[") + 1);
                        offset = parseInt(auxstr.substring(0, auxstr.indexOf(" ")));
                        args.push(offset);
                        args.push(size);
                        argsString += `${offset}, `;
                        argsString += `${size}, `;
                        cont_args += 2;
                    }
                } else {
                    throw new Error("Invalid dim");
                }
                break;
            }
            case 'sub': {
                if (r.dest.dim == 1) {
                    if (((r.src[0].dim != 1) || r.src[1].dim != 1)) {
                        throw new Error("Invalid dimension")
                    }
                    body.push(`     Goldilocks::sub_(${lexp}, ${src[0]}, ${src[1]});`)
                    counters_sub[0] += 1;
                } else if (r.dest.dim == 3) {

                    if (r.src[0].dim == 1 || r.src[1].dim == 1) {
                        counters_sub[1] += 1;
                    } else {
                        assert(r.src[0].dim == 3 && r.src[1].dim == 3);
                        counters_sub[2] += 1;
                    }

                    if (r.src[0].dim == 3) {
                        body.push(`     Goldilocks3::sub2(${lexp}, ${src[0]}, ${src[1]});`)
                        ops.push(12);
                        opsString += "12, ";
                        ++counters_ops[12];
                        str = src[0];
                        size = parseInt(str.substring(str.lastIndexOf(" ")));
                        auxstr = str.substring(str.indexOf("[") + 1);
                        offset = parseInt(auxstr.substring(0, auxstr.indexOf(" ")));
                        str = src[1];
                        auxstr = str.substring(str.indexOf("[") + 1);
                        evid = parseInt(auxstr.substring(0, auxstr.indexOf("]")));
                        args.push(offset);
                        args.push(size);
                        args.push(evid);
                        argsString += `${offset}, `;
                        argsString += `${size}, `;
                        argsString += `${evid}, `;
                        cont_args += 3;
                    } else if (r.src[0].type == 'const') {
                        body.push(`     Goldilocks3::sub1(${lexp}, ${src[0]}, ${src[1]});`)
                        if (`${lexp}` == 'tmp2') {
                            ops.push(13);
                            opsString += "13, ";
                            ++counters_ops[13];
                            str = src[0];
                            auxstr = str.substring(str.indexOf("(") + 1);
                            elm = parseInt(auxstr.substring(0, auxstr.indexOf(",")));
                            str = src[1];
                            auxstr = str.substring(str.indexOf("[") + 1);
                            evid = parseInt(auxstr.substring(0, auxstr.indexOf("]")));
                            args.push(elm);
                            args.push(evid);
                            argsString += `${elm}, `;
                            argsString += `${evid}, `;
                            cont_args += 2;
                        } else {
                            ops.push(14);
                            opsString += "14, ";
                            ++counters_ops[14];
                        }
                    } else {
                        body.push(`     Goldilocks3::sub0(${lexp}, ${src[0]}, ${src[1]});`)
                        ops.push(11);
                        ++counters_ops[11];
                        opsString += "11, ";
                        str = src[0];
                        size = parseInt(str.substring(str.lastIndexOf(" ")));
                        auxstr = str.substring(str.indexOf("[") + 1);
                        offset = parseInt(auxstr.substring(0, auxstr.indexOf(" ")));
                        str = src[1];
                        auxstr = str.substring(str.indexOf("[") + 1);
                        evid = parseInt(auxstr.substring(0, auxstr.indexOf("]")));
                        args.push(offset);
                        args.push(size);
                        args.push(evid);
                        argsString += `${offset}, `;
                        argsString += `${size}, `;
                        argsString += `${evid}, `;
                        cont_args += 3;
                    }
                } else {
                    throw new Error("Invalid dim");
                }
                break;
            }
            case 'mul': {
                if (r.dest.dim == 1) {
                    if (((r.src[0].dim != 1) || r.src[1].dim != 1)) {
                        throw new Error("Invalid dimension")
                    }
                    body.push(`     Goldilocks::mul(${lexp}, ${src[0]}, ${src[1]});`)
                    counters_mul[0] += 1;
                } else if (r.dest.dim == 3) {

                    if (r.src[0].dim == 1 || r.src[1].dim == 1) {
                        counters_mul[1] += 1;
                        if (r.src[1].type === 'xDivXSubXi' || r.src[1].type === 'xDivXSubWXi') {
                            body.push(`     Goldilocks3::mul2(${lexp}, ${src[0]}, ${src[1]});`)
                            if (r.src[1].type === 'xDivXSubXi') {
                                ops.push(5);
                                ++counters_ops[5];
                                opsString += "5, ";
                            } else {
                                ops.push(6);
                                ++counters_ops[6];
                                opsString += "6, ";
                            }
                        } else {
                            ops.push(0);
                            ++counters_ops[0];
                            opsString += "0, ";
                            body.push(`     Goldilocks3::mul0(${lexp}, ${src[1]}, ${src[0]});`);
                            str = src[1];
                            size = parseInt(str.substring(str.lastIndexOf(" ")));
                            auxstr = str.substring(str.indexOf("[") + 1);
                            offset = parseInt(auxstr.substring(0, auxstr.indexOf(" ")));
                            args.push(offset);
                            args.push(size);
                            argsString += `${offset}, `;
                            argsString += `${size}, `;
                            cont_args += 2;

                        }
                    } else {
                        assert(r.src[0].dim == 3 && r.src[1].dim == 3);
                        counters_mul[2] += 1;
                        if (r.src[0].type === 'challenge') {
                            body.push(`     Goldilocks3::mul1(${lexp}, ${src[1]}, ${src[0]});`)
                            if (`${lexp}` == 'tmp1') {
                                ops.push(3);
                                ++counters_ops[3];
                                opsString += "3, ";
                            } else {
                                ops.push(1);
                                ++counters_ops[1];
                                opsString += "1, ";
                            }
                        } else {
                            body.push(`     Goldilocks3::mul1(${lexp}, ${src[0]}, ${src[1]});`)
                            if (`${src[0]}` == 'tmp2') {
                                ops.push(4);
                                ++counters_ops[4];
                                opsString += "4, ";
                            } else {
                                ops.push(2);
                                ++counters_ops[2];
                                opsString += "2, ";
                            }
                        }
                    }
                } else {
                    throw new Error("Invalid dim");
                }
                break;
            }
            case 'copy': {
                ops.push(15);
                ++counters_ops[15];
                opsString += "15, ";
                if (r.dest.dim == 1) {
                    if (r.src[0].dim != 1) {
                        throw new Error("Invalid dimension")
                    }
                    body.push(`     Goldilocks::copy(${lexp}, ${src[0]});`)
                } else if (r.dest.dim == 3) {
                    if (r.src[0].dim == 1) {
                        body.push(`     Goldilocks3::copy(${lexp}, ${src[0]});`)
                    } else if (r.src[0].dim == 3) {
                        body.push(`     Goldilocks3::copy(${lexp}, ${src[0]});`)
                    } else {
                        throw new Error("Invalid dimension")
                    }
                } else {
                    throw new Error("Invalid dim");
                }
                break;
            }
            default: throw new Error("Invalid op:" + c[j].op);
        }


    }

    console.log("\n", functionName);
    if (dbg) {
        console.log(functionName);
        console.log(counters_add);
        console.log(counters_sub);
        console.log(counters_mul);
        console.log("Refs:", refcount);
        console.log("Refs pols:", refpols);
        console.log("           ", range_pols_1, range_polsseq_1);
        console.log("           ", range_pols_2, range_polsseq_2);
        console.log("           ", range_pols_3, range_polsseq_3);
        console.log("           ", range_pols_4, range_polsseq_4);
        console.log("Refs temp:", reftem, ":");
        console.log("           ", range_tem[0], range_tem[1]);
        console.log("           ", range_tem[2], range_tem[3]);
        console.log("Refs const:", refconst, ":");
        console.log("           ", range_const[0], range_const[1]);
        console.log("           ", range_const[2], range_const[3]);
        console.log("           ", range_const[4], range_const[5]);
        console.log("           ", range_const[6], range_const[7]);
        console.log("Refs chall:", refchall, ":", range_chall[0], range_chall[1]);
        console.log("Refs num", refnum);
        console.log("Refs evals", refevals, ":", range_evals);
        console.log("rest =", refcount - refpols - reftem - refconst - refchall - refnum - refevals);
        console.log("\n");
        console.log("NOPS: ", cont_ops, ops.length);
        console.log("NARGS: ", cont_args, args.length);
        console.log(pivots);
    }

    let res;
    opsString = opsString.slice(0, -2);
    opsString += "};"
    argsString = argsString.slice(0, -2);
    argsString += "};"

    // join operations
    groupOps = " 1, 10,";
    let countGroup = opsString.split(groupOps).length - 1;
    cont_ops -= countGroup;
    opsString = opsString.replace(new RegExp(groupOps, "g"), " 16,");

    groupOps = " 1, 9,";
    countGroup = opsString.split(groupOps).length - 1;
    cont_ops -= countGroup;
    opsString = opsString.replace(new RegExp(groupOps, "g"), " 17,");

    groupOps = " 2, 11, 7,";
    countGroup = opsString.split(groupOps).length - 1;
    cont_ops -= 2 * countGroup;
    opsString = opsString.replace(new RegExp(groupOps, "g"), " 18,");

    groupOps = " 2, 13, 7,";
    countGroup = opsString.split(groupOps).length - 1;
    cont_ops -= 2 * countGroup;
    opsString = opsString.replace(new RegExp(groupOps, "g"), " 19,");

    groupOps = " 2, 12, 7,";
    countGroup = opsString.split(groupOps).length - 1;
    cont_ops -= 2 * countGroup;
    opsString = opsString.replace(new RegExp(groupOps, "g"), " 20,");

    res = [
        `#define NOPS_ ${cont_ops}`,
        `#define NARGS_ ${cont_args}`,
        "\n",
        `uint64_t op52[NOPS_] = ${opsString}`,
        "\n",
        `uint64_t args52[NARGS_] = ${argsString}`
    ].join("\n");

    return res;

    function getRef(r, op, karg) {
        ++refcount;
        switch (r.type) {
            case "tmp": {
                ++reftem;

                if (r.dim == 1) {
                    if (r.id < range_tem[0] || range_tem[0] === -1) range_tem[0] = r.id;
                    if (r.id > range_tem[1] || range_tem[1] === -1) range_tem[1] = r.id;
                    return `tmp1[${r.id}]`;

                } else if (r.dim == 3) {
                    if (r.id < range_tem[2] || range_tem[2] === -1) range_tem[2] = r.id;
                    if (r.id > range_tem[3] || range_tem[3] === -1) range_tem[3] = r.id;
                    switch (op) {
                        case 'add': {
                            if (r.id == pivots[0][1] || r.id == pivots[1][1]) {
                                return "tmp1";
                            }
                            if (r.id == pivots[0][2] || r.id == pivots[1][2]) {
                                return "tmp";
                            }
                            if (karg == 0) {
                                return "tmp";
                            } else {
                                assert(karg == 1);
                                return "tmp2";
                            }
                            assert(0);
                            break;
                        }
                        case 'sub': {
                            throw new Error("This option should not be used for fri");
                            break;
                        }
                        case 'mul': {
                            if (r.id == pivots[1][1] + 1) {
                                return "tmp2";
                            }
                            return "tmp";
                            break;
                        }
                        case 'copy': {
                            return "tmp";
                            break;
                        }
                        default: throw new Error("Invalid op: " + op);
                    }

                } else {
                    throw new Error("Invalid dim");
                }
            }
            case "const": {
                ++refconst;
                if (dom == "n") {
                    if (r.prime) {
                        if (r.id < range_const[0] || range_const[0] === -1) range_const[0] = r.id;
                        if (r.id > range_const[1] || range_const[1] === -1) range_const[1] = r.id;
                        return ` params.pConstPols->getElement(${r.id},(i+1)%${N})`;
                    } else {
                        if (r.id < range_const[2] || range_const[2] === -1) range_const[2] = r.id;
                        if (r.id > range_const[3] || range_const[3] === -1) range_const[3] = r.id;
                        return ` params.pConstPols->getElement(${r.id},i)`;
                    }
                } else if (dom == "ext") {
                    if (r.prime) {
                        if (r.id < range_const[4] || range_const[4] === -1) range_const[4] = r.id;
                        if (r.id > range_const[5] || range_const[5] === -1) range_const[5] = r.id;
                        return `params.pConstPolsext->getElement(${r.id},(i+${next})%${N})`;
                    } else {
                        if (r.id < range_const[6] || range_const[6] === -1) range_const[6] = r.id;
                        if (r.id > range_const[7] || range_const[7] === -1) range_const[7] = r.id;
                        return `&params.pConstPolsext->getElement(${r.id},i), params.pConstPolsext->numPols()`;
                    }
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "cm": {
                if (dom == "n") {
                    return evalMap(r.id, r.prime, false)
                } else if (dom == "ext") {
                    return evalMap(r.id, r.prime, true)
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "q": {
                if (dom == "n") {
                    throw new Error("Accessing q in domain n");
                } else if (dom == "ext") {
                    return evalMap(starkInfo.qs[r.id], r.prime, true)
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "number": {
                ++refnum;
                return `Goldilocks::fromU64(${BigInt(r.value).toString()}ULL)`;
            }
            case "public": return `params.publicInputs[${r.id}]`;
            case "challenge": {
                ++refchall;
                if (r.id < range_chall[0] || range_chall[0] === -1) range_chall[0] = r.id;
                if (r.id > range_chall[1] || range_chall[1] === -1) range_chall[1] = r.id;
                return `(Goldilocks3::Element &)*params.challenges[${r.id}]`;
            }
            case "eval": {
                ++refevals;
                if (r.id < range_evals[0] || range_evals[0] === -1) range_evals[0] = r.id;
                if (r.id > range_evals[1] || range_evals[1] === -1) range_evals[1] = r.id;
                return `(Goldilocks3::Element &)*params.evals[${r.id}]`;
            }
            case "xDivXSubXi": return `params.xDivXSubXi[i]`;
            case "xDivXSubWXi": return `params.xDivXSubWXi[i]`;
            case "x": {
                if (dom == "n") {
                    return `(Goldilocks::Element &)*params.x_n[i]`;
                } else if (dom == "ext") {
                    return `(Goldilocks::Element &)*params.x_ext[i]`;
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "Zi": return `params.zi.zhInv(i)`;
            default: throw new Error("Invalid reference type get: " + r.type);
        }
    }

    function getLRef(r, op) {
        let eDst;
        switch (r.dest.type) {
            case "tmp": {
                if (r.dest.dim == 1) {
                    //body.push(`     Goldilocks::Element tmp1[${r.dest.id}];`);
                    assert(0);
                    eDst = `tmp1[${r.dest.id}]`;
                } else if (r.dest.dim == 3) {
                    //body.push(`     (Goldilocks3::Element &) tmp3[${r.dest.id}];`);
                    //eDst = `tmp3[${r.dest.id}]`;
                    switch (op) {
                        case 'add': {
                            eDst = 'tmp';
                            break;
                        }
                        case 'sub': {
                            eDst = 'tmp2';
                            if (r.dest.id == pivots[0][1] + 1) {
                                eDst = 'tmp';
                            }
                            break;
                        }
                        case 'mul': {
                            eDst = 'tmp';
                            if (r.dest.id == pivots[0][1] || r.dest.id == pivots[1][1]) {
                                eDst = 'tmp1';
                            }
                            break;
                        }
                        case 'copy': {
                            assert(0);
                            break;
                        }
                        default: throw new Error("Invalid op: " + op);
                    }
                } else {
                    throw new Error("Invalid dim");
                }
                break;
            }
            case "q": {
                if (dom == "n") {
                    throw new Error("Accessing q in domain n");
                } else if (dom == "ext") {
                    eDst = `(Goldilocks3::Element &)(params.q_ext[i * 3])`
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            }
            case "cm": {
                if (dom == "n") {
                    eDst = evalMap(r.dest.id, r.dest.prime, false)
                } else if (dom == "ext") {
                    eDst = evalMap(r.dest.id, r.dest.prime, true)
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            }
            case "f": {
                if (dom == "n") {
                    throw new Error("Accessing q in domain n");
                } else if (dom == "ext") {
                    eDst = `(Goldilocks3::Element &)(params.f_ext[i * 3])`
                } else {
                    throw new Error("Invalid dom");
                }
            }
                break;
            default: throw new Error("Invalid reference type set: " + r.dest.type);
        }
        return eDst;
    }

    function evalMap(polId, prime, extend) {
        let p = starkInfo.cmPolsMap[polId];
        ++refpols;
        if (!p) {
            console.log("xx");
        }
        let stage = extend ? p.stage + "_n" : p.stage + "_ext";
        let offset = starkInfo.mapOffsets[stage];
        offset += p.stagePos;
        let size = starkInfo.mapSectionsN[p.stage];
        if (p.dim == 1) {
            if (prime) {
                range_pols_1.add(size);
                range_polsseq_1.add(stage);
                return `params.pols[${offset} + ((i + ${next})%${N})*${size}]`;

            } else {
                range_pols_2.add(size);
                range_polsseq_2.add(stage);
                return `&params.pols[${offset} + i*${size}], ${size}`;
            }
        } else if (p.dim == 3) {
            if (prime) {
                range_pols_3.add(size);
                range_polsseq_3.add(stage);

                return `params.pols[${offset} + ((i + ${next})%${N})*${size}]`;
            } else {
                range_pols_4.add(size);
                range_polsseq_4.add(stage);
                return `&params.pols[${offset} + i*${size}], ${size}`;
            }
        } else {
            throw new Error("invalid dim");
        }
    }

}