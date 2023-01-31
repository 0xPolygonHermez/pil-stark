const { assert } = require("chai");

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



module.exports = async function buildCHelpers(starkInfo, config = {}) {

    const code = [];
    const multipleCodeFiles = config && config.multipleCodeFiles;

    for (let i = 0; i < starkInfo.nPublics; i++) {
        if (starkInfo.publicsCode[i]) {
            code.push(compileCode("publics_" + i + "_first", starkInfo.publicsCode[i].first, "n", true));
            code.push(compileCode("publics_" + i + "_i", starkInfo.publicsCode[i].first, "n", true));
            code.push(compileCode("publics_" + i + "_last", starkInfo.publicsCode[i].first, "n", true));
        }
    }

    const pubTable = [];
    pubTable.push("publics = (")
    for (let i = 0; i < starkInfo.nPublics; i++) {
        const comma = i == 0 ? "     " : "     ,";
        if (starkInfo.publicsCode[i]) {
            pubTable.push(`${comma}(publics_${i}_first, publics_${i}_i,  publics_${i}_last)`);
        } else {
            pubTable.push(`${comma}(NULL,NULL,NULL)`);
        }
    }
    pubTable.push(");");

    let result = {};

    if (multipleCodeFiles) {
        result.public = pubTable.join("\n") + "\n";
    }
    else {
        code.push(pubTable.join("\n"));
    }

    code.push(compileCode("step2prev_first", starkInfo.step2prev.first, "n"));
    code.push(compileCode("step2prev_i", starkInfo.step2prev.first, "n"));
    code.push(compileCode("step2prev_last", starkInfo.step2prev.first, "n"));

    if (multipleCodeFiles) {
        result.step2 = code.join("\n\n") + "\n";
        code.length = 0;
    }

    code.push(compileCode("step3prev_first", starkInfo.step3prev.first, "n"));
    code.push(compileCode("step3prev_i", starkInfo.step3prev.first, "n"));
    code.push(compileCode("step3prev_last", starkInfo.step3prev.first, "n"));

    if (multipleCodeFiles) {
        result.step3prev = code.join("\n\n") + "\n";
        code.length = 0;
    }

    code.push(compileCode("step3_first", starkInfo.step3.first, "n"));
    code.push(compileCode("step3_i", starkInfo.step3.first, "n"));
    code.push(compileCode("step3_last", starkInfo.step3.first, "n"));

    if (multipleCodeFiles) {
        result.step3 = code.join("\n\n") + "\n";
        code.length = 0;
    }

    code.push(compileCode("step42ns_first", starkInfo.step42ns.first, "2ns"));
    code.push(compileCode("step42ns_i", starkInfo.step42ns.first, "2ns"));
    code.push(compileCode("step42ns_last", starkInfo.step42ns.first, "2ns"));

    if (multipleCodeFiles) {
        result.step42ns = code.join("\n\n") + "\n";
        code.length = 0;
    }

    code.push(compileCode_("step52ns_first", starkInfo.step52ns.first, "2ns"));
    code.push(compileCode("step52ns_i", starkInfo.step52ns.first, "2ns"));
    code.push(compileCode("step52ns_last", starkInfo.step52ns.first, "2ns"));

    if (multipleCodeFiles) {
        result.step52ns = code.join("\n\n") + "\n";
        return result;
    }

    // previous
    return code.join("\n\n");

    function compileCode(functionName, code, dom, ret) {
        const body = [];

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

        for (let j = 0; j < code.length; j++) {
            const src = [];
            const r = code[j];
            for (k = 0; k < r.src.length; k++) {
                src.push(getRef(r.src[k]));
            }
            let lexp = getLRef(r);
            switch (r.op) {
                case 'add': {
                    if (r.dest.dim == 1) {
                        if (((r.src[0].dim != 1) || r.src[1].dim != 1)) {
                            throw new Error("Invalid dimension")
                        }
                        body.push(`     Goldilocks::add(${lexp}, ${src[0]}, ${src[1]});`)
                        counters_add[0] += 1;
                    } else if (r.dest.dim == 3) {

                        if (r.src[0].dim == 1 || r.src[1].dim == 1) {
                            counters_add[1] += 1;
                        } else {
                            assert(r.src[0].dim == 3 && r.src[1].dim == 3);
                            counters_add[2] += 1;
                        }

                        if (((r.src[0].dim == 1) || r.src[1].dim == 3)) {
                            body.push(`     Goldilocks3::add(${lexp}, ${src[0]}, ${src[1]});`)
                        } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                            body.push(`     Goldilocks3::add(${lexp}, ${src[1]}, ${src[0]});`)
                        } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                            body.push(`     Goldilocks3::add(${lexp}, ${src[0]}, ${src[1]});`)
                        } else {
                            throw new Error("Invalid dimension")
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
                        body.push(`     Goldilocks::sub(${lexp}, ${src[0]}, ${src[1]});`)
                        counters_sub[0] += 1;
                    } else if (r.dest.dim == 3) {

                        if (r.src[0].dim == 1 || r.src[1].dim == 1) {
                            counters_sub[1] += 1;
                        } else {
                            assert(r.src[0].dim == 3 && r.src[1].dim == 3);
                            counters_sub[2] += 1;
                        }

                        if (((r.src[0].dim == 1) || r.src[1].dim == 3)) {
                            body.push(`     Goldilocks3::sub(${lexp}, ${src[0]}, ${src[1]});`)
                        } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                            body.push(`     Goldilocks3::sub(${lexp}, ${src[0]}, ${src[1]});`)
                        } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                            body.push(`     Goldilocks3::sub(${lexp}, ${src[0]}, ${src[1]});`)
                        } else {
                            throw new Error("Invalid dimension")
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
                        } else {
                            assert(r.src[0].dim == 3 && r.src[1].dim == 3);
                            counters_mul[2] += 1;
                        }

                        if (((r.src[0].dim == 1) || r.src[1].dim == 3)) {
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[0]}, ${src[1]});`)
                        } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[1]}, ${src[0]});`)
                        } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[0]}, ${src[1]});`)
                        } else {
                            throw new Error("Invalid dimension")
                        }
                    } else {
                        throw new Error("Invalid dim");
                    }
                    break;
                }
                case 'copy': {
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

        if (ret) {
            body.push(`     return ${getRef(code[code.length - 1].dest)};`);
        }

        let res;
        if (ret) {
            res = [
                `Goldilocks::Element ${config.className}::${functionName}(StepsParams &params, uint64_t i) {`,
                ...body,
                `}`
            ].join("\n");
        } else {
            res = [
                `void ${config.className}::${functionName}(StepsParams &params, uint64_t i) {`,
                ...body,
                `}`
            ].join("\n");
        }

        return res;

        function getRef(r) {
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
                        return `tmp3[${r.id}]`;

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
                    } else if (dom == "2ns") {
                        if (r.prime) {
                            if (r.id < range_const[4] || range_const[4] === -1) range_const[4] = r.id;
                            if (r.id > range_const[5] || range_const[5] === -1) range_const[5] = r.id;
                            return `params.pConstPols2ns->getElement(${r.id},(i+${next})%${N})`;
                        } else {
                            if (r.id < range_const[6] || range_const[6] === -1) range_const[6] = r.id;
                            if (r.id > range_const[7] || range_const[7] === -1) range_const[7] = r.id;
                            return `params.pConstPols2ns->getElement(${r.id},i)`;

                        }
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
                case "tmpExp": {
                    if (dom == "n") {
                        return evalMap(starkInfo.tmpExp_n[r.id], r.prime)
                    } else if (dom == "2ns") {
                        throw new Error("Invalid dom");
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
                case "cm": {
                    if (dom == "n") {
                        return evalMap(starkInfo.cm_n[r.id], r.prime)
                    } else if (dom == "2ns") {
                        return evalMap(starkInfo.cm_2ns[r.id], r.prime)
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
                case "q": {
                    if (dom == "n") {
                        throw new Error("Accessing q in domain n");
                    } else if (dom == "2ns") {
                        return evalMap(starkInfo.qs[r.id], r.prime)
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
                case "xDivXSubXi": return `(Goldilocks3::Element &)*params.xDivXSubXi[i]`;
                case "xDivXSubWXi": return `(Goldilocks3::Element &)*params.xDivXSubWXi[i]`;
                case "x": {
                    if (dom == "n") {
                        return `(Goldilocks::Element &)*params.x_n[i]`;
                    } else if (dom == "2ns") {
                        return `(Goldilocks::Element &)*params.x_2ns[i]`;
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
                case "Zi": return `params.zi.zhInv(i)`;
                default: throw new Error("Invalid reference type get: " + r.type);
            }
        }

        function getLRef(r) {
            let eDst;
            switch (r.dest.type) {
                case "tmp": {
                    if (r.dest.dim == 1) {
                        //body.push(`     Goldilocks::Element tmp1[${r.dest.id}];`);
                        eDst = `tmp1[${r.dest.id}]`;
                    } else if (r.dest.dim == 3) {
                        //body.push(`     (Goldilocks3::Element &) tmp3[${r.dest.id}];`);
                        eDst = `tmp3[${r.dest.id}]`;
                    } else {
                        throw new Error("Invalid dim");
                    }
                    break;
                }
                case "q": {
                    if (dom == "n") {
                        throw new Error("Accessing q in domain n");
                    } else if (dom == "2ns") {
                        eDst = `(Goldilocks3::Element &)(params.q_2ns[i * 3])`
                    } else {
                        throw new Error("Invalid dom");
                    }
                    break;
                }
                case "cm": {
                    if (dom == "n") {
                        eDst = evalMap(starkInfo.cm_n[r.dest.id], r.dest.prime)
                    } else if (dom == "2ns") {
                        eDst = evalMap(starkInfo.cm_2ns[r.dest.id], r.dest.prime)
                    } else {
                        throw new Error("Invalid dom");
                    }
                    break;
                }
                case "tmpExp": {
                    if (dom == "n") {
                        eDst = evalMap(starkInfo.tmpExp_n[r.dest.id], r.dest.prime)
                    } else if (dom == "2ns") {
                        throw new Error("Invalid dom");
                    } else {
                        throw new Error("Invalid dom");
                    }
                    break;
                }
                case "f": {
                    if (dom == "n") {
                        throw new Error("Accessing q in domain n");
                    } else if (dom == "2ns") {
                        eDst = `(Goldilocks3::Element &)(params.f_2ns[i * 3])`
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
                    break;
                default: throw new Error("Invalid reference type set: " + r.dest.type);
            }
            return eDst;
        }

        function evalMap(polId, prime) {
            let p = starkInfo.varPolMap[polId];
            ++refpols;
            if (!p) {
                console.log("xx");
            }
            let offset = starkInfo.mapOffsets[p.section];
            offset += p.sectionPos;
            let size = starkInfo.mapSectionsN[p.section];
            if (p.dim == 1) {
                if (prime) {
                    range_pols_1.add(size);
                    range_polsseq_1.add(p.section);
                    return `params.pols[${offset} + ((i + ${next})%${N})*${size}]`;

                } else {
                    range_pols_2.add(size);
                    range_polsseq_2.add(p.section);
                    return `params.pols[${offset} + i*${size}]`;
                }
            } else if (p.dim == 3) {
                if (prime) {
                    range_pols_3.add(size);
                    range_polsseq_3.add(p.section);

                    return `(Goldilocks3::Element &)(params.pols[${offset} + ((i + ${next})%${N})*${size}])`;
                } else {
                    range_pols_4.add(size);
                    range_polsseq_4.add(p.section);
                    return `(Goldilocks3::Element &)(params.pols[${offset} + i*${size}])`;
                }
            } else {
                throw new Error("invalid dim");
            }
        }

    }
    //rick
    function compileCode_(functionName, code, dom, ret) {

        const body = [];
        var ops = [];
        var args = [];
        var cont_ops = 0;
        var cont_args = 0;
        var counters_ops = new Array(15).fill(0);

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
                    if (r.src[0].id != r.src[1].id - 1 && r.src[0].type === "tmp" && r.src[1].type === "tmp") {
                        console.log("holaaaa: ", r.src[0].id, r.src[1].id - 1);
                    }
                    if (r.dest.dim == 1) {
                        if (((r.src[0].dim != 1) || r.src[1].dim != 1)) {
                            throw new Error("Invalid dimension")
                        }
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
                            ++counters_ops[10];
                            str = src[1];
                            size = parseInt(str.substring(str.lastIndexOf(" ")));
                            auxstr = str.substring(str.indexOf("[") + 1);
                            offset = parseInt(auxstr.substring(0, auxstr.indexOf(" ")));
                            args.push(offset);
                            args.push(size);
                            cont_args += 2;
                        } else if (r.src[1].type == "tmp") {
                            if (`${src[0]}` == 'tmp1') {
                                ops.push(8);
                                ++counters_ops[8];
                            } else {
                                ops.push(7);
                                ++counters_ops[7];
                            }
                            body.push(`     Goldilocks3::add0(${lexp}, ${src[0]}, ${src[1]});`)
                        } else {
                            body.push(`     Goldilocks3::add1(${lexp}, ${src[0]}, ${src[1]});`)
                            ops.push(9);
                            ++counters_ops[9];
                            str = src[1];
                            size = parseInt(str.substring(str.lastIndexOf(" ")));
                            auxstr = str.substring(str.indexOf("[") + 1);
                            offset = parseInt(auxstr.substring(0, auxstr.indexOf(" ")));
                            args.push(offset);
                            args.push(size);
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
                            cont_args += 3;
                        } else if (r.src[0].type == 'const') {
                            body.push(`     Goldilocks3::sub1(${lexp}, ${src[0]}, ${src[1]});`)
                            if (`${lexp}` == 'tmp2') {
                                ops.push(13);
                                ++counters_ops[13];
                                str = src[0];
                                auxstr = str.substring(str.indexOf("(") + 1);
                                elm = parseInt(auxstr.substring(0, auxstr.indexOf(",")));
                                str = src[1];
                                auxstr = str.substring(str.indexOf("[") + 1);
                                evid = parseInt(auxstr.substring(0, auxstr.indexOf("]")));
                                args.push(elm);
                                args.push(evid);
                                cont_args += 2;
                            } else {
                                ops.push(14);
                                ++counters_ops[14];
                            }
                        } else {
                            body.push(`     Goldilocks3::sub0(${lexp}, ${src[0]}, ${src[1]});`)
                            ops.push(11);
                            ++counters_ops[11];
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
                                } else {
                                    ops.push(6);
                                    ++counters_ops[6];
                                }
                            } else {
                                ops.push(0);
                                ++counters_ops[0];
                                body.push(`     Goldilocks3::mul0(${lexp}, ${src[1]}, ${src[0]});`)
                            }
                        } else {
                            assert(r.src[0].dim == 3 && r.src[1].dim == 3);
                            counters_mul[2] += 1;
                            if (r.src[0].type === 'challenge') {
                                body.push(`     Goldilocks3::mul1(${lexp}, ${src[1]}, ${src[0]});`)
                                if (`${lexp}` == 'tmp1') {
                                    ops.push(3);
                                    ++counters_ops[3];
                                } else {
                                    ops.push(1);
                                    ++counters_ops[1];
                                }
                            } else {
                                body.push(`     Goldilocks3::mul1(${lexp}, ${src[0]}, ${src[1]});`)
                                if (`${src[0]}` == 'tmp2') {
                                    ops.push(4);
                                    ++counters_ops[4];
                                } else {
                                    ops.push(2);
                                    ++counters_ops[2];
                                }
                            }
                        }
                    } else {
                        throw new Error("Invalid dim");
                    }
                    break;
                }
                case 'copy': {
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

        if (ret) {
            body.push(`     return ${getRef(code[code.length - 1].dest)};`);
        }

        let res;
        if (ret) {
            res = [
                `Goldilocks::Element ${config.className}::${functionName}(StepsParams &params, uint64_t i) {`,
                ...body,
                `}`
            ].join("\n");
        } else {
            res = [
                `void ${config.className}::${functionName}(StepsParams &params, uint64_t i) {`,
                ...body,
                `}`
            ].join("\n");
        }
        console.log("\n\n");
        console.log(counters_ops)
        console.log(ops.length, cont_args);
        console.log("NOPS: ", cont_ops);
        process.stdout.write(JSON.stringify(ops));
        console.log("\n\n");
        console.log(cont_args, args.length);
        console.log("\n\n");
        process.stdout.write(JSON.stringify(args));
        console.log("\n\n");
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
                                if (r.id == 18257 || r.id == 21630) {
                                    return "tmp1";
                                }
                                if (r.id == 21628 || r.id == 23570) {
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
                                throw new Error("This option should not be used for 52ns");
                                break;
                            }
                            case 'mul': {
                                if (r.id == 21631) {
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
                    } else if (dom == "2ns") {
                        if (r.prime) {
                            if (r.id < range_const[4] || range_const[4] === -1) range_const[4] = r.id;
                            if (r.id > range_const[5] || range_const[5] === -1) range_const[5] = r.id;
                            return `params.pConstPols2ns->getElement(${r.id},(i+${next})%${N})`;
                        } else {
                            if (r.id < range_const[6] || range_const[6] === -1) range_const[6] = r.id;
                            if (r.id > range_const[7] || range_const[7] === -1) range_const[7] = r.id;
                            return `&params.pConstPols2ns->getElement(${r.id},i), params.pConstPols2ns->numPols()`;
                        }
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
                case "tmpExp": {
                    if (dom == "n") {
                        return evalMap(starkInfo.tmpExp_n[r.id], r.prime)
                    } else if (dom == "2ns") {
                        throw new Error("Invalid dom");
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
                case "cm": {
                    if (dom == "n") {
                        return evalMap(starkInfo.cm_n[r.id], r.prime)
                    } else if (dom == "2ns") {
                        return evalMap(starkInfo.cm_2ns[r.id], r.prime)
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
                case "q": {
                    if (dom == "n") {
                        throw new Error("Accessing q in domain n");
                    } else if (dom == "2ns") {
                        return evalMap(starkInfo.qs[r.id], r.prime)
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
                    } else if (dom == "2ns") {
                        return `(Goldilocks::Element &)*params.x_2ns[i]`;
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
                                if (r.dest.id == 18258) {
                                    eDst = 'tmp';
                                }
                                break;
                            }
                            case 'mul': {
                                eDst = 'tmp';
                                if (r.dest.id == 18257 || r.dest.id == 21630) {
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
                    } else if (dom == "2ns") {
                        eDst = `(Goldilocks3::Element &)(params.q_2ns[i * 3])`
                    } else {
                        throw new Error("Invalid dom");
                    }
                    break;
                }
                case "cm": {
                    if (dom == "n") {
                        eDst = evalMap(starkInfo.cm_n[r.dest.id], r.dest.prime)
                    } else if (dom == "2ns") {
                        eDst = evalMap(starkInfo.cm_2ns[r.dest.id], r.dest.prime)
                    } else {
                        throw new Error("Invalid dom");
                    }
                    break;
                }
                case "tmpExp": {
                    if (dom == "n") {
                        eDst = evalMap(starkInfo.tmpExp_n[r.dest.id], r.dest.prime)
                    } else if (dom == "2ns") {
                        throw new Error("Invalid dom");
                    } else {
                        throw new Error("Invalid dom");
                    }
                    break;
                }
                case "f": {
                    if (dom == "n") {
                        throw new Error("Accessing q in domain n");
                    } else if (dom == "2ns") {
                        eDst = `(Goldilocks3::Element &)(params.f_2ns[i * 3])`
                    } else {
                        throw new Error("Invalid dom");
                    }
                }
                    break;
                default: throw new Error("Invalid reference type set: " + r.dest.type);
            }
            return eDst;
        }

        function evalMap(polId, prime) {
            let p = starkInfo.varPolMap[polId];
            ++refpols;
            if (!p) {
                console.log("xx");
            }
            let offset = starkInfo.mapOffsets[p.section];
            offset += p.sectionPos;
            let size = starkInfo.mapSectionsN[p.section];
            if (p.dim == 1) {
                if (prime) {
                    range_pols_1.add(size);
                    range_polsseq_1.add(p.section);
                    return `params.pols[${offset} + ((i + ${next})%${N})*${size}]`;

                } else {
                    range_pols_2.add(size);
                    range_polsseq_2.add(p.section);
                    return `&params.pols[${offset} + i*${size}], ${size}`;
                }
            } else if (p.dim == 3) {
                if (prime) {
                    range_pols_3.add(size);
                    range_polsseq_3.add(p.section);

                    return `params.pols[${offset} + ((i + ${next})%${N})*${size}]`;
                } else {
                    range_pols_4.add(size);
                    range_polsseq_4.add(p.section);
                    return `&params.pols[${offset} + i*${size}], ${size}`;
                }
            } else {
                throw new Error("invalid dim");
            }
        }

    }


}