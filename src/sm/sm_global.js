
module.exports.buildConstants = async function (pols, polsDef) {
    const N = Number(polsDef.L1.polDeg);

    for ( let i=0; i<N; i++) {
        pols.L1.push(i == 0);
    }

}