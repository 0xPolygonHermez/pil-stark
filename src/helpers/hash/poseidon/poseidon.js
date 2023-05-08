// Optimization is taken from https://github.com/filecoin-project/neptune

/*
New Matrix:

Circulant matrix whose first row is [17, 20, 34, 18, 39, 13, 13, 28, 2, 16, 41, 15]
Except that 8 is added to the (0, 0) entry
[64, 4 + 2*I, -4, 4 - 2*I]
[128, -8 - 2*I, -32, -8 + 2*I]
[64, 32 - 2*I, 8, 32 + 2*I]


https://eprint.iacr.org/2020/500.pdf

*/

const F3g = require('../../f3g');
const poseidonConstants = require('./poseidon_constants_opt');

let poseidon;
let isBuilt = false;

function unsringifyConstants(Fr, o) {
    if ((typeof (o) === 'string') && (/^[0-9]+$/.test(o))) {
        return Fr.e(o);
    } if ((typeof (o) === 'string') && (/^0x[0-9a-fA-F]+$/.test(o))) {
        return Fr.e(o);
    } if (Array.isArray(o)) {
        return o.map(unsringifyConstants.bind(null, Fr));
    } if (typeof o === 'object') {
        if (o === null) return null;
        const res = {};
        const keys = Object.keys(o);
        keys.forEach((k) => {
            res[k] = unsringifyConstants(Fr, o[k]);
        });

        return res;
    }

    return o;
}

/**
 * Build poseidon hash function with golden prime
 * @returns {Object} poseidon function
 */
function buildPoseidon() {
    const goldenPrime = (1n << 64n) - (1n << 32n) + 1n;

    const F = new F3g();

    const opt = unsringifyConstants(F, poseidonConstants);

    const pow7 = (a) => F.mul(a, F.square(F.mul(a, F.square(a, a))));

    poseidon = function (inputs, capacity, nOuts) {
        nOuts = nOuts || 4;
        if (inputs.length !== 8) throw new Error('Invalid Input size (must be 8)');

        let state;

        if (capacity) {
            if (capacity.length !== 4) throw new Error('Invalid Capacity size (must be 4)');
            state = [...inputs.map((a) => F.e(a)), ...capacity.map((a) => F.e(a))];
        } else {
            state = [...inputs.map((a) => F.e(a)), F.zero, F.zero, F.zero, F.zero];
        }

        const t = 12;
        const nRoundsF = 8;
        const nRoundsP = 22;
        const {
            C, S, M, P,
        } = opt;

        state = state.map((a, i) => F.add(a, C[i]));

        for (let r = 0; r < nRoundsF / 2 - 1; r++) {
            state = state.map((a) => pow7(a));
            state = state.map((a, i) => F.add(a, C[(r + 1) * t + i]));
            // eslint-disable-next-line no-loop-func
            state = state.map((_, i) => state.reduce((acc, a, j) => F.add(acc, F.mul(M[j][i], a)), F.zero));
        }
        state = state.map((a) => pow7(a));
        state = state.map((a, i) => F.add(a, C[(nRoundsF / 2 - 1 + 1) * t + i]));
        state = state.map((_, i) => state.reduce((acc, a, j) => F.add(acc, F.mul(P[j][i], a)), F.zero));
        for (let r = 0; r < nRoundsP; r++) {
            state[0] = pow7(state[0]);
            state[0] = F.add(state[0], C[(nRoundsF / 2 + 1) * t + r]);

            const s0 = state.reduce((acc, a, j) => F.add(acc, F.mul(S[(t * 2 - 1) * r + j], a)), F.zero);
            for (let k = 1; k < t; k++) {
                state[k] = F.add(state[k], F.mul(state[0], S[(t * 2 - 1) * r + t + k - 1]));
            }
            state[0] = s0;
        }
        for (let r = 0; r < nRoundsF / 2 - 1; r++) {
            state = state.map((a) => pow7(a));
            state = state.map((a, i) => F.add(a, C[(nRoundsF / 2 + 1) * t + nRoundsP + r * t + i]));
            // eslint-disable-next-line no-loop-func
            state = state.map((_, i) => state.reduce((acc, a, j) => F.add(acc, F.mul(M[j][i], a)), F.zero));
        }
        state = state.map((a) => pow7(a));
        state = state.map((_, i) => state.reduce((acc, a, j) => F.add(acc, F.mul(M[j][i], a)), F.zero));

        return state.slice(0, nOuts);
    };

    poseidon.F = F;

    return poseidon;
}

/**
 * singleton to build poseidon once
 * @returns {Object} - poseidon hash function
 */
function getPoseidon() {
    if (isBuilt === false) {
        poseidon = buildPoseidon();
        isBuilt = true;
    }

    return poseidon;
}

module.exports = getPoseidon;
