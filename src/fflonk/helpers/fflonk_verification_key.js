const {utils} = require("ffjavascript");

const {stringifyBigInts} = utils;


module.exports = async function fflonkVerificationKey(zkey, options) {
    const logger = options.logger;

    const curve = zkey.curve;

    let vKey = {
        protocol: zkey.protocol,
        curve: curve.name,
        nPublics: zkey.nPublics,
        maxQDegree: zkey.maxQDegree,
        power: zkey.power,
        powerW: zkey.powerW,
        f: zkey.f,
        w: curve.Fr.toObject(curve.Fr.w[zkey.power]),
        X_2: curve.G2.toObject(zkey.X_2),
    };

    const ws = Object.keys(zkey).filter(k => k.match(/^w\d/));    
    for(let i = 0; i < ws.length; ++i) {
        vKey[ws[i]] = curve.Fr.toObject(zkey[ws[i]]);
    }

    const fs = Object.keys(zkey).filter(k => k.match(/^f\d/));    
    for(let i = 0; i < fs.length; ++i) {
        vKey[fs[i]] = curve.G1.toObject(zkey[fs[i]].commit);
    }

    let index = 0;

    const nStages = Object.keys(zkey.polsNamesStage).length;
    let polsMap = { cm: {}, const: {} };

    for(let i = 0; i < nStages; ++i) {
        for(let j = 0; j < zkey.polsNamesStage[i].length; ++j) {
            if(i === 0) {
                polsMap.const[j] = zkey.polsNamesStage[i][j];
            } else {
                polsMap.cm[index++] = zkey.polsNamesStage[i][j];
            }
        }
    }

    vKey.polsMap = polsMap;
    
    return stringifyBigInts(vKey);
}
