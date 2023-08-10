
let challenges = {};
let nChallenges = 0;
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
        if (!name) throw new Error("Challenge name not defined");
        if (challenges[name] === undefined) {
            challenges[name] = nChallenges++;
        }
        return {
            op: "challenge",
            id: challenges[name],
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

    xDivXSubXi(opening) {
        return {
            op: "xDivXSubXi",
            opening: opening
        }
    }

    x() {
        return {
            op: "x"
        }
    }

}

module.exports = ExpressionOps;
