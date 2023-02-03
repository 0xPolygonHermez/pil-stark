/*
    Copyright 2018 0KIMS association.

    This file is part of snarkJS.

    snarkJS is a free software: you can redistribute it and/or modify it
    under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    snarkJS is distributed in the hope that it will be useful, but WITHOUT
    ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
    or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
    License for more details.

    You should have received a copy of the GNU General Public License
    along with snarkJS. If not, see <https://www.gnu.org/licenses/>.
*/

/* global window */
const readline = require("readline");
const Blake2b = require("blake2b-wasm");
const {ChaCha} = require("ffjavascript");


const _revTable = [];
for (let i = 0; i < 256; i++) {
    _revTable[i] = _revSlow(i, 8);
}

function _revSlow(idx, bits) {
    let res = 0;
    let a = idx;
    for (let i = 0; i < bits; i++) {
        res <<= 1;
        res = res | (a & 1);
        a >>= 1;
    }
    return res;
}

module.exports.bitReverse = function (idx, bits) {
    return (
        _revTable[idx >>> 24] |
        (_revTable[(idx >>> 16) & 0xFF] << 8) |
        (_revTable[(idx >>> 8) & 0xFF] << 16) |
        (_revTable[idx & 0xFF] << 24)
    ) >>> (32 - bits);
}

module.exports.formatHash = function (b, title) {
    const a = new DataView(b.buffer, b.byteOffset, b.byteLength);
    let S = "";
    for (let i = 0; i < 4; i++) {
        if (i > 0) S += "\n";
        S += "\t\t";
        for (let j = 0; j < 4; j++) {
            if (j > 0) S += " ";
            S += a.getUint32(i * 16 + j * 4).toString(16).padStart(8, "0");
        }
    }
    if (title) S = title + "\n" + S;
    return S;
}

module.exports.hashIsEqual = function (h1, h2) {
    if (h1.byteLength !== h2.byteLength) return false;

    let dv1 = new Int8Array(h1);
    let dv2 = new Int8Array(h2);

    for (let i = 0; i !== h1.byteLength; i++) {
        if (dv1[i] !== dv2[i]) return false;
    }
    return true;
}

module.exports.cloneHasher = function (h) {
    const ph = h.getPartialHash();
    const res = Blake2b(64);
    res.setPartialHash(ph);
    return res;
}

module.exports.sameRatio = async function (curve, g1s, g1sx, g2s, g2sx) {
    if (curve.G1.isZero(g1s)) return false;
    if (curve.G1.isZero(g1sx)) return false;
    if (curve.G2.isZero(g2s)) return false;
    if (curve.G2.isZero(g2sx)) return false;

    const res = await curve.pairingEq(g1s, g2sx, curve.G1.neg(g1sx), g2s);

    return res;
}


module.exports.askEntropy = function () {
    if (process.browser) {
        return window.prompt("Enter a random text. (Entropy): ", "");
    } else {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question("Enter a random text. (Entropy): ", (input) => resolve(input));
        });
    }
}

module.exports.getRandomRng = async function (entropy) {
    // Generate a random Rng
    while (!entropy) {
        entropy = await askEntropy();
    }
    const hasher = Blake2b(64);
    hasher.update(crypto.randomBytes(64));
    const enc = new TextEncoder(); // always utf-8
    hasher.update(enc.encode(entropy));
    const hash = Buffer.from(hasher.digest());

    const seed = [];
    for (let i = 0; i < 8; i++) {
        seed[i] = hash.readUInt32BE(i * 4);
    }
    const rng = new ChaCha(seed);
    return rng;
}

module.exports.rngFromBeaconParams = function (beaconHash, numIterationsExp) {
    let nIterationsInner;
    let nIterationsOuter;
    if (numIterationsExp < 32) {
        nIterationsInner = (1 << numIterationsExp) >>> 0;
        nIterationsOuter = 1;
    } else {
        nIterationsInner = 0x100000000;
        nIterationsOuter = (1 << (numIterationsExp - 32)) >>> 0;
    }

    let curHash = beaconHash;
    for (let i = 0; i < nIterationsOuter; i++) {
        for (let j = 0; j < nIterationsInner; j++) {
            curHash = crypto.createHash("sha256").update(curHash).digest();
        }
    }

    const curHashV = new DataView(curHash.buffer, curHash.byteOffset, curHash.byteLength);
    const seed = [];
    for (let i = 0; i < 8; i++) {
        seed[i] = curHashV.getUint32(i * 4, false);
    }

    const rng = new ChaCha(seed);

    return rng;
}

module.exports.hex2ByteArray = function (s) {
    if (s instanceof Uint8Array) return s;
    if (s.slice(0, 2) === "0x") s = s.slice(2);
    return new Uint8Array(s.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16);
    }));
}

module.exports.byteArray2hex = function (byteArray) {
    return Array.prototype.map.call(byteArray, function (byte) {
        return ("0" + (byte & 0xFF).toString(16)).slice(-2);
    }).join("");
}

module.exports.stringifyBigIntsWithField = function (Fr, o) {
    if (o instanceof Uint8Array) {
        return Fr.toString(o);
    } else if (Array.isArray(o)) {
        return o.map(stringifyBigIntsWithField.bind(null, Fr));
    } else if (typeof o == "object") {
        const res = {};
        const keys = Object.keys(o);
        keys.forEach((k) => {
            res[k] = stringifyBigIntsWithField(Fr, o[k]);
        });
        return res;
    } else if ((typeof (o) == "bigint") || o.eq !== undefined) {
        return o.toString(10);
    } else {
        return o;
    }
}