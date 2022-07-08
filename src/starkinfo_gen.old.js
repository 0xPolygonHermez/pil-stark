
const F1Field = require("./f3g.js");
const ExpressionOps = require("./expressionops.js");
const getKs = require("pilcom").getKs;


module.exports = function starkInfoGen(pil, starkStruct) {
    const F = new F1Field();

    const E = new ExpressionOps();
    const res = {
        puCtx: [],
        peCtx: [],
        ciCtx: []
    };

    const ctx = {
        pil: pil,
        calculated: {
            exps: {},
            expsPrime: {}
        },
        tmpUsed: 0,
        code: []
    };

    const ctx2ns = {
        pil: pil,
        calculated: {
            exps: {},
            expsPrime: {}
        },
        tmpUsed: 0,
        code: []
    };

    for (let i=0; i<pil.publics.length; i++) {
        if (pil.polType == "exp") {
            pilCodeGen(ctx, pil.publics[i].polId, false);
        }
    }

    res.step1prev = buildCode(ctx);

    for (let i=0; i<pil.expressions.length; i++) {
        if (typeof pil.expressions[i].idQ != "undefined") {
            pilCodeGen(ctx, i);
            pilCodeGen(ctx2ns, i, false, "evalQ");
        }
    }

    res.step1 = buildCode(ctx);
    res.step12ns = buildCode(ctx2ns);

    res.nCm1 = pil.nCommitments;
    res.nQ1 = pil.nQ;
    res.nConst = pil.nConstants;

    generateH1H2();

    res.step2prev = buildCode(ctx);

    for (let i=0; i<pil.expressions.length; i++) {
        if (typeof pil.expressions[i].idQ != "undefined") {
            pilCodeGen(ctx, i);
            pilCodeGen(ctx2ns, i, false, "evalQ");
        }
    }

    res.step2 = buildCode(ctx);
    res.step22ns = buildCode(ctx2ns);

    res.nCm2 = pil.nCommitments - res.nCm1;
    res.nQ2 = pil.nQ - res.nQ1;

    generatePermutationLC();
    generatePlookupZ();
    generatePermutationZ();
    generateConnectionsZ();

    res.step3prev = buildCode(ctx);

    for (let i=0; i<pil.expressions.length; i++) {
        if (typeof pil.expressions[i].idQ != "undefined") {
            pilCodeGen(ctx, i);
            pilCodeGen(ctx2ns, i, false, "evalQ");
        }
    }

    res.step3 = buildCode(ctx);
    res.step32ns = buildCode(ctx2ns);

    res.nCm3 = pil.nCommitments - res.nCm2 - res.nCm1;
    res.nQ3 = pil.nQ - res.nQ2 - res.nQ1;

    generateConstraintPolynomial();



    for (let i=0; i<pil.expressions.length; i++) {
        if (typeof pil.expressions[i].idQ != "undefined") {
            pilCodeGen(ctx, i);
            pilCodeGen(ctx2ns, i, false, "evalQ");
        }
    }

    res.step4 = buildCode(ctx);
    res.step42ns = buildCode(ctx2ns);

    res.nCm4 = pil.nCommitments - res.nCm3 -res.nCm2-res.nCm1;
    res.nQ4 = pil.nQ - res.nQ3 -res.nQ2 - res.nQ1;

    generateConstraintPolynomialVerifier();
    generateFRIPolynomial();

    pilCodeGen(ctx2ns, res.friExpId);
    res.step52ns = buildCode(ctx2ns);

    generateVerifierQuery();

    return res;


    function generateH1H2() {

        for (let i=0; i<pil.plookupIdentities.length; i++) {
            const puCtx = {};
            const pi = pil.plookupIdentities[i];

            let tExp = null;
            const u = E.challenge("u");
            const defVal = E.challenge("defVal");
            for (let j=0; j<pi.t.length; j++) {
                const e = E.exp(pi.t[j]);
                if (tExp) {
                    tExp = E.add(E.mul(u, tExp), e);
                } else {
                    tExp = e;
                }
            }
            if (pi.selT !== null) {
                tExp = E.sub(tExp, defVal);
                tExp = E.mul(tExp, E.exp(pi.selT));
                tExp = E.add(tExp, defVal);

                tExp.idQ = pil.nQ;
                pil.nQ++;
            }

            puCtx.tExpId = pil.expressions.length;
            pil.expressions.push(tExp);


            fExp = null;
            for (let j=0; j<pi.f.length; j++) {
                const e = E.exp(pi.f[j]);
                if (fExp) {
                    fExp = E.add(E.mul(fExp, u), e);
                } else {
                    fExp = e;
                }
            }
            if (pi.selF !== null) {
                fExp = E.sub(fExp, E.exp(puCtx.tExpId));
                fExp = E.mul(fExp, E.exp(pi.selF));
                fExp = E.add(fExp, E.exp(puCtx.tExpId));

                fExp.idQ = pil.nQ;
                pil.nQ++;
            }

            puCtx.fExpId = pil.expressions.length;
            pil.expressions.push(fExp);

            pilCodeGen(ctx, puCtx.fExpId, false);
            pilCodeGen(ctx, puCtx.tExpId, false);

            puCtx.h1Id = pil.nCommitments++;
            puCtx.h2Id = pil.nCommitments++;

            res.puCtx.push(puCtx);
        }
    }



    function generatePermutationLC() {
        for (let i=0; i<pil.permutationIdentities.length; i++) {
            const peCtx = {};
            const pi = pil.permutationIdentities[i];

            let tExp = null;
            const u = E.challenge("u");
            const defVal = E.challenge("defVal");
            for (let j=0; j<pi.t.length; j++) {
                const e = E.exp(pi.t[j]);
                if (tExp) {
                    tExp = E.add(E.mul(u, tExp), e);
                } else {
                    tExp = e;
                }
            }
            if (pi.selT !== null) {
                tExp = E.sub(tExp, defVal);
                tExp = E.mul(tExp, E.exp(pi.selT));
                tExp = E.add(tExp, defVal);

                tExp.idQ = pil.nQ;
                pil.nQ++;
            }

            peCtx.tExpId = pil.expressions.length;
            pil.expressions.push(tExp);


            fExp = null;
            for (let j=0; j<pi.f.length; j++) {
                const e = E.exp(pi.f[j]);
                if (fExp) {
                    fExp = E.add(E.mul(fExp, u). e);
                } else {
                    fExp = e;
                }
            }
            if (pi.selF !== null) {
                fExp = E.sub(fExp, defVal);
                fExp = E.mul(fExp, E.exp(pi.selF));
                fExp = E.add(fExp, defVal);

                fExp.idQ = pil.nQ;
                pil.nQ++;
            }

            peCtx.fExpId = pil.expressions.length;
            pil.expressions.push(fExp);

            pilCodeGen(ctx, peCtx.fExpId, false);
            pilCodeGen(ctx, peCtx.tExpId, false);

            res.peCtx.push(peCtx);
        }
    }


    function generatePlookupZ() {
        for (let i=0; i<pil.plookupIdentities.length; i++) {
            const puCtx = res.puCtx[i];
            puCtx.zId = pil.nCommitments++;


            const h1 = E.cm(puCtx.h1Id);
            const h2 =  E.cm(puCtx.h2Id);
            const h1p = E.cm(puCtx.h1Id, true);
            const f = E.exp(puCtx.fExpId);
            const t = E.exp(puCtx.tExpId);
            const tp = E.exp(puCtx.tExpId, true);
            const z = E.cm(puCtx.zId);
            const zp = E.cm(puCtx.zId, true);

            if ( typeof pil.references["Global.L1"] === "undefined") throw new Error("Global.L1 must be defined");

            const l1 = E.const(pil.references["Global.L1"].id);

            const c1 = E.mul(l1,  E.sub(z, E.number(1)));
            c1.deg=2;
            puCtx.c1Id = pil.expressions.length;
            pil.expressions.push(c1);
            pil.polIdentities.push({e: puCtx.c1Id});

            const gamma = E.challenge("gamma");
            const beta = E.challenge("beta");

            const numExp = E.mul(
                E.mul(
                    E.add(f, gamma),
                    E.add(
                        E.add(
                            t,
                            E.mul(
                                tp,
                                beta
                            )
                        ),
                        E.mul(gamma,E.add(E.number(1), beta))
                    )
                ),
                E.add(E.number(1), beta)
            );
            numExp.idQ = pil.nQ++;
            puCtx.numId = pil.expressions.length;
            pil.expressions.push(numExp);

            const denExp = E.mul(
                E.add(
                    E.add(
                        h1,
                        E.mul(
                            h2,
                            beta
                        )
                    ),
                    E.mul(gamma,E.add(E.number(1), beta))
                ),
                E.add(
                    E.add(
                        h2,
                        E.mul(
                            h1p,
                            beta
                        )
                    ),
                    E.mul(gamma,E.add(E.number(1), beta))
                )
            );
            denExp.idQ = pil.nQ++;
            puCtx.denId = pil.expressions.length;
            pil.expressions.push(denExp);

            const num = E.exp(puCtx.numId);
            const den = E.exp(puCtx.denId);

            const c2 = E.sub(  E.mul(zp, den), E.mul(z, num)  );
            c2.deg=2;
            puCtx.c2Id = pil.expressions.length;
            pil.expressions.push(c2);
            pil.polIdentities.push({e: puCtx.c2Id});

            pilCodeGen(ctx, puCtx.numId, false);
            pilCodeGen(ctx, puCtx.denId, false);
        }
    }


    function generatePermutationZ() {
        for (let i=0; i<pil.permutationIdentities.length; i++) {
            peCtx = res.peCtx[i];

            peCtx.zId = pil.nCommitments++;

            const f = E.exp(peCtx.fExpId);
            const t = E.exp(peCtx.tExpId);
            const z = E.cm(peCtx.zId);
            const zp = E.cm(peCtx.zId, true);

            if ( typeof pil.references["Global.L1"] === "undefined") throw new Error("Global.L1 must be defined");

            const l1 = E.const(pil.references["Global.L1"].id);

            const c1 = E.mul(l1,  E.sub(z, E.number(1)));
            c1.deg=2;
            peCtx.c1Id = pil.expressions.length;
            pil.expressions.push(c1);
            pil.polIdentities.push({e: peCtx.c1Id});

            const beta = E.challenge("beta");

            const numExp = E.add( f, beta);
            peCtx.numId = pil.expressions.length;
            pil.expressions.push(numExp);

            const denExp = E.add( t, beta);
            peCtx.denId = pil.expressions.length;
            pil.expressions.push(denExp);

            const c2 = E.sub(  E.mul(zp,  E.exp( peCtx.denId )), E.mul(z, E.exp( peCtx.numId )));
            c2.deg=2;
            peCtx.c2Id = pil.expressions.length;
            pil.expressions.push(c2);
            pil.polIdentities.push({e: peCtx.c2Id});

            pilCodeGen(ctx, peCtx.numId, false);
            pilCodeGen(ctx, peCtx.denId, false);
        }
    }

    function generateConnectionsZ() {
        for (let i=0; i<pil.connectionIdentities.length; i++) {
            const ci = pil.connectionIdentities[i];
            const ciCtx = {};

            ciCtx.zId = pil.nCommitments++;

            const beta = E.challenge("beta");
            const gamma = E.challenge("gamma");

            let numExp = E.add(
                E.add(
                    E.exp(ci.pols[0]),
                    E.mul(beta, E.x())
                ), gamma);

            let denExp = E.add(
                E.add(
                    E.exp(ci.pols[0]),
                    E.mul(beta, E.exp(ci.connections[0]))
                ), gamma);

            ciCtx.numId = pil.expressions.length;
            pil.expressions.push(numExp);

            ciCtx.denId = pil.expressions.length;
            pil.expressions.push(denExp);

            let ks = getKs(F, ci.pols.length-1);
            for (let i=1; i<ci.pols.length; i++) {
                const numExp =
                    E.mul(
                        E.exp(ciCtx.numId),
                        E.add(
                            E.add(
                                E.exp(ci.pols[i]),
                                E.mul(E.mul(beta, E.number(ks[i-1])), E.x())
                            ),
                            gamma
                        )
                    );
                numExp.idQ = pil.nQ++;

                const denExp =
                    E.mul(
                        E.exp(ciCtx.denId),
                        E.add(
                            E.add(
                                E.exp(ci.pols[i]),
                                E.mul(beta, E.exp(ci.connections[i]))
                            ),
                            gamma
                        )
                    );
                denExp.idQ = pil.nQ++;

                ciCtx.numId = pil.expressions.length;
                pil.expressions.push(numExp);

                ciCtx.denId = pil.expressions.length;
                pil.expressions.push(denExp);
            }

            const z = E.cm(ciCtx.zId);
            const zp = E.cm(ciCtx.zId, true);

            if ( typeof pil.references["Global.L1"] === "undefined") throw new Error("Global.L1 must be defined");

            const l1 = E.const(pil.references["Global.L1"].id);

            const c1 = E.mul(l1,  E.sub(z, E.number(1)));
            c1.deg=2;
            ciCtx.c1Id = pil.expressions.length;
            pil.expressions.push(c1);
            pil.polIdentities.push({e: ciCtx.c1Id});


            const c2 = E.sub(  E.mul(zp,  E.exp( ciCtx.denId )), E.mul(z, E.exp( ciCtx.numId )));
            c2.deg=2;
            ciCtx.c2Id = pil.expressions.length;
            pil.expressions.push(c2);
            pil.polIdentities.push({e: ciCtx.c2Id});

            pilCodeGen(ctx, ciCtx.numId, false);
            pilCodeGen(ctx, ciCtx.denId, false);

            res.ciCtx.push(ciCtx);
        }
    }


    // Build the condition polynomial

    function generateConstraintPolynomial() {
        const vc = E.challenge("vc");
        let cExp = null;
        for (let i=0; i<pil.polIdentities.length; i++) {
            const e = E.exp(pil.polIdentities[i].e);
            if (cExp) {
                cExp = E.add(E.mul(vc, cExp), e);
            } else {
                cExp = e;
            }
        }
        cExp.idQ = pil.nQ++;
        res.cExp = pil.expressions.length;
        pil.expressions.push(cExp);
    }

    function generateConstraintPolynomialVerifier() {
        const ctxC = {
            pil: pil,
            calculated: {
                exps: {},
                expsPrime: {}
            },
            tmpUsed: 0,
            code: []
        };

        pilCodeGen(ctxC, res.cExp, false, "correctQ");

        res.verifierCode = buildCode(ctxC).first;


        res.evIdx = {
            cm: [{}, {}],
            q: [{}, {}],
            const: [{}, {}]
        }
        const expMap = [{}, {}];

        res.evMap = [];


        for (let i=0; i<res.verifierCode.length; i++) {
            for (let j=0; j<res.verifierCode[i].src.length; j++) {
                fixRef(res.verifierCode[i].src[j]);
            }
            fixRef(res.verifierCode[i].dest);
        }
        function fixRef(r) {
            const p = r.prime ? 1 : 0;
            switch (r.type) {
                case "cm":
                case "q":
                case "const":
                    if (typeof res.evIdx[r.type][p][r.id] === "undefined") {
                        res.evIdx[r.type][p][r.id] = res.evMap.length;
                        const rf = {
                            type: r.type,
                            id: r.id,
                            prime: r.prime ? true : false,
                        };
                        [rf.tree, rf.treePos] = getTreePos(res, r.type, r.id);
                        res.evMap.push(rf);
                    }
                    delete r.prime;
                    r.id= res.evIdx[r.type][p][r.id];
                    r.type= "eval";
                    break;
                case "exp":
                    if (typeof expMap[p][r.id] === "undefined") {
                        expMap[p][r.id] = ctxC.tmpUsed ++;
                    }
                    delete r.prime;
                    r.type= "tmp";
                    r.id= expMap[p][r.id];
                    break;
                case "number":
                case "challenge":
                case "public":
                case "tmp":
                case "Z":
                case "x":
                    break;
                default:
                    throw new Error("Invalid reference type");
            }
        }
    }


    function generateFRIPolynomial() {
        const vf1 = E.challenge("vf1");
        const vf2 = E.challenge("vf2");

        let friExp = null;
        for (let i=0; i<pil.nCommitments; i++) {
            if (friExp) {
                friExp = E.add(E.mul(vf1, friExp), E.cm(i));
            } else {
                friExp = E.cm(i);
            }
        }
        for (let i=0; i<pil.nQ; i++) {
            if (friExp) {
                friExp = E.add(E.mul(vf1, friExp), E.q(i));
            } else {
                friExp = E.q(i);
            }
        }

        let fri1exp = null;
        let fri2exp = null;
        const xi = E.challenge("xi");
        for (let i=0; i<res.evMap.length; i++) {
            const ev = res.evMap[i];
            let friExp = ev.prime ? fri2exp : fri1exp;
            const e = E[ev.type](ev.id);
            if (friExp) {
                friExp = E.add(E.mul(friExp, vf2), E.sub(e,  E.eval(i)));
            } else {
                friExp = E.sub(e,  E.eval(i));
            }
            if (ev.prime) {
                fri2exp = friExp;
            } else {
                fri1exp = friExp;
            }
        }


        fri1exp = E.mul(fri1exp, E.xDivXSubXi() );
        if (friExp) {
            friExp = E.add(E.mul(vf1, friExp),  fri1exp );
        } else {
            friExp = fri1exp;
        }

        fri2exp =  E.mul(fri2exp, E.xDivXSubWXi() );
        if (friExp) {
            friExp = E.add(E.mul(vf1, friExp),  fri2exp );
        } else {
            friExp = fri2exp;
        }

        res.friExpId = pil.expressions.length;
        pil.expressions.push(friExp);
    }

    function generateVerifierQuery() {

        const ctxFri = {
            pil: pil,
            calculated: {
                exps: {},
                expsPrime: {}
            },
            tmpUsed: 0,
            code: []
        };

        pilCodeGen(ctxFri, res.friExpId);
        res.verifierQueryCode = buildCode(ctxFri).first;
        res.nExps = pil.expressions.length;

        const expMap2 = [{}, {}];
        for (let i=0; i<res.verifierQueryCode.length; i++) {
            for (let j=0; j<res.verifierQueryCode[i].src.length; j++) {
                fixRef2(res.verifierQueryCode[i].src[j]);
            }
            fixRef2(res.verifierQueryCode[i].dest);
        }
        function fixRef2(r) {
            switch (r.type) {
                case "cm":
                case "q":
                case "const":
                    const [k, id] = getTreePos(res, r.type, r.id);
                    r.type = k;
                    r.id = id;
                    delete r.prime;
                    break;
                case "exp":
                    const p = r.prime ? 1 : 0;
                    if (typeof expMap2[p][r.id] === "undefined") {
                        expMap2[p][r.id] = ctxFri.tmpUsed ++;
                    }
                    delete r.prime;
                    r.type= "tmp";
                    r.id= expMap2[p][r.id];
                    break;
                case "number":
                case "challenge":
                case "public":
                case "tmp":
                case "xDivXSubXi":
                case "xDivXSubWXi":
                case "x":
                case "eval":
                    break;
                default:
                    throw new Error("Invalid reference type: "+r.type);
            }
        }

        res.qs1 = [];
        res.qs2 = [];
        res.qs3 = [];
        res.qs4 = [];
        for (let i=0; i<pil.expressions.length; i++) {
            const exp = pil.expressions[i];
            if (typeof exp.idQ !== "undefined") {
                if (exp.idQ<res.nQ1) {
                    res.qs1.push({idExp: i, idQ: exp.idQ});
                } else if (exp.idQ<res.nQ1+res.nQ2) {
                    res.qs2.push({idExp: i, idQ: exp.idQ});
                } else if (exp.idQ<res.nQ1+res.nQ2+res.nQ3) {
                    res.qs3.push({idExp: i, idQ: exp.idQ});
                } else if (exp.idQ<res.nQ1+res.nQ2+res.nQ3+res.nQ4) {
                    res.qs4.push({idExp: i, idQ: exp.idQ});
                } else {
                    throw new Error("q too big");
                }
            }
        }
    }

}



