const { log2 } = require("pilcom/src/utils");
const F3G = require("./f3g");

const F = new F3G();

module.exports = function cPolBuilder(pil, idExpCPol) {

    const e = {
        op: "sub",
        values: [
            {
                op: "mul",
                values: [
                    {
                        op: "cm",
                        id: 1
                    },
                    {
                        op: "number",
                        value: 5n
                    }
                ]
            },
            {
                op: "mul",
                values: [
                    {
                        op: "cm",
                        id: 1
                    },
                    {
                        op: "cm",
                        id: 1,
                        prime: true
                    }
                ]
            }
        ]
    };

    const degE = getDeg(pil, e);
    console.log("Total degree E: ", degE);
    console.log("TestVal E: ", testVal(pil, e));
    const e2 = sort(pil, e);
    const degE2 = getDeg(pil, e2);
    console.log("Total degree E: ", degE2);
    console.log("TestVal E: ", testVal(pil, e2));
    const pe = price(pil, e, 1 << roofLog( getDeg(pil, pil.expressions[idExpCPol])));
    console.log("Price: ", pe);

    const res2 = isolateBad(pil, e);
    console.log(res2);



    const deg = getDeg(pil, pil.expressions[idExpCPol]);
    console.log("Total degree: ", deg);
    console.log("TestVal: ", testVal(pil, pil.expressions[idExpCPol]));
    pil.expressions[idExpCPol] = sort(pil, pil.expressions[idExpCPol]);
    const deg2 = getDeg(pil, pil.expressions[idExpCPol]);
    console.log("Total degree: ", deg2);
    console.log("TestVal: ", testVal(pil, pil.expressions[idExpCPol]));

    /*
    const res = isolateBad(pil, pil.expressions[idExpCPol]);
    console.log(res);
    */

    const p = price(pil, pil.expressions[idExpCPol], 1 << roofLog( getDeg(pil, pil.expressions[idExpCPol])));
    console.log("Price: ", p);
}

function getDeg(pil, exp) {
    if (typeof exp.degree !== "undefined") return exp.degree;
    let v;
    switch (exp.op) {
        case "add":
        case "sub":
            v= Math.max( getDeg(pil, exp.values[0]), getDeg(pil, exp.values[1]));
            break;
        case "mul":
            v= getDeg(pil, exp.values[0])  +  getDeg(pil, exp.values[1]);
            break;
        case "addc":
        case "mulc":
        case "neg":
            v= getDeg(pil, exp.values[0]);
            break;
        case "cm": v= 1; break;
        case "const": v= 0; break;
        case "exp": v= getDeg(pil, pil.expressions[exp.id]); break;
        case "number": v= 0; break;
        case "public": v= 0; break;
        case "challenge": v= 0; break;
        case "x": v= 0.0001; break;
        default: throw new Error("Exp op not defined: " + exp.op);
    }
    exp.degree = v;
    return v;
}


function sort(pil, exp, prime, neg) {
    prime = prime || false;
    neg = neg || false;
    let op;
    switch (exp.op) {
        case "add":
        case "sub":
            op = "add";
            break;
        case "mul":
            op = "mul";
            break;
        case "neg":
            return sort(pil, exp.values[0], prime, !neg);
        case "exp":
            if (prime && exp.prime) throw new Error("Double prime");
            return sort(pil, pil.expressions[exp.id], prime || exp.prime, neg);
        case "cm":
        case "const":
        case "x":
            if (prime && exp.prime) throw new Error("Double prime");
        case "number":
        case "public":
        case "challenge":
            if (neg) {
                return {
                    op: "neg",
                    values: [exp]
                }
            } else {
                return exp;
            }
        default: throw new Error("Exp op not defined: " + exp.op);
    }

    const exps = join(pil, op, exp, prime);

    for (let i=0; i<exps.length; i++) {
        exps[i] = sort(pil, exps[i], prime,  ((op == "add") || (i==0)) ? neg : false);
        exps[i].deg = getDeg(pil, exps[i]);
    }

    exps.sort(function(a,b) {
        return a.deg - b.deg;
    });

    let e = exps[0];
    for (let i =1; i<exps.length; i++) {
        e = {
            op: op,
            values: [ e, exps[i]]
        }
    }

    return e;
}

function join(pil, op, exp, neg, prime, factor) {
    neg = neg || false;
    switch (exp.op) {
        case "add":
            if (op != "add") return doNothing();
            return [...join(pil, op, exp.values[0], neg, prime, factor), ...join(pil, op, exp.values[1], neg, prime, factor)];
        case "sub":
            if (op != "add") return doNothing();
            return [...join(pil, op, exp.values[0], neg, prime, factor), ...join(pil, op, exp.values[1], !neg, prime, factor)];
        case "mul":
            if (op == "add") {
                const d1 = getDeg(pil, exp.values[0]);
                const d2 = getDeg(pil, exp.values[1]);
                if (d1==0) {
                    if (d2==0) {
                        return [mulFactor(factor, mulFactor(exp.values[0], exp.values[1]))];
                    } else {
                        return join(pil, op, exp.values[1], neg, prime, mulFactor(factor, exp.values[0]));
                    }
                } else {
                    if (d2==0) {
                        return join(pil, op, exp.values[0], neg, prime, mulFactor(factor, exp.values[1]));
                    } else {
                        return doNothing();
                    }
                }
            }
            return [...join(pil, op, exp.values[0], neg, prime, factor), ...join(pil, op, exp.values[1], false, prime, factor)];
        case "neg":
            if (op != "add") return doNothing();
            return join(pil, op, exp.values[0], !neg, prime, factor);
        case "exp":
            if (prime && exp.prime) throw new Error("Double prime");
            return join(pil, op, pil.expressions[exp.id], neg, prime || exp.prime, factor);
        case "cm":
        case "const":
        case "x":
                if (prime && exp.prime) throw new Error("Double prime");
                exp.prime = exp.prime || prime;
        case "number":
        case "public":
        case "challenge": return doNothing();
        default: throw new Error("Exp op not defined: " + exp.op);
    }

    function doNothing() {
        if (factor) {
            exp = {
                op: "mul",
                values: [
                    exp,
                    factor
                ]
            }
        }
        if (neg) {
            if (exp.op=="number") {
                return [{
                    op: "number",
                    value: F.neg(F.e(exp.value))
                }];
            } else {
                return [{
                    op: "neg",
                    values: [exp]
                }];
            }
        } else {
            return [exp];
        }
    }

    function mulFactor(f1, f2) {
        if (!f1) return f2;
        if (!f2) return f1;
        return {
            op: "mul",
            values: [f1, f2]
        }
    }
}

