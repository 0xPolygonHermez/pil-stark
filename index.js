const FGL = require("./src/helpers/f3g.js");

module.exports.FGL = new FGL();
module.exports.starkSetup = require("./src/stark/stark_setup.js");
module.exports.starkGen = require("./src/stark/stark_gen.js");
module.exports.starkVerify = require("./src/stark/stark_verify.js");
module.exports.starkInfo = require("./src/stark/stark_info.js");

module.exports.r1cs2plonk = require("./src/r1cs2plonk");
