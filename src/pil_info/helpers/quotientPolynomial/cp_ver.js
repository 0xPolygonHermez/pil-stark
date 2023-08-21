const {pilCodeGen, buildCode} = require("../../codegen.js");
const { iterateCode } = require("../helpers.js");

module.exports  = function generateConstraintPolynomialVerifier(res, ctx, stark) {
    ctx.calculated[0] = {};
    ctx.calculated[1] = {};
       
    for(let i = 0; i < Object.keys(res.imPolsMap).length; i++) {
        const expId = Object.keys(res.imPolsMap)[i];
        if(res.imPolsMap[expId].imPol) {
            ctx.calculated[0][expId] = true;
            ctx.calculated[1][expId] = true;
        }
    }

    pilCodeGen(ctx, res.cExp, 0, true);

    res.code.qVerifier = buildCode(ctx);

    res.evMap = [];

    iterateCode(res.code.qVerifier, "n", fixRef);

    if (stark) {
        for (let i = 0; i < res.qDeg; i++) {
            const rf = {
                type: "cm",
                id: res.qs[i],
                name: "Q" + i,
                prime: 0,
            };
            res.evMap.push(rf);
        }
    } else {
        let nOpenings = {};
        for(let i = 0; i < res.evMap.length; ++i) {
            if(res.evMap[i].type === "const") continue;
            const name = res.evMap[i].type + res.evMap[i].id;
            if(!nOpenings[name]) nOpenings[name] = 1;
            ++nOpenings[name];
        }   

        res.maxPolsOpenings = Math.max(...Object.values(nOpenings));

        res.nBitsZK = Math.ceil(Math.log2((res.pilPower + res.maxPolsOpenings) / res.pilPower));
    }

    function fixRef(r, ctx) {
        const p = r.prime ? 1 : 0;
        switch (r.type) {
            // Check the expressions ids. If it is an intermediate polynomial
            // modify the type and set it as a commit;
            case "exp":
                if (res.imPolsMap[r.id] && res.imPolsMap[r.id].imPol) {
                    r.type = "cm";
                    r.id = res.imPolsMap[r.id].id;
                } else {
                    if (typeof ctx.expMap[p][r.id] === "undefined") {
                        ctx.expMap[p][r.id] = ctx.code.tmpUsed ++;
                    }
                    r.type= "tmp";
                    r.expId = r.id;
                    r.id= ctx.expMap[p][r.id];
                    break;
                }
            case "cm":
            case "const":
		        let evalIndex = res.evMap.findIndex(e => e.type === r.type && e.id === r.id && e.prime === p);
                if (evalIndex == -1) {
                    const rf = {
                        type: r.type,
                        name: r.type === "cm" ? res.cmPolsMap[r.id].name : res.constPolsMap[r.id].name,
                        id: r.id,
                        prime: p
                    };
                    res.evMap.push(rf);
                    evalIndex = res.evMap.length - 1;
                }
                delete r.prime;
                r.id = evalIndex;
                r.type = "eval";
                break;
            case "number":
            case "challenge":
            case "public":
            case "tmp":
            case "Z":
            case "x":
            case "eval":
                    break;
            default:
                throw new Error("Invalid reference type: "+r.type);
        }
    }
}
