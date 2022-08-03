const FGL = require("./src/f3g");


module.exports.FGL = new FGL();
module.exports.starkSetup = require("./src/stark_setup.js");
module.exports.starkGen = require("./src/stark_gen.js");
module.exports.starkVerify = require("./src/stark_verify.js");