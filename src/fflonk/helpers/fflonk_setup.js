const {BigBuffer, getCurveFromR} = require("ffjavascript");
const {log2} = require("pilcom/src/utils");
const {setup, Polynomial, commit} = require("shplonkjs");


module.exports.fflonkSetup = async function (pil, cnstPols, ptauFile, options) {
    const logger = options.logger;

    const curve = options.curve;

    if(logger) logger.info("Starting fflonk setup");
    //Find the max PIL polynomial degree
    const cnstPolsDefs = [];
    const cmPolsDefs = [];
    let maxPilPolDeg = 0;
    for (const polRef in pil.references) {
        const polInfo = pil.references[polRef];
        const name = polRef;
        if(polInfo.type === 'constP') {
            if(polInfo.isArray) {
                for(let i = 0; i < polInfo.len; ++i) {
                    cnstPolsDefs.push({name: name + i, stage: 0, degree: polInfo.polDeg})
                }
            } else {
                cnstPolsDefs.push({name, stage: 0, degree: polInfo.polDeg})
            }
        } 
        
        if(polInfo.type === 'cmP') {
            if(polInfo.isArray) {
                for(let i = 0; i < polInfo.len; ++i) {
                    cmPolsDefs.push({name: name + i, stage: 1, degree: polInfo.polDeg})
                }
            } else {
                cmPolsDefs.push({name, stage: 1, degree: polInfo.polDeg})
            }
        }

        maxPilPolDeg = Math.max(maxPilPolDeg, pil.references[polRef].polDeg);
    }

    const pilPower = log2(maxPilPolDeg - 1) + 1;
    const domainSize = 2 ** pilPower;

    const polsXi = [...cnstPolsDefs, ...cmPolsDefs]; 

    // Get all polynomials p'(x) referenced in any expression
    const primePols = getPrimePolynomials(pil.expressions);

    const polsWXi = [];

    for (let i = 0; i < primePols.length; i++) {
        const reference = findPolynomialByTypeId(primePols[i].op + "P", primePols[i].id);
        const name = reference + (primePols[i].id - pil.references[reference].id);
        const stage = pil.references[reference].type === "cmP" ? 1 : 0;
        polsWXi.push({name, stage, degree: pil.references[reference].polDeg});
    }

    for(let i = 0; i < pil.plookupIdentities.length; ++i) {
        polsXi.push({name: `Plookup.H1_${i}`, stage: 2, degree: domainSize})
        polsXi.push({name: `Plookup.H2_${i}`, stage: 2, degree: domainSize})
        polsXi.push({name: `Plookup.Z${i}`, stage: 3, degree: domainSize})
    }


    for(let i = 0; i < pil.permutationIdentities.length; ++i) {
        polsXi.push({name: `Permutation.Z${i}`, stage:3, degree: domainSize})
    }

    for(let i = 0; i < pil.connectionIdentities.length; ++i) {
        polsXi.push({name: `Connection.Z${i}`, stage: 3, degree: domainSize})
    }

    // TODO: ADD CONSTRAINT POLYNOMIALS

    const polDefs = [polsXi];

    if(polsWXi.length > 0) polDefs.push(polsWXi);
    
    const config = {
        power: pilPower, 
        polDefs,
        extraMuls: options.extraMuls || 0,
        openBy: "openingPoints"
    }

    const {zkey, PTau} = await setup(config, curve, ptauFile, logger);

    const ctx = {};
    for (let i = 0; i < cnstPols.$$nPols; i++) {
        let name = cnstPols.$$defArray[i].name;
        if(cnstPols.$$defArray[i].idx >= 0) name += cnstPols.$$defArray[i].idx;
        const cnstPolBuffer = cnstPols.$$array[i];

        if (logger) {
            logger.info(`Preparing ${name} polynomial`);
        }

        let polEvalBuff = new BigBuffer(cnstPolBuffer.length * curve.Fr.n8);
        for (let i = 0; i < cnstPolBuffer.length; i++) {
            polEvalBuff.set(curve.Fr.e(cnstPolBuffer[i]), i * curve.Fr.n8);
        }
        ctx[name] = await Polynomial.fromEvaluations(polEvalBuff, curve, logger);
    }

    const commits = await commit(0, zkey, ctx, PTau, curve, logger);
    for(let j = 0; j < commits.length; ++j) {
        zkey[`f${commits[j].index}`] = commits[j].commit;
        ctx[`f${commits[j].index}`] = commits[j].pol;
    }
     
    if(logger) logger.info("Fflonk setup finished");

    return zkey;

    function findPolynomialByTypeId(type, id) {
        for (const polName in pil.references) {
            if (pil.references[polName].type === type) {
                if(pil.references[polName].isArray) {
                    if(id >= pil.references[polName].id && id < (pil.references[polName].id + pil.references[polName].len)) {
                        return polName;
                    }
                } else if(pil.references[polName].id === id) {
                    return polName;
                }
            } 
        }
    }

    function getPrimePolynomials(exp) {
        if (Array.isArray(exp)) {
            let primePolynomials = [];
            for (let i = 0; i < exp.length; i++) {
                const primePols = getPrimePolynomials(exp[i]);
                const newPrimePols = primePols.filter(p => !primePolynomials.map(pi => pi.id).includes(p.id));
                primePolynomials = primePolynomials.concat(newPrimePols);
            }
            return primePolynomials;
        } else if (exp.hasOwnProperty("values")) {
            return getPrimePolynomials(exp.values);
        } else {
            if (exp.next && ("const" === exp.op || "cm" === exp.op)) {
                return [exp];
            }
            return [];
        }
    }    
}