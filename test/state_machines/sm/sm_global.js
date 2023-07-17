
module.exports.buildConstants = async function (N, pols) {
    for ( let i=0; i<N; i++) {
        pols.L1[i] = (i == 0)? 1n : 0n;
    }

}