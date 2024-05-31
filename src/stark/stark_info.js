const { generatePilCode } = require("../pil_info/generatePilCode");
const { addIntermediatePolynomials, calculateIntermediatePolynomials } = require("../pil_info/imPolsCalculation/imPolynomials");
const { preparePil } = require("../pil_info/preparePil");

const map = require("../pil_info/map");
const F3g = require("../helpers/f3g");

module.exports = function starkInfoGen(pil, starkStruct, options) {
    const F = new F3g();

    const infoPil = preparePil(F, pil, starkStruct, options);

    const expressions = infoPil.expressions;

    const res = infoPil.res;
 
    let newExpressions;
    let maxDeg = (1 << (res.starkStruct.nBitsExt- res.starkStruct.nBits)) + 1;
    const imInfo = calculateIntermediatePolynomials(expressions, res.cExpId, maxDeg, res.qDim);
    addIntermediatePolynomials(res, expressions, imInfo.imExps, imInfo.qDeg);
    newExpressions = imInfo.newExpressions;
    
    generatePilCode(res, pil, newExpressions);

    map(res, newExpressions);

    console.log("--------------------- POLINOMIALS INFO ---------------------")
    console.log(`Columns stage 1: ${res.nCm1} -> Columns in the basefield: ${res.mapSectionsN.cm1_2ns}`);
    console.log(`Columns stage 2: ${res.nCm2} -> Columns in the basefield: ${res.mapSectionsN.cm2_2ns}`);
    console.log(`Columns stage 3: ${res.nCm3} (${res.nImPols} intermediate polinomials) -> Columns in the basefield: ${res.mapSectionsN.cm3_2ns}`);
    console.log(`Columns stage 4: ${res.nCm4} -> Columns in the basefield: ${res.mapSectionsN.cm4_2ns}`);
    console.log(`Total Columns: ${res.nCm1 + res.nCm2 + res.nCm3 + res.nCm4} -> Total Columns in the basefield: ${res.mapSectionsN.cm1_2ns + res.mapSectionsN.cm2_2ns + res.mapSectionsN.cm3_2ns + res.mapSectionsN.cm4_2ns}`);
    console.log(`Total Constraints: ${res.nConstraints}`)
    console.log(`Number of evaluations: ${res.evMap.length}`)
    console.log("------------------------------------------------------------")
            
    return res;

}




