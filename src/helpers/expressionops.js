const CHALLENGE_U = 0;
const CHALLENGE_DEFVAL = 1;
const CHALLENGE_BETA = 2;
const CHALLENGE_GAMMA = 3;
const CHALLENGE_ALPHA = 4;
const CHALLENGE_XI = 5;
const CHALLENGE_V = 6;
const CHALLENGE_VP = 7;

const challengeMap = {
    "u": CHALLENGE_U,
    "defVal": CHALLENGE_DEFVAL,
    "gamma": CHALLENGE_GAMMA,
    "beta": CHALLENGE_BETA,
    "vc": CHALLENGE_ALPHA,
    "xi": CHALLENGE_XI,
    "vf1": CHALLENGE_V,
    "vf2": CHALLENGE_VP
};

class ExpressionOps {

    add(a, b) {
        if (!a) return b;
        if (!b) return a;
        return {
            op: "add",
            values: [ a, b]
        }
    }

    sub(a, b) {
        if (!a) return b;
        if (!b) return a;
        return {
            op: "sub",
            values: [ a, b]
        }
    }

    mul(a, b) {
        if (!a) return b;
        if (!b) return a;
        return {
            op: "mul",
            values: [ a, b]
        }
    }

    neg(a) {
        return {
            op: "neg",
            values: [a]
        }
    }

    exp(id, next) {
        return {
            op: "exp",
            id: id,
            next: !!next
        }
    }

    cm(id, next) {
        return {
            op: "cm",
            id: id,
            next: !!next
        }
    }

    const(id, next) {
        return {
            op: "const",
            id: id,
            next: !!next
        }
    }

    q(id, next) {
        return {
            op: "q",
            id: id,
            next: !!next
        }
    }

    challenge(name) {
        if (typeof challengeMap[name] == "undefined") {
            throw new Error("challenge not defined "+name);
        }
        return {
            op: "challenge",
            id: challengeMap[name]
        };
    }

    number(n) {
        return {
            op: "number",
            value: BigInt(n)
        }
    }

    eval(n) {
        return {
            op: "eval",
            id: n
        }
    }

    tmp(n) {
        return {
            op: "tmp",
            id: n
        }
    }

    xDivXSubXi() {
        return {
            op: "xDivXSubXi"
        }
    }

    xDivXSubWXi() {
        return {
            op: "xDivXSubWXi"
        }
    }

    x() {
        return {
            op: "x"
        }
    }

}

module.exports = ExpressionOps;