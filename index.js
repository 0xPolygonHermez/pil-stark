const F3g = require("./src/helpers/f3g");
const { compile, newConstantPolsArray, newCommitPolsArray } = require("pilcom");

module.exports.F3g = new F3g();
module.exports.pil2circom = require("./src/pil2circom.js");
module.exports.starkSetup = require("./src/stark/stark_setup.js");
module.exports.starkGen = require("./src/stark/stark_gen.js");
module.exports.starkVerify = require("./src/stark/stark_verify.js");
module.exports.r1cs2plonk = require("./src/r1cs2plonk");
module.exports.starkInfo = require("./src/stark/stark_info");

module.exports.compile = compile;
module.exports.newCommitPolsArray = newCommitPolsArray;
module.exports.newConstantPolsArray = newConstantPolsArray;