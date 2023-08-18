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



module.exports = function compileCode_parser(fflonkInfo, nBits, functionName, code, dom, ret) {

    var ops = [];
    var cont_ops = 0;
    var opsString = "{ "
    var args = [];
    var cont_args = 0;
    var argsString = "{ "

    var counters_ops = new Array(115).fill(0);

    var counters_add = new Array(4).fill(0);
    var counters_sub = new Array(4).fill(0);
    var counters_mul = new Array(4).fill(0);
    var counters_copy = 0;
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

    const extendBits = Math.ceil(Math.log2(fflonkInfo.qDeg + 1));

    const nBitsExt = nBits + extendBits + fflonkInfo.nBitsZK;
    
    const extendBitsTotal = nBitsExt - nBits;

    const next = (dom == "n" ? 1 : (1 << extendBitsTotal)).toString();
    const N = ((dom == "n" ? (1 << nBits) : (1 << nBitsExt))).toString();
    
    let vIndex = 0; 

    count_ops0 = 0;
    count_args0 = 0;
    count_ops1 = 0;

    //Evaluate max and min temporal variable for tmp_ and tmp3_
    let maxid = 100000;
    let ID1D = new Array(maxid).fill(-1);
    let { count1d } = getIdMaps(maxid);

    for (let j = 0; j < code.length; j++) {
        const src = [];
        const r = code[j];
        /*if (!(r.dest.type == 'cm') && !(r.dest.type == 'tmpExp') && !(r.dest.type == 'tmp' && r.dest.dim == 1 && r.op == 'add' && r.src[0].type === "tmp" && r.src[1].type == "cm" && r.src[1].prime)
            && !(r.dest.type == 'tmp' && r.dest.dim == 1 && r.op == 'mul' && (r.src[0].type == 'cm' && r.src[0].prime) && (r.src[1].type == 'number'))) {
            pushResArg(r);
            ++count_args0;
        }*/
        let lexp = getLRef(r);
        for (k = 0; k < r.src.length; k++) {
            src.push(getRef(r.src[k]));
        }
        ++cont_ops;
        if (r.dest.type == 'tmp') {
            ++count_ops0;
            switch (r.op) {

                case 'add': {

                    if (r.dest.dim == 1) {
                        if (((r.src[0].dim != 1) || r.src[1].dim != 1)) {
                            throw new Error("Invalid dimension")
                        }
                        counters_add[0] += 1;
                        if (r.src[0].type === "tmp") {

                            switch (r.src[1].type) {
                                case "tmp": {
                                    pushResArg(r);
                                    pushSrcArg(r.src[0]);
                                    pushSrcArg(r.src[1]);
                                    counters_ops[0] += 1;
                                    ops.push(0);
                                    opsString += "0, ";
                                    break;
                                }
                                case "cm": {
                                    if (!r.src[1].prime) {
                                        pushResArg(r);
                                        pushSrcArg(r.src[0]);
                                        pushSrcArg(r.src[1]);
                                        counters_ops[1] += 1;
                                        ops.push(1);
                                        opsString += "1, ";
                                    } else {
                                        ++count_ops1;
                                        pushResArg(r);
                                        pushSrcArg(r.src[0]);
                                        pushSrcArg(r.src[1]);
                                        counters_ops[84] += 1;
                                        ops.push(84);
                                        opsString += "84, ";
                                    }
                                    break;
                                }
                                case "number": {
                                    pushResArg(r);
                                    pushSrcArg(r.src[0]);
                                    pushSrcArg(r.src[1]);
                                    counters_ops[2] += 1;
                                    ops.push(2);
                                    opsString += "2, ";
                                    break;
                                }
                                case "const": {
                                    pushResArg(r);
                                    pushSrcArg(r.src[0]);
                                    pushSrcArg(r.src[1]);
                                    assert(!r.src[1].prime);
                                    counters_ops[3] += 1;
                                    ops.push(3);
                                    opsString += "3, ";
                                    break;
                                }
                                case "tmpExp": {
                                    pushResArg(r);
                                    pushSrcArg(r.src[0]);
                                    pushSrcArg(r.src[1]);
                                    assert(!r.src[1].prime);
                                    counters_ops[1] += 1;
                                    ops.push(1);
                                    opsString += "1, ";
                                    break;
                                }
                                default: {
                                    console.log(src[0], src[1]);
                                    console.log(r.src[0].type, r.src[1].type);
                                    throw new Error("Option not considered!");
                                    break;
                                }
                            }
                        } else if (r.src[1].type === "tmp") {

                            switch (r.src[0].type) {
                                case "tmp": {
                                    pushResArg(r);
                                    pushSrcArg(r.src[1]);
                                    pushSrcArg(r.src[0]);
                                    counters_ops[0] += 1;
                                    ops.push(0);
                                    opsString += "0, ";
                                    break;
                                }
                                case "cm": {
                                    if (!r.src[0].prime) {
                                        pushResArg(r);
                                        pushSrcArg(r.src[1]);
                                        pushSrcArg(r.src[0]);
                                        counters_ops[1] += 1;
                                        ops.push(1);
                                        opsString += "1, ";
                                    } else {
                                        pushResArg(r);
                                        pushSrcArg(r.src[1]);
                                        pushSrcArg(r.src[0]);
                                        ++count_ops1;
                                        counters_ops[84] += 1;
                                        ops.push(84);
                                        opsString += "84, ";
                                    }
                                    break;
                                }
                                case "number": {
                                    pushResArg(r);
                                    pushSrcArg(r.src[1]);
                                    pushSrcArg(r.src[0]);
                                    counters_ops[2] += 1;
                                    ops.push(2);
                                    opsString += "2, ";
                                    break;
                                }
                                case "const": {
                                    pushResArg(r);
                                    pushSrcArg(r.src[1]);
                                    pushSrcArg(r.src[0]);
                                    assert(!r.src[0].prime);
                                    counters_ops[3] += 1;
                                    ops.push(3);
                                    opsString += "3, ";
                                    break;
                                } case "tmpExp": {
                                    pushResArg(r);
                                    pushSrcArg(r.src[1]);
                                    pushSrcArg(r.src[0]);
                                    assert(!r.src[1].prime);
                                    counters_ops[1] += 1;
                                    ops.push(1);
                                    opsString += "1, ";
                                    break;
                                }
                                default: {
                                    console.log(src[0], src[1]);
                                    console.log(r.src[0].type, r.src[1].type);
                                    throw new Error("Option not considered!");
                                    break;
                                }
                            }
                        } else {
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);

                            if (r.src[0].type == "cm" && r.src[1].type == "cm") {
                                if (r.src[0].prime && r.src[1].prime) {
                                    counters_ops[5] += 1;
                                    ops.push(5);
                                    opsString += "5, ";
                                } else {
                                    assert(!r.src[1].prime);
                                    assert(!r.src[0].prime);
                                    counters_ops[4] += 1;
                                    ops.push(4);
                                    opsString += "4, ";
                                }
                            } else if (r.src[0].type == "cm" && r.src[1].type == "const") {
                                counters_ops[6] += 1;
                                ops.push(6);
                                opsString += "6, ";
                                assert(!r.src[1].prime);
                                assert(!r.src[0].prime);
                            } else if (r.src[0].type == "cm" && r.src[1].type == "number") {
                                counters_ops[7] += 1;
                                ops.push(7);
                                opsString += "7, ";
                                assert(!r.src[0].prime);
                            } else if (r.src[0].type == "const" && r.src[1].type == "const") {
                                if (r.src[0].prime && r.src[1].prime) {
                                    counters_ops[9] += 1;
                                    ops.push(9);
                                    opsString += "9, ";
                                } else {
                                    counters_ops[8] += 1;
                                    assert(!r.src[1].prime);
                                    assert(!r.src[0].prime);
                                    ops.push(8);
                                    opsString += "8, ";
                                }
                            } else if (r.src[0].type == "const" && r.src[1].type == "number") {
                                if (r.src[0].prime) {
                                    counters_ops[11] += 1;
                                    ops.push(11);
                                    opsString += "11, ";
                                } else {
                                    assert(!r.src[0].prime);
                                    counters_ops[10] += 1;
                                    ops.push(10);
                                    opsString += "10, ";
                                }
                            } else {
                                throw new Error("Option not considered!");
                            }

                        }
                    } else {
                        throw new Error("Invalid dim");
                    }
                    break;
                }
                case 'sub': {
                    pushResArg(r);
                    pushSrcArg(r.src[0]);
                    pushSrcArg(r.src[1]);
                    if (r.dest.dim == 1) {
                        if (((r.src[0].dim != 1) || r.src[1].dim != 1)) {
                            throw new Error("Invalid dimension")
                        }
                        counters_sub[0] += 1;
                        if ((r.src[0].type === 'tmp') && (r.src[1].type === 'tmp')) {
                            counters_ops[21] += 1;
                            ops.push(21);
                            opsString += "21, ";
                        } else if ((r.src[0].type === 'tmp') && (r.src[1].type === 'cm' && !r.src[1].prime)) {
                            counters_ops[22] += 1;
                            ops.push(22);
                            opsString += "22, ";
                        } else if ((r.src[0].type === 'tmp') && (r.src[1].type === 'cm' && r.src[1].prime)) {
                            counters_ops[23] += 1;
                            ops.push(23);
                            opsString += "23, ";
                        } else if ((r.src[0].type === 'cm' && !r.src[0].prime) && (r.src[1].type === 'tmp')) {
                            counters_ops[24] += 1;
                            ops.push(24);
                            opsString += "24, ";
                        } else if ((r.src[0].type === 'cm' && r.src[0].prime) && (r.src[1].type === 'tmp')) {
                            counters_ops[25] += 1;
                            ops.push(25);
                            opsString += "25, ";
                        } else if ((r.src[0].type === 'tmp') && (r.src[1].type === 'number')) {
                            counters_ops[26] += 1;
                            ops.push(26);
                            opsString += "26, ";
                        } else if ((r.src[0].type === 'number') && (r.src[1].type === 'tmp')) {
                            counters_ops[27] += 1;
                            ops.push(27);
                            opsString += "27, ";
                        } else if ((r.src[0].type === 'cm' && !r.src[0].prime) && (r.src[1].type === 'number')) {
                            counters_ops[28] += 1;
                            ops.push(28);
                            opsString += "28, ";
                        } else if ((r.src[0].type === 'cm' && r.src[0].prime) && (r.src[1].type === 'number')) {
                            counters_ops[29] += 1;
                            ops.push(29);
                            opsString += "29, ";
                        } else if ((r.src[0].type === 'number') && (r.src[1].type === 'cm' && !r.src[1].prime)) {
                            counters_ops[30] += 1;
                            ops.push(30);
                            opsString += "30, ";
                        } else if ((r.src[0].type === 'number') && (r.src[1].type === 'cm' && r.src[1].prime)) {
                            counters_ops[31] += 1;
                            ops.push(31);
                            opsString += "31, ";
                        } else if ((r.src[0].type === 'number') && (r.src[1].type === 'const' && !r.src[1].prime)) {
                            counters_ops[32] += 1;
                            ops.push(32);
                            opsString += "32, ";
                        } else if ((r.src[0].type === 'number') && (r.src[1].type === 'const' && r.src[1].prime)) {
                            counters_ops[33] += 1;
                            ops.push(33);
                            opsString += "33, ";
                        } else if ((r.src[0].type === 'cm') && (r.src[1].type === 'public')) {
                            assert(!r.src[0].prime);
                            counters_ops[34] += 1;
                            ops.push(34);
                            opsString += "34, ";
                        } else if ((r.src[0].type === 'cm' && r.src[0].prime) && (r.src[1].type === 'cm' && !r.src[1].prime)) {
                            counters_ops[35] += 1;
                            ops.push(35);
                            opsString += "35, ";
                        } else if ((r.src[0].type === 'cm' && !r.src[0].prime) && (r.src[1].type === 'cm' && r.src[1].prime)) {
                            counters_ops[36] += 1;
                            ops.push(36);
                            opsString += "36, ";
                        } else if ((r.src[0].type === 'cm' && !r.src[0].prime) && (r.src[1].type === 'cm' && !r.src[1].prime)) {
                            counters_ops[37] += 1;
                            ops.push(37);
                            opsString += "37, ";
                        } else if ((r.src[0].type === 'cm' && r.src[0].prime) && (r.src[1].type === 'cm' && r.src[1].prime)) {
                            counters_ops[38] += 1;
                            ops.push(38);
                            opsString += "38, ";
                        } else if ((r.src[0].type === 'const') && (r.src[1].type === 'cm')) {
                            counters_ops[39] += 1;
                            ops.push(39);
                            opsString += "39, ";
                            assert(!r.src[0].prime);
                            assert(!r.src[1].prime);
                        } else if ((r.src[0].type === 'tmp') && (r.src[1].type === 'const')) {
                            counters_ops[40] += 1;
                            ops.push(40);
                            opsString += "40, ";
                            assert(!r.src[1].prime);
                        } else if ((r.src[0].type === 'tmp') && (r.src[1].type === 'tmpExp')) {
                            assert(!r.src[1].prime);
                            counters_ops[22] += 1;
                            ops.push(22);
                            opsString += "22, ";
                        } else {
                            console.log(src[0], src[1]);
                            console.log(r.src[0].type, r.src[1].type);
                            throw new Error("Option not considered!");
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
                            opsString += "45, ";
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);

                        } else if ((r.src[0].type == 'number') && (r.src[1].type == 'tmp')) {
                            counters_ops[46] += 1;
                            ops.push(46);
                            opsString += "46, ";
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);

                        } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'number')) {
                            counters_ops[46] += 1;
                            ops.push(46);
                            opsString += "46, ";
                            pushResArg(r);
                            pushSrcArg(r.src[1]);
                            pushSrcArg(r.src[0]);

                        } else if ((r.src[0].type == 'cm' && !r.src[0].prime) && (r.src[1].type == 'tmp')) {
                            counters_ops[47] += 1;
                            ops.push(47);
                            opsString += "47, ";
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                        } else if ((r.src[0].type == 'cm' && r.src[0].prime) && (r.src[1].type == 'tmp')) {
                            counters_ops[48] += 1;
                            ops.push(48);
                            opsString += "48, ";
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);

                        } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'const' && !r.src[1].prime)) {
                            counters_ops[49] += 1;
                            ops.push(49);
                            opsString += "49, ";
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                        } else if ((r.src[0].type == 'cm' && !r.src[0].prime) && (r.src[1].type == 'cm' && !r.src[1].prime)) {
                            counters_ops[50] += 1;
                            ops.push(50);
                            opsString += "50, "
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                        } else if ((r.src[0].type == 'cm' && !r.src[0].prime) && (r.src[1].type == 'cm' && r.src[1].prime)) {
                            counters_ops[51] += 1;
                            ops.push(51);
                            opsString += "51, ";
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                        } else if ((r.src[1].type == 'cm' && !r.src[1].prime) && (r.src[0].type == 'cm' && r.src[0].prime)) {
                            counters_ops[51] += 1;
                            ops.push(51);
                            opsString += "51, ";
                            pushResArg(r);
                            pushSrcArg(r.src[1]);
                            pushSrcArg(r.src[0]);
                        } else if ((r.src[0].type == 'cm' && r.src[0].prime) && (r.src[1].type == 'cm' && r.src[1].prime)) {
                            counters_ops[52] += 1;
                            ops.push(52);
                            opsString += "52, ";
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                        }
                        else if ((r.src[0].type == 'number') && (r.src[1].type == 'cm')) {
                            assert(!r.src[1].prime);
                            counters_ops[53] += 1;
                            ops.push(53);
                            opsString += "53, ";
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                        } else if ((r.src[0].type == 'cm' && !r.src[0].prime) && (r.src[1].type == 'number')) {
                            counters_ops[53] += 1;
                            opsString += "53, ";
                            ops.push(53);
                            pushResArg(r);
                            pushSrcArg(r.src[1]);
                            pushSrcArg(r.src[0]);

                        } else if ((r.src[0].type == 'cm' && r.src[0].prime) && (r.src[1].type == 'number')) {
                            counters_ops[85] += 1;
                            opsString += "85, ";
                            ops.push(85);
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                        } else if ((r.src[0].type == 'cm' && !r.src[0].prime) && (r.src[1].type == 'const')) {
                            assert(!r.src[1].prime);
                            counters_ops[54] += 1;
                            ops.push(54);
                            opsString += "54, ";
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);

                        } else if ((r.src[0].type == 'const') && (r.src[1].type == 'cm' && !r.src[1].prime)) {
                            assert(!r.src[0].prime);
                            counters_ops[54] += 1;
                            ops.push(54);
                            opsString += "54, ";
                            pushResArg(r);
                            pushSrcArg(r.src[1]);
                            pushSrcArg(r.src[0]);
                        } else if ((r.src[0].type == 'cm' && r.src[0].prime) && (r.src[1].type == 'const' && !r.src[1].prime)) {
                            counters_ops[55] += 1;
                            ops.push(55);
                            opsString += "55, ";
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                        } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'cm' && !r.src[1].prime)) {
                            counters_ops[56] += 1;
                            ops.push(56);
                            opsString += "56, ";
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                        } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'cm' && r.src[1].prime)) {
                            counters_ops[57] += 1;
                            ops.push(57);
                            opsString += "57, ";
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                        } else if ((r.src[0].type == 'const' && !r.src[0].prime) && (r.src[1].type == 'tmp')) {
                            counters_ops[58] += 1;
                            ops.push(58);
                            opsString += "58, ";
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);
                        } else {
                            console.log(src[0], src[1]);
                            console.log(r.src[0].type, r.src[1].type);
                            throw new Error("Option not considered!");
                        }
                    } else {
                        throw new Error("Invalid dim");
                    }
                    break;
                }
                case 'copy': {
                    ++counters_copy;
                    if (r.dest.dim == 1) {
                        if (r.src[0].dim != 1) {
                            throw new Error("Invalid dimension")
                        }
                        pushResArg(r);
                        pushSrcArg(r.src[0]);
                        if (r.dest.type == 'tmp') {
                            if (r.src[0].type == 'tmp') {
                                counters_ops[78] += 1;
                                ops.push(78);
                                opsString += "78, ";
                            } else if (r.src[0].type == 'cm' && !r.src[0].prime) {
                                counters_ops[79] += 1;
                                ops.push(79);
                                opsString += "79, ";
                            } else if (r.src[0].type == 'cm' && r.src[0].prime) {
                                counters_ops[80] += 1;
                                ops.push(80);
                                opsString += "80, ";
                            } else if (r.src[0].type == 'number') {
                                counters_ops[81] += 1;
                                ops.push(81);
                                opsString += "81, ";
                            } else if (r.src[0].type == 'const' && !r.src[0].prime) {
                                counters_ops[82] += 1;
                                ops.push(82);
                                opsString += "82, ";
                            } else if (r.src[0].type == 'const' && r.src[0].prime) {
                                counters_ops[83] += 1;
                                ops.push(83);
                                opsString += "83, ";
                            } else {
                                console.log(r.src[0].type);
                                console.log(r.src[0].type);
                                throw new Error("Option not considered!");
                            }
                        } else {
                            console.log(r.dest.type, r.src[0].type);
                            throw new Error("Option not considered!");
                        }
                    } else {
                        throw new Error("Invalid dim");
                    }
                    break;
                }
                default: throw new Error("Invalid op:" + c[j].op);
            }
        } else if ((r.dest.type == 'cm' || r.dest.type == 'tmpExp') && !r.dest.prime) {
            /**
             * 
             * 
             *  Dest /= cm
             * 
             */
            switch (r.op) {
                case 'add': {

                    if (r.dest.dim == 1) {
                        if (((r.src[0].dim != 1) || r.src[1].dim != 1)) {
                            throw new Error("Invalid dimension")
                        }
                        counters_add[0] += 1;
                        if (r.src[0].type === "tmp") {

                            switch (r.src[1].type) {
                                case "tmp": {
                                    pushResArg(r);
                                    pushSrcArg(r.src[0]);
                                    pushSrcArg(r.src[1]);
                                    counters_ops[86] += 1;
                                    ops.push(86);
                                    opsString += "86, ";
                                    break;
                                }
                                case "cm": {
                                    if (!r.src[1].prime) {
                                        pushResArg(r);
                                        pushSrcArg(r.src[0]);
                                        pushSrcArg(r.src[1]);
                                        counters_ops[87] += 1;
                                        ops.push(87);
                                        opsString += "87, ";
                                    } else {
                                        assert(0);
                                    }
                                    break;
                                }
                                case "tmpExp": {
                                    assert(!r.src[1].prime);
                                    pushResArg(r);
                                    pushSrcArg(r.src[0]);
                                    pushSrcArg(r.src[1]);
                                    counters_ops[87] += 1;
                                    ops.push(87);
                                    opsString += "87, ";
                                    break;
                                }
                                default: {
                                    console.log(src[0], src[1]);
                                    console.log(r.src[0].type, r.src[1].type);
                                    throw new Error("Option not considered!");
                                    break;
                                }
                            }
                        } else if (r.src[1].type === "tmp") {
                            switch (r.src[0].type) {
                                case "cm": {
                                    if (!r.src[0].prime) {
                                        pushResArg(r);
                                        pushSrcArg(r.src[1]);
                                        pushSrcArg(r.src[0]);
                                        counters_ops[87] += 1;
                                        ops.push(87);
                                        opsString += "87, ";
                                    } else {
                                        assert(0);
                                    }
                                    break;
                                } case "tmpExp": {
                                    assert(!r.src[0].prime);
                                    pushResArg(r);
                                    pushSrcArg(r.src[1]);
                                    pushSrcArg(r.src[0]);
                                    counters_ops[87] += 1;
                                    ops.push(87);
                                    opsString += "87, ";
                                    break;
                                }
                                default: {
                                    console.log(src[0], src[1]);
                                    console.log(r.src[0].type, r.src[1].type);
                                    throw new Error("Option not considered!");
                                    break;
                                }
                            }
                        } else {
                            throw new Error("Option not considered!");
                        }
                    } else {
                        throw new Error("Invalid dim");
                    }
                    break;
                }
                case 'sub': {
                    pushResArg(r);
                    pushSrcArg(r.src[0]);
                    pushSrcArg(r.src[1]);
                    if (r.dest.dim == 1) {
                        if (((r.src[0].dim != 1) || r.src[1].dim != 1)) {
                            throw new Error("Invalid dimension")
                        }
                        counters_sub[0] += 1;
                        if ((r.src[0].type === 'tmp') && (r.src[1].type === 'tmp')) {
                            counters_ops[92] += 1;
                            ops.push(92);
                            opsString += "92, ";
                        } else if ((r.src[0].type === 'number') && (r.src[1].type === 'tmp')) {
                            counters_ops[93] += 1;
                            ops.push(93);
                            opsString += "93, ";
                        } else {
                            console.log(src[0], src[1]);
                            console.log(r.src[0].type, r.src[1].type);
                            throw new Error("Option not considered!");
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
                            counters_ops[94] += 1;
                            ops.push(94);
                            opsString += "94, ";
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);

                        } else if ((r.src[0].type == 'cm' && !r.src[0].prime) && (r.src[1].type == 'tmp')) {
                            counters_ops[95] += 1;
                            ops.push(95);
                            opsString += "95, ";
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);

                        } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'cm' && !r.src[1].prime)) {
                            counters_ops[95] += 1;
                            ops.push(95);
                            opsString += "95, ";
                            pushResArg(r);
                            pushSrcArg(r.src[1]);
                            pushSrcArg(r.src[0]);

                        } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'const' && !r.src[1].prime)) {
                            counters_ops[96] += 1;
                            ops.push(96);
                            opsString += "96, ";
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);

                        } else if ((r.src[0].type == 'const' && !r.src[0].prime) && (r.src[1].type == 'tmp')) {
                            counters_ops[96] += 1;
                            ops.push(96);
                            opsString += "96, ";
                            pushResArg(r);
                            pushSrcArg(r.src[1]);
                            pushSrcArg(r.src[0]);

                        } else {
                            console.log(src[0], src[1]);
                            console.log(r.src[0].type, r.src[1].type);
                            throw new Error("Option not considered!");
                        }
                    } else {
                        throw new Error("Invalid dim");
                    }
                    break;
                }
                case 'copy': {
                    ++counters_copy;
                    if (r.dest.dim == 1) {
                        if (r.src[0].dim != 1) {
                            throw new Error("Invalid dimension")
                        }
                        pushResArg(r);
                        pushSrcArg(r.src[0]);
                        if (r.dest.type == 'cm' && !r.dest.prime && r.src[0].type == 'tmp') {
                            counters_ops[100] += 1;
                            ops.push(100);
                            opsString += "100, ";
                        } else if (r.dest.type == 'tmpExp' && !r.dest.prime && r.src[0].type == 'tmp') {
                            counters_ops[100] += 1;
                            ops.push(100);
                            opsString += "100, ";
                        } else {
                            console.log(r.dest.type, r.src[0].type);
                            throw new Error("Option not considered!");
                        }
                    } else {
                        throw new Error("Invalid dim");
                    }
                    break;
                }
                default: throw new Error("Invalid op:" + c[j].op);
            }
        } else if ((r.dest.type == 'cm' || r.dest.type == 'tmpExp') && r.dest.prime) {
            /**
            * 
            * 
            *  Dest /= cm
            * 
            */
            switch (r.op) {
                case 'add': {

                    if (r.dest.dim == 1) {
                        if (((r.src[0].dim != 1) || r.src[1].dim != 1)) {
                            throw new Error("Invalid dimension")
                        }
                        counters_add[0] += 1;
                        if (r.src[0].type === "tmp") {

                            switch (r.src[1].type) {
                                case "tmp": {
                                    pushResArg(r);
                                    pushSrcArg(r.src[0]);
                                    pushSrcArg(r.src[1]);
                                    counters_ops[101] += 1;
                                    ops.push(101);
                                    opsString += "101, ";
                                    break;
                                }
                                case "cm": {
                                    if (!r.src[1].prime) {
                                        pushResArg(r);
                                        pushSrcArg(r.src[0]);
                                        pushSrcArg(r.src[1]);
                                        counters_ops[102] += 1;
                                        ops.push(102);
                                        opsString += "102, ";
                                    } else {
                                        pushResArg(r);
                                        pushSrcArg(r.src[0]);
                                        pushSrcArg(r.src[1]);
                                        counters_ops[114] += 1;
                                        ops.push(114);
                                        opsString += "114, ";
                                    }
                                    break;
                                }
                                case "tmpExp": {
                                    assert(!r.src[1].prime);
                                    pushResArg(r);
                                    pushSrcArg(r.src[0]);
                                    pushSrcArg(r.src[1]);
                                    counters_ops[102] += 1;
                                    ops.push(102);
                                    opsString += "102, ";
                                    break;
                                }
                                default: {
                                    console.log(src[0], src[1]);
                                    console.log(r.src[0].type, r.src[1].type);
                                    throw new Error("Option not considered!");
                                    break;
                                }
                            }
                        } else if (r.src[1].type === "tmp") {
                            switch (r.src[0].type) {
                                case "cm": {
                                    if (!r.src[0].prime) {
                                        pushResArg(r);
                                        pushSrcArg(r.src[1]);
                                        pushSrcArg(r.src[0]);
                                        counters_ops[102] += 1;
                                        ops.push(102);
                                        opsString += "102, ";
                                    } else {
                                        pushResArg(r);
                                        pushSrcArg(r.src[1]);
                                        pushSrcArg(r.src[0]);
                                        counters_ops[114] += 1;
                                        ops.push(114);
                                        opsString += "114, ";
                                    }
                                    break;
                                } case "tmpExp": {
                                    assert(!r.src[0].prime);
                                    pushResArg(r);
                                    pushSrcArg(r.src[1]);
                                    pushSrcArg(r.src[0]);
                                    counters_ops[102] += 1;
                                    ops.push(102);
                                    opsString += "102, ";
                                    break;
                                }
                                default: {
                                    console.log(src[0], src[1]);
                                    console.log(r.src[0].type, r.src[1].type);
                                    throw new Error("Option not considered!");
                                    break;
                                }
                            }
                        } else {
                            throw new Error("Option not considered!");
                        }
                    } else {
                        throw new Error("Invalid dim");
                    }
                    break;
                }
                case 'sub': {
                    pushResArg(r);
                    pushSrcArg(r.src[0]);
                    pushSrcArg(r.src[1]);
                    if (r.dest.dim == 1) {
                        if (((r.src[0].dim != 1) || r.src[1].dim != 1)) {
                            throw new Error("Invalid dimension")
                        }
                        counters_sub[0] += 1;
                        if ((r.src[0].type === 'tmp') && (r.src[1].type === 'tmp')) {
                            counters_ops[106] += 1;
                            ops.push(106);
                            opsString += "106, ";
                        } else if ((r.src[0].type === 'number') && (r.src[1].type === 'tmp')) {
                            counters_ops[107] += 1;
                            ops.push(107);
                            opsString += "107, ";
                        } else {
                            console.log(src[0], src[1]);
                            console.log(r.src[0].type, r.src[1].type);
                            throw new Error("Option not considered!");
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
                            counters_ops[108] += 1;
                            ops.push(108);
                            opsString += "108, ";
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);

                        } else if ((r.src[0].type == 'cm' && !r.src[0].prime) && (r.src[1].type == 'tmp')) {
                            counters_ops[109] += 1;
                            ops.push(109);
                            opsString += "109, ";
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);

                        } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'cm' && !r.src[1].prime)) {
                            counters_ops[109] += 1;
                            ops.push(109);
                            opsString += "109, ";
                            pushResArg(r);
                            pushSrcArg(r.src[1]);
                            pushSrcArg(r.src[0]);

                        } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'const' && !r.src[1].prime)) {
                            counters_ops[110] += 1;
                            ops.push(110);
                            opsString += "110, ";
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);

                        } else if ((r.src[0].type == 'const' && !r.src[0].prime) && (r.src[1].type == 'tmp')) {
                            counters_ops[110] += 1;
                            ops.push(110);
                            opsString += "110, ";
                            pushResArg(r);
                            pushSrcArg(r.src[1]);
                            pushSrcArg(r.src[0]);

                        } else if ((r.src[0].type == 'const' && r.src[0].prime) && (r.src[1].type == 'tmp')) {
                            counters_ops[111] += 1;
                            ops.push(111);
                            opsString += "111, ";
                            pushResArg(r);
                            pushSrcArg(r.src[0]);
                            pushSrcArg(r.src[1]);

                        } else if ((r.src[0].type == 'tmp') && (r.src[1].type == 'const' && r.src[1].prime)) {
                            counters_ops[111] += 1;
                            ops.push(111);
                            opsString += "111, ";
                            pushResArg(r);
                            pushSrcArg(r.src[1]);
                            pushSrcArg(r.src[0]);
                        } else {
                            console.log(src[0], src[1]);
                            console.log(r.src[0].type, r.src[1].type);
                            throw new Error("Option not considered!");
                        }
                    } else {
                        throw new Error("Invalid dim");
                    }
                    break;
                }
                case 'copy': {
                    ++counters_copy;
                    if (r.dest.dim == 1) {
                        if (r.src[0].dim != 1) {
                            throw new Error("Invalid dimension")
                        }
                        pushResArg(r);
                        pushSrcArg(r.src[0]);
                        if (r.dest.type == 'cm' && r.src[0].type == 'tmp') {
                            counters_ops[113] += 1;
                            ops.push(113);
                            opsString += "113, ";
                        } else if (r.dest.type == 'tmpExp' && r.src[0].type == 'tmp') {
                            counters_ops[113] += 1;
                            ops.push(113);
                            opsString += "113, ";
                        } else {
                            console.log(r.dest.type, r.src[0].type);
                            throw new Error("Option not considered!");
                        }
                    } else {
                        throw new Error("Invalid dim");
                    }
                    break;
                }
                default: throw new Error("Invalid op:" + c[j].op);
            }
        } else {
            assert(r.dest.type == 'q');
            if (r.op == 'mul' && (r.src[0].type == 'tmp') && (r.src[1].type == 'Zi')) {
                counters_mul[1] += 1;
                assert(r.src[1].dim == 1);
                counters_ops[69] += 1;
                ops.push(69);
                opsString += "69, ";
                pushResArg(r);
                pushSrcArg(r.src[1]);
                pushSrcArg(r.src[0]);

            } else {
                console.log(src[0], src[1]);
                console.log(r.src[0].type, r.src[1].type);
                throw new Error("Option not considered!");
            }
        }
    }
    assert(cont_ops == ops.length);

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
        console.log(counters_ops)
        console.log("NOPS: ", cont_ops, ops.length);
        console.log("NARGS: ", cont_args, args.length);
        //process.stdout.write(JSON.stringify(ops));
        //process.stdout.write(JSON.stringify(args));

    }
    sumadd = counters_add[0] + counters_add[1] + counters_add[2] + counters_add[3];
    sumsub = counters_sub[0] + counters_sub[1] + counters_sub[2] + counters_sub[3];
    summul = counters_mul[0] + counters_mul[1] + counters_mul[2] + counters_mul[3];
    assert(cont_ops == sumadd + sumsub + summul + counters_copy)

    console.log("\n", functionName);
    console.log("NOPS: ", cont_ops, ops.length);
    console.log("NARGS: ", cont_args, args.length);
    process.stdout.write(JSON.stringify(counters_ops));

    let count_zeros = 0;
    for (let i = 0; i < counters_ops.length; i++) {
        if (counters_ops[i] === 0) {
            count_zeros++;
        }
    }
    console.log("\nNon used code:", count_zeros, "\n")

    let res;
    opsString = opsString.slice(0, -2);
    opsString += "};"
    argsString = argsString.slice(0, -2);
    argsString += "};"

    // join operations
    if (functionName == "stepQext_first") {
        assert(0);
        //Not suported at this moment due to ext
    } else if (functionName == "step3_first") {

        groupOps = " 0, 50,";
        let countGroup = opsString.split(groupOps).length - 1;
        cont_ops -= countGroup;
        opsString = opsString.replace(new RegExp(groupOps, "g"), " 115,");

        res = [
            `#define NOPS_ ${cont_ops}`,
            `#define NARGS_ ${cont_args}`,
            `#define NTEMP1_ ${count1d}`,
            "\n",
            `uint64_t op3[NOPS_] = ${opsString}`,
            "\n",
            `uint64_t args3[NARGS_] = ${argsString}`
        ].join("\n");
    } else if (functionName == "step3prev_first") {
        res = [
            `#define NOPS_ ${cont_ops}`,
            `#define NARGS_ ${cont_args}`,
            `#define NTEMP1_ ${count1d}`,
            "\n",
            `uint64_t op3prev[NOPS_] = ${opsString}`,
            "\n",
            `uint64_t args3prev[NARGS_] = ${argsString}`
        ].join("\n");
    } else if (functionName == "step2prev_first") {
        res = [
            `#define NOPS_ ${cont_ops}`,
            `#define NARGS_ ${cont_args}`,
            `#define NTEMP1_ ${count1d}`,
            "\n",
            `uint64_t op2prev[NOPS_] = ${opsString}`,
            "\n",
            `uint64_t args2prev[NARGS_] = ${argsString}`
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
                        return ` params.const_n[${r.id} + ((i+1)%${N}) * ${fflonkInfo.nConstants}]`;
                    } else {
                        if (r.id < range_const[2] || range_const[2] === -1) range_const[2] = r.id;
                        if (r.id > range_const[3] || range_const[3] === -1) range_const[3] = r.id;
                        return ` params.const_n[${r.id} + i * ${fflonkInfo.nConstants}]`;
                    }
                } else if (dom == "ext") {
                    if (r.prime) {
                        if (r.id < range_const[4] || range_const[4] === -1) range_const[4] = r.id;
                        if (r.id > range_const[5] || range_const[5] === -1) range_const[5] = r.id;
                        return ` params.const_ext[${r.id} + ((i+${next})%${N}) * ${fflonkInfo.nConstants}]`;

                    } else {
                        if (r.id < range_const[6] || range_const[6] === -1) range_const[6] = r.id;
                        if (r.id > range_const[7] || range_const[7] === -1) range_const[7] = r.id;
                        return ` params.const_ext[${r.id} + i * ${fflonkInfo.nConstants}]`;
                    }
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "tmpExp": {
                if (dom == "n") {
                    return evalMap(fflonkInfo.tmpExp_n[r.id], r.prime)
                } else if (dom == "ext") {
                    throw new Error("Invalid dom");
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "cm": {
                if (dom == "n") {
                    return evalMap(fflonkInfo.cm_n[r.id], r.prime)
                } else if (dom == "ext") {
                    return evalMap(fflonkInfo.cm_ext[r.id], r.prime)
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "q": {
                if (dom == "n") {
                    throw new Error("Accessing q in domain n");
                } else if (dom == "ext") {
                    return evalMap(fflonkInfo.qs[r.id], r.prime)
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "number": {
                ++refnum;
                body.push(`     AltBn128::FrElement v${vIndex};`);
                body.push(`     E.fr.fromString(v${vIndex}, "${BigInt(r.value).toString()}");`);
                return `v${vIndex++}`;
            }
            case "public": {
                return `params.publicInputs[${r.id}]`;
            }
            case "challenge": {
                ++refchall;
                if (r.id < range_chall[0] || range_chall[0] === -1) range_chall[0] = r.id;
                if (r.id > range_chall[1] || range_chall[1] === -1) range_chall[1] = r.id;
                return `params.challenges[${r.id}]`;
            }
            case "x": {
                if (dom == "n") {
                    return `params.x_n[i]`;
                } else if (dom == "ext") {
                    return `params.x_ext[i]`;
                } else {
                    throw new Error("Invalid dom");
                }
            }
            default: throw new Error("Invalid reference type get: " + r.type);
        }
    }

    function getLRef(r) {
        let eDst;
        switch (r.dest.type) {
            case "tmp": {

                if (r.dest.dim == 1) {
                    eDst = `tmp1[${r.dest.id}]`;
                } else {
                    throw new Error("Invalid dim");
                }
                break;
            }
            case "cm": {
                if (dom == "n") {
                    eDst = evalMap(fflonkInfo.cm_n[r.dest.id], r.dest.prime)
                } else if (dom == "ext") {
                    eDst = evalMap(fflonkInfo.cm_ext[r.dest.id], r.dest.prime)
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            }
            case "tmpExp": {
                if (dom == "n") {
                    eDst = evalMap(fflonkInfo.tmpExp_n[r.dest.id], r.dest.prime)
                } else if (dom == "ext") {
                    throw new Error("Invalid dom");
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            }
            default: throw new Error("Invalid reference type set: " + r.dest.type);
        }
        return eDst;
    }

    function pushResArg(r) {
        let eDst;
        switch (r.dest.type) {
            case "tmp": {
                args.push(ID1D[r.dest.id]);
                argsString += `${ID1D[r.dest.id]}, `;
                //argsString += `${r.dest.id}, `;
                cont_args += 1;
                break;
            }
            case "cm": {
                if (dom == "n") {
                    eDst = evalMap_(fflonkInfo.cm_n[r.dest.id], r.dest.prime)
                } else if (dom == "ext") {
                    eDst = evalMap_(fflonkInfo.cm_ext[r.dest.id], r.dest.prime)
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            }
            case "tmpExp": {
                if (dom == "n") {
                    eDst = evalMap_(fflonkInfo.tmpExp_n[r.dest.id], r.dest.prime)
                } else if (dom == "ext") {
                    throw new Error("Invalid dom");
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            }
            default: throw new Error("Invalid reference type set: " + r.dest.type);
        }
        return eDst;
    }

    function evalMap(polId, prime) {
        let p = fflonkInfo.cmPolsMap[polId];
        ++refpols;
        if (!p) {
            console.log("xx");
        }
        let offset = p.stagePos;
        let size = fflonkInfo.mapSectionsN[p.stage];
        if (p.dim == 1) {
            if (prime) {
                range_pols_1.add(size);
                range_polsseq_1.add(p.stage);
                return `params.${p.stage}[${offset} + ((i + ${next})%${N})*${size}]`;

            } else {
                range_pols_2.add(size);
                range_polsseq_2.add(p.stage);
                return `params.${p.stage}[${offset} + i*${size}]`;
            }
        } else {
            throw new Error("invalid dim");
        }
    }

    function pushSrcArg(r) {
        switch (r.type) {
            case "tmp": {
                args.push(ID1D[r.id]);
                argsString += `${ID1D[r.id]}, `;
                //argsString += `${r.id}, `;
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
                } else if (dom == "ext") {
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
                    evalMap_(fflonkInfo.tmpExp_n[r.id], r.prime)
                } else if (dom == "ext") {
                    console.log("hola ", r.type);
                    throw new Error("Invalid dom");
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            }
            case "cm": {
                if (dom == "n") {
                    evalMap_(fflonkInfo.cm_n[r.id], r.prime)
                } else if (dom == "ext") {
                    evalMap_(fflonkInfo.cm_ext[r.id], r.prime)
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            }
            case "number": {
                args.push(`${BigInt(r.value).toString()}`);
                argsString += `${BigInt(r.value).toString()}, `;
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
        let p = fflonkInfo.cmPolsMap[polId];
        let offset = p.stagePos;
        let size = fflonkInfo.mapSectionsN[p.stage];
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
        } else {
            throw new Error("invalid dim");
        }
    }

    function getIdMaps(maxid) {

        let Ini1D = new Array(maxid).fill(-1);
        let End1D = new Array(maxid).fill(-1);

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
                    throw new Error("Invalid dim");
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
                        throw new Error("Invalid dim");
                    }
                }
            }
        }
        const segments1D = [];
        for (let j = 0; j < maxid; j++) {
            if (Ini1D[j] >= 0) {
                segments1D.push([Ini1D[j], End1D[j], j])
            }
        }
        subsets1D = temporalsSubsets(segments1D);       
        let count1d = 0;
        for (s of subsets1D) {
            for (a of s) {
                ID1D[a[2]] = count1d;
            }
            ++count1d;
        }
        console.log(count1d, subsets1D.length);
        return { count1d };
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
