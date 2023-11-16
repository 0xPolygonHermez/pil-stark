const chai = require("chai");
const { BigBuffer } = require("pilcom");
const assert = chai.assert;
const F3g = require("../src/helpers/f3g");
const { polynomialDivision, evaluatePolynomial, fastEvaluatePolynomial } = require("../src/helpers/polutils");

describe("test polinomial division", async function () {
    this.timeout(10000000);
    let F;

    before(async () => { 
        F = new F3g();
    })

    it("should divide by a polynomial", async () => {    
        // Dividend: 2x^3 - 3x^2 + 2
        // Divisor:   x^2 + 3x
        // Quotient:   2x - 9
        // Remainder:  27x + 2
        console.log("Initializing...");
        const polDividend = [2n, 0n, F.e(-3n), 2n];
        const polDivisor = [0n, 3n, 1n];

        const polRemainder = [2n, 27n];

        const polR = polynomialDivision(F, polDividend, polDivisor);

        assert(F.eq(polR[0], polRemainder[0]));
        assert(F.eq(polR[1], polRemainder[1]));
        assert(F.eq(polR[2], F.zero));
        assert(F.eq(polR[3], F.zero));
    });

    it("should evaluate a polynomial", async () => {
        let polynomial = new Array(4);
        for (let i = 0; i < 4; i++) {
            polynomial[i] = F.e(i);
        }

        let x = F.e(2);
        
        const eval = evaluatePolynomial(F, polynomial, x);
        const fastEval = fastEvaluatePolynomial(F, polynomial, x);

        assert(F.eq(eval, F.e(34)));
        assert(F.eq(fastEval, F.e(34)));
    });
    
    it("should evaluate a polynomial in the extended field", async () => {
        const N = 2**15;
        let polynomial = new Array(N);
        for (let i = 0; i < N; i++) {
            polynomial[i] = F.e(i);
        }

        let x = [F.e(2), F.e(1), F.e(3)];

        const eval = evaluatePolynomial(F, polynomial, x);
        const fastEval = fastEvaluatePolynomial(F, polynomial, x);

        assert(F.eq(eval, fastEval));
    })
});