function pilCodeGen(ctx, expId, prime, mode) {
    prime = prime || false;

    if ((mode=="evalQ")&&(prime)) {
        prime = false;              // Do not evaluate Qs for primes, instead cualculate for not prime.
    }

    const primeIdx = prime ? "expsPrime" : "exps";


    if (ctx.calculated[primeIdx][expId]) return;

    calculateDeps(ctx, ctx.pil.expressions[expId], prime, expId, mode);

    const codeCtx = {
        pil: ctx.pil,
        expId: expId,
        tmpUsed: ctx.tmpUsed,
        code: []
    }


    const retRef = evalExp(codeCtx, ctx.pil.expressions[expId], prime);

    if ((mode=="evalQ")&&(typeof ctx.pil.expressions[expId].idQ !== "undefined")) {
        if (prime) {
            throw new Error("EvalQ cannot be prime");
        }
        const rqz = {
            type: "tmp",
            id: codeCtx.tmpUsed++
        };
        codeCtx.code.push({
            op: "sub",
            src: [retRef, {
                type: "exp",
                prime: prime,
                id: expId
            }],
            dest: rqz
        });
        codeCtx.code.push({
            op: "mul",
            src: [{
                type: "Zi",
            }, rqz],
            dest: {
                type: "q",
                id: ctx.pil.expressions[expId].idQ,
                prime: prime
            }
        });
    } else if ((mode=="correctQ")&&(typeof ctx.pil.expressions[expId].idQ !== "undefined")) {
        const rqz = {
            type: "tmp",
            id: codeCtx.tmpUsed++
        };
        codeCtx.code.push({
            op: "mul",
            dest: rqz,
            src: [
                {
                    type: "q",
                    id: ctx.pil.expressions[expId].idQ,
                    prime: prime
                },
                {
                    type: "Z",
                    prime: prime
                }
            ]
        });
        codeCtx.code.push({
            op: "sub",
            dest: {
                type: "exp",
                prime: prime,
                id: expId
            },
            src: [ retRef, rqz]
        });
    } else {
        if (retRef.type == "tmp") {
            codeCtx.code[codeCtx.code.length-1].dest = {
                type: "exp",
                prime: prime,
                id: expId
            }
            codeCtx.tmpUsed --;
        } else {
            codeCtx.code.push({
                op: "copy",
                dest: {
                    type: "exp",
                    prime: prime,
                    id: expId
                },
                src: [ retRef ]
            })
        }
    }

    ctx.code.push({
        expId: expId,
        prime: prime,
        code: codeCtx.code,
        idQ: (typeof ctx.pil.expressions[expId].idQ !== "undefined") ? ctx.pil.expressions[expId].idQ : undefined
    });

    ctx.calculated[primeIdx][expId] = true;

    if (codeCtx.tmpUsed > ctx.tmpUsed) ctx.tmpUsed = codeCtx.tmpUsed;
}