function testVal(pil, exp, prime) {
    let v;
    switch (exp.op) {
        case "add":
            return F.add(testVal(pil, exp.values[0]), testVal(pil, exp.values[1]) );
        case "sub":
            return F.sub(testVal(pil, exp.values[0]), testVal(pil, exp.values[1]) );
        case "mul":
            return F.mul(testVal(pil, exp.values[0]), testVal(pil, exp.values[1]) );
        case "neg":
            return F.neg(testVal(pil, exp.values[0]));
        case "exp":
            if (prime && exp.prime) throw new Error("Double prime");
            return testVal(pil, pil.expressions[exp.id], prime || exp.prime);
        case "cm":
            if (prime && exp.prime) throw new Error("Double prime");
            v = F.e(exp.id*1000);
            if (prime || exp.prime) v = F.add(v, 1n);
            return v;
        case "const":
            if (prime && exp.prime) throw new Error("Double prime");
            v = F.e(exp.id*2000);
            if (prime || exp.prime) v = F.add(v, 1n);
            return v;
        case "x":
            if (prime && exp.prime) throw new Error("Double prime");
            v = 999999n;
            if (prime || exp.prime) v = F.add(v, 88n);
            return v;
        case "number":
            return F.e(exp.value);
        case "public":
            v = F.e(exp.id*3000);
            return v;
        case "challenge":
            v = F.e(exp.id*4000);
            return v;
        default: throw new Error("Exp op not defined: " + exp.op);
    }
}


function isolateBad(pil, exp) {
    if (isGood(pil, exp)) return null;
    console.log("Complexity bad: ", complexity(pil, exp));
    if (exp.values) {
        for (let i=0; i<exp.values.length; i++) {
            const res = isolateBad(pil, exp.values[i]);
            if (res) {
                return res;
            }
        }
    }
    return exp;
}

function isGood(pil, exp) {
    const v1 = testVal(pil, exp);
    const sExp = sort(pil, exp);
    const v2 = testVal(pil, sExp);
    return v1==v2;
}

function complexity(pil, exp) {
    switch (exp.op) {
        case "add":
        case "sub":
        case "mul":
            return complexity(pil, exp.values[0]) + complexity(pil, exp.values[1]) + 1;
        case "neg":
            return complexity(pil, exp.values[0]) +1;
        case "cm": return 1;
        case "const": return 1;
        case "exp": return complexity(pil, pil.expressions[exp.id]);
        case "number": return 1;
        case "public": return 1;
        case "challenge": return 1;
        case "x": return 1;
        default: throw new Error("Exp op not defined: " + exp.op);
    }
}


function roofLog(a) {
    return log2(a - 1) + 1;
}

function price(pil, exp, outSize, expSizes) {
    if (!expSizes) expSizes = [{}];
    if (exp.price && (typeof exp.price[outSize] !== "undefined")) return exp.price[outSize];
    if (outSize == 1) return 0;
    switch (exp.op) {
        case "add":
        case "sub":
        case "mul":
        case "neg":
            break;
        case "cm":
            return updateExpSize(expSizes, exp.id, outSize);
        case "const": return 0;
        case "number": return 0;
        case "public": return 0;
        case "challenge": return 0;
        case "x": return 0;
        default: throw new Error("Exp op not defined: " + exp.op);
    }
    let bestResult = Infinity;
    let start = 1 << roofLog(getDeg(pil, exp));
    let end = 1 << roofLog(outSize);
//    end = end / 2;
//    if (end < start) end = start;
//    start = end;
//    end = start;
    let bestExpSizes;
    for (let i = start; i<= end; i=i*2) {
        expSizes.push({})
        let acc = 0;
        for (let j=0; j<exp.values.length; j++) {
            acc += price(pil, exp.values[j], i, expSizes);
        }
        acc += outSize-i;
        if (acc <bestResult) {
            bestResult = acc;
            bestExpSizes = expSizes[expSizes.length-1];
        }
        expSizes.pop();
    }
    expSizes.push(bestExpSizes);
//    if (!exp.price) exp.price = {};
//    exp.price[outSize] = bestResult;
    return bestResult;

    function updateExpSize(expSizes, id, newSize) {
        let curSize = 1;
        for (let i=expSizes.length-1; i>=0; i--) {
            if (typeof expSizes[i][id] != "undefined") {
                curSize = expSizes[i][id];
                break;
            }
        }
        expSizes[expSizes.length-1][id] = newSize;
        return Math.max(newSize - curSize, 0);
    }
}