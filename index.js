const FGL = require("./src/helpers/f3g.js");

module.exports.FGL = new FGL();
module.exports.starkSetup = require("./src/stark/stark_setup.js");
module.exports.starkGen = require("./src/stark/stark_gen.js");
module.exports.starkVerify = require("./src/stark/stark_verify.js");

module.exports.r1cs2plonk = require("./src/r1cs2plonk");

module.exports.proofGen = require("./src/prover/prover.js");
module.exports.pilInfo = require("./src/pil_info/pil_info.js");

module.exports.fflonkSetup = require("./src/fflonk/helpers/fflonk_setup.js");
module.exports.fflonkProve = require("./src/fflonk/helpers/fflonk_prover.js");
module.exports.fflonkVerify = require("./src/fflonk/helpers/fflonk_verify.js");
module.exports.fflonkVerificationKey = require("./src/fflonk/helpers/fflonk_verification_key.js");
module.exports.fflonkCHelpers = require("./src/fflonk/chelpers/fflonk_chelpers.js");
module.exports.exportFflonkCalldata = require("./src/fflonk/solidity/exportFflonkCalldata.js");
module.exports.exportPilFflonkVerifier = require("./src/fflonk/solidity/exportPilFflonkVerifier.js");
module.exports.readPilFflonkZkeyFile = require("./src/fflonk/zkey/zkey_pilfflonk.js").readPilFflonkZkeyFile;