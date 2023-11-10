module.exports.execute = async function (pols) {
    const N = pols.f[0].length;

    for (let i = 0; i < N; i++) {
        for (let j = 0; j < 2; j++) {
            pols.t[j][i] = BigInt(i);
        }
    }

    for (let i = 0; i < N; i++) {
        for (let j = 0; j < pols.f.length; j = j + 2) {
            const ranpos = Math.floor(Math.random() * N);
            pols.f[j][i] = pols.t[0][ranpos];
            pols.f[j+1][i] = pols.t[1][ranpos];
        }
    }
};
