const F3g = require("../helpers/f3g.js");
const linearSystemSolver = require('./system_solver');

module.exports.polMulAxi = function polMulAxi(F, p, init, acc) {
    let r = init;
    for (let i=0; i<p.length; i++) {
        p[i] = F.mul(p[i], r);
        r = F.mul(r, acc);
    }
}

module.exports.evalPol = function evalPol(F, p, x) {
    if (p.length == 0) return F.zero;
    let res = p[p.length-1];
    for (let i=p.length-2; i>=0; i--) {
        res = F.add(F.mul(res, x), p[i]);
    }
    return res;
}

module.exports.extendPol = function extendPol(F, p, extendBits) {
    extendBits = extendBits || 1;
    let res = new Array(p.length);
    for (let i=0; i<p.length; i++) {
        res[i] = F.e(p[i]);
    }
    res = F.ifft(res);
    module.exports.polMulAxi(F, res, F.one, F.shift);
    for (let i=p.length; i<(p.length<<extendBits); i++) res[i] = F.zero;
    res = F.fft(res);
    return res;
}

module.exports.buildZhInv = function buildZhInv(F, Nbits, extendBits, _offset) {
    const offset = _offset || 0;
    const ZHInv = [];
    let w = F.one;
    let sn= F.shift;
    for (i=0; i<Nbits; i++) sn = F.square(sn);
    for (let i=0; i<(1 << extendBits); i++) {
        ZHInv[i] =F.inv(F.sub(F.mul(sn, w), F.one));
        w = F.mul(w, F.w[extendBits])
    }
    return function (i) {
        return ZHInv[(i + offset) % ZHInv.length];
    }
}


module.exports.calculateH1H2 = function calculateH1H2(F, f, t) {
    const idx_t = {};
    const s = [];
    for (i=0; i<t.length; i++) {
        idx_t[t[i]]=i;
        s.push([t[i], i]);
    }
    for (i=0; i<f.length; i++) {
        const idx = idx_t[f[i]];
        if (isNaN(idx)) {
            throw new Error(`Number not included: ${F.toString(f[i])}`);
        }
        s.push([f[i], idx]);
    }

    s.sort( (a, b) => a[1] - b[1] );

    const h1 = new Array(f.length);
    const h2 = new Array(f.length);
    for (let i=0; i<f.length; i++) {
        h1[i] = s[2*i][0];
        h2[i] = s[2*i+1][0];
    }

    return [h1, h2];
}

module.exports.calculateZ = function(F, num, den) {

    const N = num.length;
    if (N != den.length) throw new Error("Num and Den different sizes");

    const denI = F.batchInverse(den);

    const z = new Array(N);
    z[0] = F.one;
    for (let i=1; i<N; i++) {
        z[i] = F.mul(z[i-1], F.mul(num[i-1], denI[i-1]));
    }
    const checkVal = F.mul(z[N-1], F.mul(num[N-1], denI[N-1]));
    if (!F.eq(checkVal, F.one)) {
        throw new Error("z does not match");
    }

    return z;
}

module.exports.connect = function connect(p1, i1, p2, i2) {
    [p1[i1], p2[i2]] = [p2[i2], p1[i1]];
}

module.exports.minimalPol = function minimalPol(F, z) {
    const z_sq = F.square(z);
    const z_cub = F.mul(z_sq, z);

    let deg = 2;
    for (let i = 0; i < 2; i++) {
        let A = [];
        let b = [];
        if (deg === 2) {
            A = [
                [1n, z[0]],
                [0n, z[1]],
                [0n, z[2]],
            ];
            b = [F.neg(z_sq[0]), F.neg(z_sq[1]), F.neg(z_sq[2])];
        } else if (deg === 3) {
            A = [
                [1n, z[0], z_sq[0]],
                [0n, z[1], z_sq[1]],
                [0n, z[2], z_sq[2]],
            ];
            b = [F.neg(z_cub[0]), F.neg(z_cub[1]), F.neg(z_cub[2])];
        }

        const sol = linearSystemSolver(F, A, b);
        if (sol) {
            const check = F.add(z_cub, F.add(F.mul(z_sq, sol[2]), F.add(F.mul(z, sol[1]), sol[0])));
            if (!F.isZero(check)) throw new Error("The solution is not correct");

            return sol;
        }
        deg++;
    }

    throw new Error("Could not find the minimal polynomial");
}