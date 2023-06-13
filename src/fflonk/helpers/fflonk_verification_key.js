const {utils} = require("ffjavascript");
const { readPilFflonkZkeyFile } = require("../zkey/zkey_pilfflonk");

const {stringifyBigInts} = utils;


module.exports = async function fflonkVerificationKey(zkey, options) {
    const logger = options.logger;

    const curve = zkey.curve;

    let vKey = {
        protocol: zkey.protocol,
        curve: curve.name,
        nPublics: zkey.nPublics,
        power: zkey.power,
        polsMap: zkey.polsMap,
        f: zkey.f,
        k1: curve.Fr.toObject(zkey.k1),
        k2: curve.Fr.toObject(zkey.k2),
        w: curve.Fr.toObject(curve.Fr.w[zkey.power]),
        X_2: curve.G2.toObject(zkey.X_2),
    };

    const ws = Object.keys(zkey).filter(k => k.match(/^w\d/));    
    for(let i = 0; i < ws.length; ++i) {
        vKey[ws[i]] = curve.Fr.toObject(zkey[ws[i]]);
    }

    const fs = Object.keys(zkey).filter(k => k.match(/^f\d/));    
    for(let i = 0; i < fs.length; ++i) {
        vKey[fs[i]] = curve.G1.toObject(zkey[fs[i]]);
    }
    
    return stringifyBigInts(vKey);
}