function evalExp(codeCtx, exp, prime) {
    prime = prime || false;
    let a = [];
    let b = [];
    let c;
    let r = [];
    if (exp.op == "add") {
        const a = evalExp(codeCtx, exp.values[0], prime);
        const b = evalExp(codeCtx, exp.values[1], prime);
        const r = {
            type: "tmp",
            id: codeCtx.tmpUsed++
        };
        codeCtx.code.push({
            op: "add",
            dest: r,
            src: [a, b]
        });
        return r;
    } else if (exp.op == "sub") {
        const a = evalExp(codeCtx, exp.values[0], prime);
        const b = evalExp(codeCtx, exp.values[1], prime);
        const r = {
            type: "tmp",
            id: codeCtx.tmpUsed++
        };
        codeCtx.code.push({
            op: "sub",
            dest: r,
            src: [a, b]
        });
        return r;
    } else if (exp.op == "mul") {
        const a = evalExp(codeCtx, exp.values[0], prime);
        const b = evalExp(codeCtx, exp.values[1], prime);
        const r = {
            type: "tmp",
            id: codeCtx.tmpUsed++
        };
        codeCtx.code.push({
            op: "mul",
            dest: r,
            src: [a, b]
        });
        return r;
    } else if (exp.op == "addc") {
        const a = evalExp(codeCtx, exp.values[0], prime);
        const b = {
            type: "number",
            value: exp.const
        }
        const r = {
            type: "tmp",
            id: codeCtx.tmpUsed++
        };
        codeCtx.code.push({
            op: "add",
            dest: r,
            src: [a, b]
        });
        return r;
    } else if (exp.op == "mulc") {
        const a = evalExp(codeCtx, exp.values[0], prime);
        const b = {
            type: "number",
            value: exp.const.toString()
        }
        const r = {
            type: "tmp",
            id: codeCtx.tmpUsed++
        };
        codeCtx.code.push({
            op: "mul",
            dest: r,
            src: [a, b]
        });
        return r;
    } else if (exp.op == "neg") {
        const a = {
            type: "number",
            value: "0"
        };
        const b = evalExp(codeCtx, exp.values[0], prime);
        const r = {
            type: "tmp",
            id: codeCtx.tmpUsed++
        };
        codeCtx.code.push({
            op: "sub",
            dest: r,
            src: [a, b]
        });
        return r;
    } else if (exp.op == "cm") {
        if (exp.next && prime) expressionError(codeCtx.pil, "double Prime", codeCtx.expId);
        return {
            type: "cm",
            id: exp.id,
            prime: exp.next || prime
        }
    } else if (exp.op == "const") {
        if (exp.next && prime) expressionError(ctxCode.pil, "double Prime", ctxCode.expId);
        return {
            type: "const",
            id: exp.id,
            prime: exp.next || prime
        }
    } else if (exp.op == "exp") {
        if (exp.next && prime) expressionError(ctxCode.pil, "double Prime", ctxCode.expId);
        return {
            type: "exp",
            id: exp.id,
            prime: exp.next || prime
        }
    } else if (exp.op == "q") {
        if (exp.next && prime) expressionError(ctxCode.pil, "double Prime", ctxCode.expId);
        return {
            type: "q",
            id: exp.id,
            prime: exp.next || prime
        }
    } else if (exp.op == "number") {
        return {
            type: "number",
            value: exp.value.toString()
        }
    } else if (exp.op == "public") {
        return {
            type: "public",
            id: exp.id
        }
    } else if (exp.op == "challenge") {
        return {
            type: "challenge",
            id: exp.id,
        }
    } else if (exp.op == "eval") {
        return {
            type: "eval",
            id: exp.id,
        }
    } else if (exp.op == "xDivXSubXi") {
        return {
            type: "xDivXSubXi"
        }
    } else if (exp.op == "xDivXSubWXi") {
        return {
            type: "xDivXSubWXi"
        }
    } else if (exp.op == "x") {
        return {
            type: "x"
        }
    } else {
        throw new Error(`Invalid op: ${exp.op}`);
    }
    if (typeof(debugId) !== "undefined") debug(exp.op, r[debugId], a[debugId], b[debugId], c);

    return r;
}


