
const ExpressionOps = require("../../helpers/expressionops");

module.exports.generatePublicsPolynomials = function generatePublicsPolynomials(expressions, publicsInfo) {
    const E = new ExpressionOps();

    const publics = [];
    for (let i=0; i<publicsInfo.length; i++) {
        let expId;
        if (publicsInfo[i].polType == "cmP") {
            expId = expressions.findIndex(e => e.op === "cm" && e.id === publicsInfo[i].polId);
            if(expId === -1) {
                const cm = E.cm(publicsInfo[i].polId);
                cm.stage = 1;
                expressions.push(cm);
                expId = expressions.length-1;
            }  
        } else {
            expId = publicsInfo[i].polId;
        }
        
        expressions[expId].dim = 1;
        publics.push({name: publicsInfo[i].name, id: publicsInfo[i].id, expId, idx: publicsInfo[i].idx});
    }
    return publics;
}
