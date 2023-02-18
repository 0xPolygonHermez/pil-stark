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

var args = [];
var cont_args = 0;

module.exports = function compileCode_42ns(starkInfo, config, functionName, code, dom, ret) {
    const body = [];
    var ops = [];
    var cont_ops = 0;
    var counters_ops = new Array(84).fill(0);

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
        let lexp = getLRef(r);
        for (k = 0; k < r.src.length; k++) {
            src.push(getRef(r.src[k]));
        }
        switch (r.op) {
            case 'add': {

                if (r.dest.dim == 1) {
                    if (((r.src[0].dim != 1) || r.src[1].dim != 1)) {
                        throw new Error("Invalid dimension")
                    }
                    counters_add[0] += 1;
                    if (r.src[0].type === "tmp" && r.src[0].dim == 1) {
                        pushSrcArg(r.src[0]);
                        pushSrcArg(r.src[1]);
                        body.push(`     Goldilocks::add(${lexp}, ${src[0]}, ${src[1]});`)
                        switch (r.src[1].type) {
                            case "tmp": {
                                counters_ops[0] += 1;
                                ++cont_ops;
                                ops.push(0);
                                break;
                            }
                            case "cm": {
                                assert(!r.src[1].prime);
                                counters_ops[1] += 1;
                                ++cont_ops;
                                ops.push(1);
                                break;
                            }
                            case "number": {
                                counters_ops[2] += 1;
                                ++cont_ops;
                                ops.push(2);
                                break;
                            }
                            case "const": {
                                assert(!r.src[1].prime);
                                counters_ops[3] += 1;
                                ++cont_ops;
                                ops.push(3);
                                break;
                            }
                        }
                    } else if (r.src[1].type === "tmp") {
                        pushSrcArg(r.src[1]);
                        pushSrcArg(r.src[0]);
                        body.push(`     Goldilocks::add(${lexp}, ${src[1]}, ${src[0]});`)
                        switch (r.src[0].type) {
                            case "tmp": {
                                counters_ops[0] += 1;
                                ++cont_ops;
                                ops.push(0);
                                break;

                            }
                            case "cm": {
                                assert(!r.src[0].prime);
                                counters_ops[1] += 1;
                                ++cont_ops;
                                ops.push(1);
                                break;
                            }
                            case "number": {
                                counters_ops[2] += 1;
                                ++cont_ops;
                                ops.push(2);
                                break;
                            }
                            case "const": {
                                assert(!r.src[0].prime);
                                counters_ops[3] += 1;
                                ++cont_ops;
                                ops.push(3);
                                break;
                            }
                        }
                    } else {
                        pushSrcArg(r.src[0]);
                        pushSrcArg(r.src[1]);
                        body.push(`     Goldilocks::add(${lexp}, ${src[0]}, ${src[1]});`)
                        if (r.src[0].type == "cm" && r.src[1].type == "cm") {
                            if (r.src[0].prime && r.src[1].prime) {
                                counters_ops[5] += 1;
                                ops.push(5);
                            } else {
                                assert(!r.src[1].prime);
                                assert(!r.src[0].prime);
                                counters_ops[4] += 1;
                                ops.push(4);
                            }
                            ++cont_ops;
                        } else if (r.src[0].type == "cm" && r.src[1].type == "const") {
                            counters_ops[6] += 1;
                            ops.push(6);
                            assert(!r.src[1].prime);
                            assert(!r.src[0].prime);
                            ++cont_ops;
                        } else if (r.src[0].type == "cm" && r.src[1].type == "number") {
                            counters_ops[7] += 1;
                            ops.push(7);
                            assert(!r.src[0].prime);
                            ++cont_ops;
                        } else if (r.src[0].type == "const" && r.src[1].type == "const") {
                            if (r.src[0].prime && r.src[1].prime) {
                                counters_ops[9] += 1;
                                ops.push(9);
                            } else {
                                counters_ops[8] += 1;
                                assert(!r.src[1].prime);
                                assert(!r.src[0].prime);
                                ops.push(8);
                            }
                            ++cont_ops;
                        } else if (r.src[0].type == "const" && r.src[1].type == "number") {
                            if (r.src[0].prime) {
                                counters_ops[11] += 1;
                                ops.push(11);
                            } else {
                                assert(!r.src[0].prime);
                                counters_ops[10] += 1;
                                ops.push(10);
                            }
                            ++cont_ops;
                        } else {
                            throw new Error("Option not considered!");
                        }

                    }
                } else if (r.dest.dim == 3) {

                    if (r.src[0].dim == 1 || r.src[1].dim == 1) {
                        counters_add[1] += 1;

                        if ((r.src[0].dim == 1) && (r.src[0].type === 'tmp') &&
                            (r.src[1].dim == 3) && (r.src[1].type === 'tmp')) {
                            counters_ops[12] += 1;
                            cont_ops += 1;
                            ops.push(12);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::add(${lexp}, ${src[0]}, ${src[1]});`)
                        } else if ((r.src[1].dim == 1) && (r.src[1].type === 'tmp') &&
                            (r.src[0].dim == 3) && (r.src[0].type === 'tmp')) {
                            counters_ops[12] += 1;
                            ops.push(12);
                            cont_ops += 1;
                            pushSrcArg(r.src[1]);
                            pushSrcArg(r.src[0]);
                            body.push(`     Goldilocks3::add(${lexp}, ${src[1]}, ${src[0]});`)
                        } else if ((r.src[0].type === 'number') && (r.src[1].type === 'challenge')) {
                            assert(r.src[0].dim == 1);
                            counters_ops[13] += 1;
                            ops.push(13);
                            cont_ops += 1;
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::add(${lexp}, ${src[0]}, ${src[1]});`)
                        } else if ((r.src[0].type === 'tmp') && (r.src[1].type === 'challenge')) {
                            assert(r.src[0].dim == 1);
                            counters_ops[14] += 1;
                            ops.push(14);
                            cont_ops += 1;
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::add(${lexp}, ${src[0]}, ${src[1]});`)
                        } else if ((r.src[0].type === 'cm') && (r.src[1].type === 'tmp')) {
                            assert(r.src[0].dim == 1);
                            assert(!r.src[0].prime);
                            counters_ops[15] += 1;
                            ops.push(15);
                            cont_ops += 1;
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::add(${lexp}, ${src[0]}, ${src[1]});`)
                        } else if ((r.src[0].type === 'cm') && (r.src[1].type === 'challenge')) {
                            assert(r.src[0].dim == 1);
                            assert(!r.src[0].prime);
                            counters_ops[16] += 1;
                            ops.push(16);
                            cont_ops += 1;
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::add(${lexp}, ${src[0]}, ${src[1]});`)
                        } else {
                            console.log(src[0], src[1]);
                            throw new Error("Option not considered!");
                        }
                    } else {
                        assert(r.src[0].dim == 3 && r.src[1].dim == 3);
                        counters_add[2] += 1;
                        if ((r.src[0].type === 'tmp') && (r.src[1].type === 'tmp')) {
                            counters_ops[17] += 1;
                            ops.push(17);
                            cont_ops += 1;
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::add(${lexp}, ${src[0]}, ${src[1]});`)
                        } else if ((r.src[0].type === 'tmp') && (r.src[1].type === 'challenge')) {
                            counters_ops[18] += 1;
                            ops.push(18);
                            cont_ops += 1;
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::add(${lexp}, ${src[0]}, ${src[1]});`)
                        } else if ((r.src[0].type === 'cm') && (r.src[1].type === 'tmp')) {
                            assert(!r.src[0].prime);
                            counters_ops[19] += 1;
                            ops.push(19);
                            cont_ops += 1;
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::add(${lexp}, ${src[0]}, ${src[1]});`)
                        } else if ((r.src[0].type === 'tmp') && (r.src[1].type === 'cm')) {
                            assert(!r.src[1].prime);
                            counters_ops[19] += 1;
                            ops.push(19);
                            cont_ops += 1;
                            pushSrcArg(r.src[1]);
                            pushSrcArg(r.src[0]);
                            body.push(`     Goldilocks3::add(${lexp}, ${src[1]}, ${src[0]});`)
                        } else if ((r.src[0].type === 'cm') && (r.src[1].type === 'challenge')) {
                            assert(!r.src[0].prime);
                            counters_ops[20] += 1;
                            ops.push(20);
                            cont_ops += 1;
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::add(${lexp}, ${src[0]}, ${src[1]});`)
                        } else {
                            console.log(src[0], src[1]);
                            throw new Error("Option not considered!");
                        }

                    }
                } else {
                    throw new Error("Invalid dim");
                }
                break;
            }
            case 'sub': {

                pushSrcArg(r.src[0]);
                pushSrcArg(r.src[1]);
                body.push(`     Goldilocks::sub(${lexp}, ${src[0]}, ${src[1]});`)
                if (r.dest.dim == 1) {
                    if (((r.src[0].dim != 1) || r.src[1].dim != 1)) {
                        throw new Error("Invalid dimension")
                    }
                    counters_sub[0] += 1;
                    if ((r.src[0].type === 'tmp') && (r.src[1].type === 'tmp')) {
                        counters_ops[21] += 1;
                        ops.push(21);
                        cont_ops += 1;
                    } else if ((r.src[0].type === 'tmp') && (r.src[1].type === 'cm' && !r.src[1].prime)) {
                        counters_ops[22] += 1;
                        ops.push(22);
                        cont_ops += 1;
                    } else if ((r.src[0].type === 'tmp') && (r.src[1].type === 'cm' && r.src[1].prime)) {
                        counters_ops[23] += 1;
                        ops.push(23);
                        cont_ops += 1;
                    } else if ((r.src[0].type === 'cm' && !r.src[0].prime) && (r.src[1].type === 'tmp')) {
                        counters_ops[24] += 1;
                        ops.push(24);
                        cont_ops += 1;
                    } else if ((r.src[0].type === 'cm' && r.src[0].prime) && (r.src[1].type === 'tmp')) {
                        counters_ops[25] += 1;
                        ops.push(25);
                        cont_ops += 1;
                    } else if ((r.src[0].type === 'tmp') && (r.src[1].type === 'number')) {
                        counters_ops[26] += 1;
                        ops.push(26);
                        cont_ops += 1;
                    } else if ((r.src[0].type === 'number') && (r.src[1].type === 'tmp')) {
                        counters_ops[27] += 1;
                        ops.push(27);
                        cont_ops += 1;
                    } else if ((r.src[0].type === 'cm' && !r.src[0].prime) && (r.src[1].type === 'number')) {
                        counters_ops[28] += 1;
                        ops.push(28);
                        cont_ops += 1;
                    } else if ((r.src[0].type === 'cm' && r.src[0].prime) && (r.src[1].type === 'number')) {
                        counters_ops[29] += 1;
                        ops.push(29);
                        cont_ops += 1;
                    } else if ((r.src[0].type === 'number') && (r.src[1].type === 'cm' && !r.src[1].prime)) {
                        counters_ops[30] += 1;
                        ops.push(30);
                        cont_ops += 1;
                    } else if ((r.src[0].type === 'number') && (r.src[1].type === 'cm' && r.src[1].prime)) {
                        counters_ops[31] += 1;
                        ops.push(31);
                        cont_ops += 1;
                    } else if ((r.src[0].type === 'number') && (r.src[1].type === 'const' && !r.src[1].prime)) {
                        counters_ops[32] += 1;
                        ops.push(32);
                        cont_ops += 1;
                    } else if ((r.src[0].type === 'number') && (r.src[1].type === 'const' && r.src[1].prime)) {
                        counters_ops[33] += 1;
                        ops.push(33);
                        cont_ops += 1;
                    } else if ((r.src[0].type === 'cm') && (r.src[1].type === 'public')) {
                        assert(!r.src[0].prime);
                        counters_ops[34] += 1;
                        ops.push(34);
                        cont_ops += 1;
                    } else if ((r.src[0].type === 'cm' && r.src[0].prime) && (r.src[1].type === 'cm' && !r.src[1].prime)) {
                        counters_ops[35] += 1;
                        ops.push(35);
                        cont_ops += 1;
                    } else if ((r.src[0].type === 'cm' && !r.src[0].prime) && (r.src[1].type === 'cm' && r.src[1].prime)) {
                        counters_ops[36] += 1;
                        ops.push(36);
                        cont_ops += 1;
                    } else if ((r.src[0].type === 'cm' && !r.src[0].prime) && (r.src[1].type === 'cm' && !r.src[1].prime)) {
                        counters_ops[37] += 1;
                        ops.push(37);
                        cont_ops += 1;
                    } else if ((r.src[0].type === 'cm' && r.src[0].prime) && (r.src[1].type === 'cm' && r.src[1].prime)) {
                        counters_ops[38] += 1;
                        ops.push(38);
                        cont_ops += 1;
                    } else if ((r.src[0].type === 'const') && (r.src[1].type === 'cm')) {
                        counters_ops[39] += 1;
                        ops.push(39);
                        cont_ops += 1;
                        assert(!r.src[0].prime);
                        assert(!r.src[1].prime);
                    } else if ((r.src[0].type === 'tmp') && (r.src[1].type === 'const')) {
                        counters_ops[40] += 1;
                        ops.push(40);
                        cont_ops += 1;
                        assert(!r.src[1].prime);
                    } else {
                        console.log(src[0], src[1]);
                        throw new Error("Option not considered!");
                    }

                } else if (r.dest.dim == 3) {

                    if (r.src[0].dim == 1 || r.src[1].dim == 1) {
                        counters_sub[1] += 1;
                        if ((r.src[0].type === 'cm') && (r.src[1].type === 'number')) {
                            assert(!r.src[0].prime);
                            counters_ops[41] += 1;
                            ops.push(41);
                            cont_ops += 1;
                        } else {
                            console.log(src[0], src[1]);
                            throw new Error("Option not considered!");
                        }
                    } else {
                        assert(r.src[0].dim == 3 && r.src[1].dim == 3);
                        counters_sub[2] += 1;
                        if ((r.src[0].type == 'tmp') && (r.src[1].type == 'tmp')) {
                            counters_ops[42] += 1;
                            ops.push(42);
                            cont_ops += 1;
                        } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'challenge')) {
                            counters_ops[43] += 1;
                            ops.push(43);
                            cont_ops += 1;
                        } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'cm')) {
                            assert(!r.src[1].prime);
                            counters_ops[44] += 1;
                            ops.push(44);
                            cont_ops += 1;
                        } else {
                            console.log(src[0], src[1]);
                            throw new Error("Option not considered!");
                        }
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
                    counters_mul[0] += 1;
                    if ((r.src[0].type == 'tmp') && (r.src[1].type == 'tmp')) {
                        counters_ops[45] += 1;
                        ops.push(45);
                        cont_ops += 1;
                        pushSrcArg(r.src[0]);
                        pushSrcArg(r.src[1]);
                        body.push(`     Goldilocks::mul(${lexp}, ${src[0]}, ${src[1]});`)
                    } else if ((r.src[0].type == 'number') && (r.src[1].type == 'tmp')) {
                        counters_ops[46] += 1;
                        ops.push(46);
                        cont_ops += 1;
                        pushSrcArg(r.src[0]);
                        pushSrcArg(r.src[1]);
                        body.push(`     Goldilocks::mul(${lexp}, ${src[0]}, ${src[1]});`)
                    } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'number')) {
                        counters_ops[46] += 1;
                        ops.push(46);
                        cont_ops += 1;
                        pushSrcArg(r.src[1]);
                        pushSrcArg(r.src[0]);
                        body.push(`     Goldilocks::mul(${lexp}, ${src[1]}, ${src[0]});`)
                    } else if ((r.src[0].type == 'cm' && !r.src[0].prime) && (r.src[1].type == 'tmp')) {
                        counters_ops[47] += 1;
                        ops.push(47);
                        cont_ops += 1;
                        pushSrcArg(r.src[0]);
                        pushSrcArg(r.src[1]);
                        body.push(`     Goldilocks::mul(${lexp}, ${src[0]}, ${src[1]});`)
                    } else if ((r.src[0].type == 'cm' && r.src[0].prime) && (r.src[1].type == 'tmp')) {
                        counters_ops[48] += 1;
                        ops.push(48);
                        cont_ops += 1;
                        pushSrcArg(r.src[0]);
                        pushSrcArg(r.src[1]);
                        body.push(`     Goldilocks::mul(${lexp}, ${src[0]}, ${src[1]});`)
                    } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'const')) {
                        counters_ops[49] += 1;
                        ops.push(49);
                        cont_ops += 1;
                        pushSrcArg(r.src[0]);
                        pushSrcArg(r.src[1]);
                        body.push(`     Goldilocks::mul(${lexp}, ${src[0]}, ${src[1]});`)
                        assert(!r.src[1].prime);
                    } else if ((r.src[0].type == 'cm' && !r.src[0].prime) && (r.src[1].type == 'cm' && !r.src[1].prime)) {
                        counters_ops[50] += 1;
                        ops.push(50);
                        cont_ops += 1;
                        pushSrcArg(r.src[0]);
                        pushSrcArg(r.src[1]);
                        body.push(`     Goldilocks::mul(${lexp}, ${src[0]}, ${src[1]});`)
                    } else if ((r.src[0].type == 'cm' && !r.src[0].prime) && (r.src[1].type == 'cm' && r.src[1].prime)) {
                        counters_ops[51] += 1;
                        ops.push(51);
                        cont_ops += 1;
                        pushSrcArg(r.src[0]);
                        pushSrcArg(r.src[1]);
                        body.push(`     Goldilocks::mul(${lexp}, ${src[0]}, ${src[1]});`)
                    } else if ((r.src[1].type == 'cm' && !r.src[1].prime) && (r.src[0].type == 'cm' && r.src[0].prime)) {
                        counters_ops[51] += 1;
                        ops.push(51);
                        cont_ops += 1;
                        pushSrcArg(r.src[1]);
                        pushSrcArg(r.src[0]);
                        body.push(`     Goldilocks::mul(${lexp}, ${src[1]}, ${src[0]});`)
                    } else if ((r.src[0].type == 'cm' && r.src[0].prime) && (r.src[1].type == 'cm' && r.src[1].prime)) {
                        counters_ops[52] += 1;
                        ops.push(52);
                        cont_ops += 1;
                        pushSrcArg(r.src[0]);
                        pushSrcArg(r.src[1]);
                        body.push(`     Goldilocks::mul(${lexp}, ${src[0]}, ${src[1]});`)
                    }
                    else if ((r.src[0].type == 'number') && (r.src[1].type == 'cm')) {
                        assert(!r.src[1].prime);
                        counters_ops[53] += 1;
                        ops.push(53);
                        cont_ops += 1;
                        pushSrcArg(r.src[0]);
                        pushSrcArg(r.src[1]);
                        body.push(`     Goldilocks::mul(${lexp}, ${src[0]}, ${src[1]});`)

                    } else if ((r.src[0].type == 'cm') && (r.src[1].type == 'number')) {
                        assert(!r.src[0].prime);
                        counters_ops[53] += 1;
                        ops.push(53);
                        cont_ops += 1;
                        pushSrcArg(r.src[1]);
                        pushSrcArg(r.src[0]);
                        body.push(`     Goldilocks::mul(${lexp}, ${src[1]}, ${src[0]});`)
                    } else if ((r.src[0].type == 'cm' && !r.src[0].prime) && (r.src[1].type == 'const')) {
                        assert(!r.src[1].prime);
                        counters_ops[54] += 1;
                        ops.push(54);
                        cont_ops += 1;
                        pushSrcArg(r.src[0]);
                        pushSrcArg(r.src[1]);
                        body.push(`     Goldilocks::mul(${lexp}, ${src[0]}, ${src[1]});`)
                    } else if ((r.src[0].type == 'const') && (r.src[1].type == 'cm' && !r.src[1].prime)) {
                        assert(!r.src[0].prime);
                        counters_ops[54] += 1;
                        ops.push(54);
                        cont_ops += 1;
                        pushSrcArg(r.src[1]);
                        pushSrcArg(r.src[0]);
                        body.push(`     Goldilocks::mul(${lexp}, ${src[1]}, ${src[0]});`)

                    } else if ((r.src[0].type == 'cm' && r.src[0].prime) && (r.src[1].type == 'const' && !r.src[1].prime)) {
                        counters_ops[55] += 1;
                        ops.push(55);
                        cont_ops += 1;
                        pushSrcArg(r.src[0]);
                        pushSrcArg(r.src[1]);
                        body.push(`     Goldilocks::mul(${lexp}, ${src[0]}, ${src[1]});`)

                    } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'cm' && !r.src[1].prime)) {
                        counters_ops[56] += 1;
                        ops.push(56);
                        cont_ops += 1;
                        pushSrcArg(r.src[0]);
                        pushSrcArg(r.src[1]);
                        body.push(`     Goldilocks::mul(${lexp}, ${src[0]}, ${src[1]});`)

                    } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'cm' && r.src[1].prime)) {
                        counters_ops[57] += 1;
                        ops.push(57);
                        cont_ops += 1;
                        pushSrcArg(r.src[0]);
                        pushSrcArg(r.src[1]);
                        body.push(`     Goldilocks::mul(${lexp}, ${src[0]}, ${src[1]});`)

                    } else if ((r.src[0].type == 'const') && (r.src[1].type == 'tmp')) {
                        counters_ops[58] += 1;
                        ops.push(58);
                        cont_ops += 1;
                        pushSrcArg(r.src[0]);
                        pushSrcArg(r.src[1]);
                        body.push(`     Goldilocks::mul(${lexp}, ${src[0]}, ${src[1]});`)
                        assert(!r.src[0].prime);
                    } else {
                        console.log(src[0], src[1]);
                        throw new Error("Option not considered!");
                    }
                } else if (r.dest.dim == 3) {
                    if (r.src[0].dim == 1 || r.src[1].dim == 1) {
                        counters_mul[1] += 1;
                        if ((r.src[0].type == 'tmp') && (r.src[1].type == 'challenge')) {
                            assert(r.src[0].dim == 1);
                            counters_ops[59] += 1;
                            ops.push(59);
                            cont_ops += 1;
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[0]}, ${src[1]});`)

                        } else if ((r.src[1].type == 'tmp') && (r.src[0].type == 'challenge')) {
                            assert(r.src[1].dim == 1);
                            counters_ops[59] += 1;
                            ops.push(59);
                            cont_ops += 1;
                            pushSrcArg(r.src[1]);
                            pushSrcArg(r.src[0]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[1]}, ${src[0]});`)

                        } else if ((r.src[0].type == 'const') && (r.src[1].type == 'tmp')) {
                            assert(r.src[0].dim == 1);
                            counters_ops[60] += 1;
                            ops.push(60);
                            cont_ops += 1;
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[0]}, ${src[1]});`)
                            assert(!r.src[0].prime);
                        } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'tmp' && r.src[1].dim == 1)) {
                            counters_ops[61] += 1;
                            ops.push(61);
                            cont_ops += 1;
                            pushSrcArg(r.src[1]);
                            pushSrcArg(r.src[0]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[1]}, ${src[0]});`)

                        } else if ((r.src[0].type == 'cm' && !r.src[0].prime) && (r.src[1].type == 'challenge')) {
                            assert(r.src[0].dim == 1);
                            counters_ops[62] += 1;
                            ops.push(62);
                            cont_ops += 1;
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[0]}, ${src[1]});`)

                        } else if ((r.src[0].type == 'cm' && r.src[0].prime) && (r.src[1].type == 'challenge')) {
                            assert(r.src[0].dim == 1);
                            counters_ops[63] += 1;
                            ops.push(63);
                            cont_ops += 1;
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[0]}, ${src[1]});`)

                        } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'cm' && !r.src[1].prime)) {
                            assert(r.src[1].dim == 1);
                            counters_ops[64] += 1;
                            ops.push(64);
                            cont_ops += 1;
                            pushSrcArg(r.src[1]);
                            pushSrcArg(r.src[0]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[1]}, ${src[0]});`)
                        } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'cm' && r.src[1].prime)) {
                            assert(r.src[1].dim == 1);
                            counters_ops[65] += 1;
                            ops.push(65);
                            cont_ops += 1;
                            pushSrcArg(r.src[1]);
                            pushSrcArg(r.src[0]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[1]}, ${src[0]});`)
                        } else if ((r.src[0].type == 'challenge') && (r.src[1].type == 'number')) {
                            assert(r.src[1].dim == 1);
                            counters_ops[66] += 1;
                            ops.push(66);
                            cont_ops += 1;
                            pushSrcArg(r.src[1]);
                            pushSrcArg(r.src[0]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[1]}, ${src[0]});`)

                        } else if ((r.src[0].type == 'challenge') && (r.src[1].type == 'x')) {
                            assert(r.src[1].dim == 1);
                            counters_ops[67] += 1;
                            ops.push(67);
                            cont_ops += 1;
                            pushSrcArg(r.src[1]);
                            pushSrcArg(r.src[0]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[1]}, ${src[0]});`)

                        } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'x')) {
                            assert(r.src[1].dim == 1);
                            counters_ops[68] += 1;
                            ops.push(68);
                            cont_ops += 1;
                            pushSrcArg(r.src[1]);
                            pushSrcArg(r.src[0]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[1]}, ${src[0]});`)

                        } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'Zi')) {
                            assert(r.src[1].dim == 1);
                            counters_ops[69] += 1;
                            ops.push(69);
                            cont_ops += 1;
                            pushSrcArg(r.src[1]);
                            pushSrcArg(r.src[0]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[1]}, ${src[0]});`)

                        } else {
                            console.log(src[0], src[1]);
                            throw new Error("Option not considered!");
                        }


                    } else {
                        assert(r.src[0].dim == 3 && r.src[1].dim == 3);
                        counters_mul[2] += 1;
                        if ((r.src[0].type == 'challenge') && (r.src[1].type == 'tmp')) {
                            counters_ops[70] += 1;
                            ops.push(70);
                            cont_ops += 1;
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[0]}, ${src[1]});`)

                        } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'challenge')) {
                            counters_ops[70] += 1;
                            ops.push(70);
                            cont_ops += 1;
                            pushSrcArg(r.src[1]);
                            pushSrcArg(r.src[0]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[1]}, ${src[0]});`)

                        } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'tmp')) {
                            counters_ops[71] += 1;
                            ops.push(71);
                            cont_ops += 1;
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[0]}, ${src[1]});`)

                        } else if ((r.src[0].type == 'cm' && !r.src[0].prime) && (r.src[1].type == 'cm' && !r.src[1].prime)) {
                            counters_ops[72] += 1;
                            ops.push(72);
                            cont_ops += 1;
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[0]}, ${src[1]});`)

                        } else if ((r.src[0].type == 'cm' && r.src[0].prime) && (r.src[1].type == 'challenge')) {
                            counters_ops[73] += 1;
                            ops.push(73);
                            cont_ops += 1;
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[0]}, ${src[1]});`)

                        } else if ((r.src[0].type == 'cm' && r.src[0].prime) && (r.src[1].type == 'tmp')) {
                            counters_ops[74] += 1;
                            ops.push(74);
                            cont_ops += 1;
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[0]}, ${src[1]});`)

                        } else if ((r.src[0].type == 'cm' && !r.src[0].prime) && (r.src[1].type == 'tmp')) {
                            counters_ops[75] += 1;
                            ops.push(75);
                            cont_ops += 1;
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[0]}, ${src[1]});`)

                        } else if ((r.src[0].type == 'cm' && !r.src[0].prime) && (r.src[1].type == 'challenge')) {
                            counters_ops[76] += 1;
                            ops.push(76);
                            cont_ops += 1;
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[0]}, ${src[1]});`)

                        } else if ((r.src[0].type == 'cm' && r.src[0].prime) && (r.src[1].type == 'cm' && !r.src[1].prime)) {
                            counters_ops[77] += 1;
                            ops.push(77);
                            cont_ops += 1;
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                            body.push(`     Goldilocks3::mul(${lexp}, ${src[0]}, ${src[1]});`)

                        } else {
                            console.log(src[0], src[1]);
                            throw new Error("Option not considered!");
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
                    pushSrcArg(r.src[0]);
                    assert(r.dest.type == 'tmp')
                    if (r.src[0].type == 'tmp') {
                        counters_ops[78] += 1;
                        ops.push(78);
                        cont_ops += 1;
                    } else if (r.src[0].type == 'cm' && !r.src[0].prime) {
                        counters_ops[79] += 1;
                        ops.push(79);
                        cont_ops += 1;
                    } else if (r.src[0].type == 'cm' && r.src[0].prime) {
                        counters_ops[80] += 1;
                        ops.push(80);
                        cont_ops += 1;
                    } else if (r.src[0].type == 'number') {
                        counters_ops[81] += 1;
                        ops.push(81);
                        cont_ops += 1;
                    } else if (r.src[0].type == 'const' && !r.src[0].prime) {
                        counters_ops[82] += 1;
                        ops.push(82);
                        cont_ops += 1;
                    } else if (r.src[0].type == 'const' && r.src[0].prime) {
                        counters_ops[83] += 1;
                        ops.push(83);
                        cont_ops += 1;
                    } else {
                        console.log(r.src[0].type, r.src[1].type);
                        throw new Error("Option not considered!");
                    }
                } else if (r.dest.dim == 3) {
                    throw new Error("Option not considered!");
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
    //process.stdout.write(JSON.stringify(args));
    console.log("\n\n");
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
            case "public": {
                return `params.publicInputs[${r.id}]`;
            }
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
                args.push(r.dest.id);
                cont_args += 1;
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

    function pushSrcArg(r) {
        switch (r.type) {
            case "tmp": {
                args.push(r.id);
                cont_args += 1;
                break;
            }
            case "const": {
                if (dom == "n") {
                    if (r.prime) {
                        args.push(r.id);
                        args.push(1);
                        args.push(N);
                        cont_args += 3;
                    } else {
                        args.push(r.id);
                        cont_args += 1;
                    }
                } else if (dom == "2ns") {
                    if (r.prime) {
                        args.push(r.id);
                        args.push(next);
                        args.push(N);
                        cont_args += 3;
                    } else {
                        args.push(r.id);
                        cont_args += 1;
                    }
                }
                break;
            }
            case "tmpExp": {
                if (dom == "n") {
                    evalMap_(starkInfo.tmpExp_n[r.id], r.prime)
                } else if (dom == "2ns") {
                    console.log("hola ", r.type);
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
                cont_args += 1;
                break;
            }
            case "public": {
                args.push(r.id);
                cont_args += 1;
                break;
            }
            case "challenge": {
                args.push(r.id);
                cont_args += 1;
                break;
            }
            case "eval": {
                args.push(r.id);
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
                cont_args += 4;

            } else {
                args.push(Number(offset));
                args.push(Number(size));
                cont_args += 2;
            }
        } else if (p.dim == 3) {
            if (prime) {
                args.push(Number(offset));
                args.push(Number(next));
                args.push(Number(N));
                args.push(Number(size));
                cont_args += 4;
            } else {
                args.push(Number(offset));
                args.push(Number(size));
                cont_args += 2;
            }
        } else {
            throw new Error("invalid dim");
        }
    }
}