function calculateDeps(ctx, exp, prime, expIdErr, mode) {
    if (exp.op == "exp") {
        if (prime && exp.next) expressionError(ctx.pil, `Double prime`, expIdErr, exp.id);
        pilCodeGen(ctx, exp.id, prime || exp.next, mode);
    }
    if (exp.values) {
        for (let i=0; i<exp.values.length; i++) {
            calculateDeps(ctx, exp.values[i], prime, expIdErr, mode);
        }
    }
}


function expressionError(pil, strErr, e1, e2) {
    let str  = strErr;
    if (typeof e1 !== "undefined")  {
        str = str + "\n" + getExpressionInfo(pil, e1);
    }
    if (typeof e2 !== "undefined") {
        str = str + "\n" + getExpressionInfo(pil, e2);
    }
    throw new Error(str);
}

function getExpressionInfo(pil, expId) {
    for (let i=0; i<pil.polIdentities.length; i++) {
        const pi = pil.polIdentities[i];
        if (pi.e == expId) {
            return `${pi.fileName}:${pi.line}`;
        }
    }
    for (let i=0; i<pil.plookupIdentities.length; i++) {
        const pi = pil.plookupIdentities[i];
        let isThis = false;
        let prefix
        for (j=0; j<pi.f.length; j++) {
            if (pi.f[j] == expId) {
                isThis = true;
                prefix = "f="+j;
            }
        }
        for (j=0; j<pi.t.length; j++) {
            if (pi.t[j] == expId) {
                isThis = true;
                prefix = "t="+j;
            }
        }
        if (pi.selfF === expId) {
            isThis = true;
            prefix = "selF"+j;
        }
        if (pi.selfT === expId) {
            isThis = true;
            prefix = "selF"+j;
        }
        if (isThis) {
            return `${pi.fileName}:${pi.line} ${prefix}`;
        }
    }
    for (let i=0; i<pil.permutationIdentities.length; i++) {
        const pi = pil.permutationIdentities[i];
        let isThis = false;
        let prefix
        for (j=0; j<pi.f.length; j++) {
            if (pi.f[j] == expId) {
                isThis = true;
                prefix = "f="+j;
            }
        }
        for (j=0; j<pi.t.length; j++) {
            if (pi.t[j] == expId) {
                isThis = true;
                prefix = "t="+j;
            }
        }
        if (pi.selfF === expId) {
            isThis = true;
            prefix = "selF"+j;
        }
        if (pi.selfT === expId) {
            isThis = true;
            prefix = "selF"+j;
        }
        if (isThis) {
            return `${pi.fileName}:${pi.line} ${prefix}`;
        }
    }
    for (let i=0; i<pil.connectionIdentities.length; i++) {
        const ci = pil.connectionIdentities[i];
        let isThis = false;
        let prefix
        for (j=0; j<ci.pols.length; j++) {
            if (ci.pols[j] == expId) {
                isThis = true;
                prefix = "pols="+j;
            }
        }
        for (j=0; j<ci.connections.length; j++) {
            if (ci.connections[j] == expId) {
                isThis = true;
                prefix = "connections="+j;
            }
        }
        if (isThis) {
            return `${pi.fileName}:${pi.line} ${prefix}`;
        }
    }
    return "Orphaned Expression: "+ expId;
}

function buildLinearCode(ctx, loopPos) {
    let expAndExpPrims;
    if (loopPos == "i" || loopPos == "last") {
        expAndExpPrims = getExpAndExpPrimes();
    } else {
        expAndExpPrims = {}
    }

    const res = [];
    for (let i=0; i<ctx.code.length; i++) {
        if (expAndExpPrims[i]) {
            if (((loopPos == "i")&&(!ctx.code[i].prime)) ||
                (loopPos == "last")) continue;
        }
        for (let j=0; j< ctx.code[i].code.length; j++) {
            res.push(ctx.code[i].code[j]);
        }
    }

    return res;

    function getExpAndExpPrimes() {
        const calcExps = {};

        for (let i=0; i<ctx.code.length; i++) {
            const mask =  ctx.code[i].prime ? 2 : 1;
            calcExps[ctx.code[i].expId] = (calcExps[ctx.code[i].expId] || 0) | mask;
        }

        const res = {};
        Object.entries(calcExps).forEach(
            ([key, value]) => {
                calcExps[key] = value == 3;
            }
        );

        return res;
    }
}


function buildCode(ctx) {
    res = {};
    res.first = buildLinearCode(ctx, "first");
    res.i = buildLinearCode(ctx, "i");
    res.last = buildLinearCode(ctx, "last");
    ctx.code = [];
    return res;
}

function getTreePos(res, type, id) {
    if (type == "cm") {
        if (id < res.nCm1) {
            return ["tree1", id];
        } else if (id < res.nCm1 + res.nCm2) {
            return ["tree2", id - res.nCm1];
        } else if (id < res.nCm1 + res.nCm2 + res.nCm3) {
            return ["tree3", id - res.nCm1 - res.nCm2];
        } else {
            throw new Error("Invalid tree pos: "+type+ " " + id);
        }
    } else if (type == "q") {
        if (id < res.nQ1) {
            return ["tree1", res.nCm1 + id];
        } else if (id < res.nQ1 + res.nQ2) {
            return ["tree2", res.nCm2 + id - res.nQ1];
        } else if (id < res.nQ1 + res.nQ2 + res.nQ3) {
            return ["tree3", res.nCm3 + id - res.nQ1 - res.nQ2];
        } else if (id < res.nQ1 + res.nQ2 + res.nQ3 + res.nQ4 ) {
            return ["tree4", res.nCm4 + id - res.nQ1 - res.nQ2 - res.nQ3];
        } else {
            throw new Error("Invalid tree pos: "+type+ " " + id);
        }
    } else if (type = "const") {
        if (id < res.nConst) {
            return ["const", id];
        } else {
            throw new Error("Invalid tree pos: "+type+ " " + id);
        }
    } else {
        throw new Error("Invalid tree pos");
    }
}



