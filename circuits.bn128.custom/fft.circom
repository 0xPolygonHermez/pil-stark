pragma circom 2.1.0;
pragma custom_templates;

include "gl.circom";
include "bitify.circom";
include "rangecheck.circom";


function roots(i) {
    var roots[33] = [
        1,
        18446744069414584320,
        281474976710656,
        16777216,
        4096,
        64,
        8,
        2198989700608,
        4404853092538523347,
        6434636298004421797,
        4255134452441852017,
        9113133275150391358,
        4355325209153869931,
        4308460244895131701,
        7126024226993609386,
        1873558160482552414,
        8167150655112846419,
        5718075921287398682,
        3411401055030829696,
        8982441859486529725,
        1971462654193939361,
        6553637399136210105,
        8124823329697072476,
        5936499541590631774,
        2709866199236980323,
        8877499657461974390,
        3757607247483852735,
        4969973714567017225,
        2147253751702802259,
        2530564950562219707,
        1905180297017055339,
        3524815499551269279,
        7277203076849721926
    ];
    return roots[i];
}

function invroots(i) {
    var invroots[33] = [
        1,
        18446744069414584320,
        18446462594437873665,
        1099511627520,
        68719476736,
        18446744069414322177,
        18302628881338728449,
        18442240469787213841,
        2117504431143841456,
        4459017075746761332,
        4295002282146690441,
        8548973421900915981,
        11164456749895610016,
        3968367389790187850,
        4654242210262998966,
        1553425662128427817,
        7868944258580147481,
        14744321562856667967,
        2513567076326282710,
        5089696809409609209,
        17260140776825220475,
        11898519751787946856,
        15307271466853436433,
        5456584715443070302,
        1219213613525454263,
        13843946492009319323,
        16884827967813875098,
        10516896061424301529,
        4514835231089717636,
        16488041148801377373,
        16303955383020744715,
        10790884855407511297,
        8554224884056360729
    ];
    return invroots[i];
}

template FFT(nBits, inv) {

    var p = 0xFFFFFFFF00000001;
    var N = 1<<nBits;

    signal input in[N][3];
    signal output out[N][3];

    signal k[N][3];

    var w;
    var ws[N];
    if (inv) {
        w = invroots(nBits);
        ws[0] = _inv1(N);
    } else {
        w = roots(nBits);
        ws[0] = 1;
    }
    for (var i=1; i<N; i++) {
        ws[i] = ( ws[i-1] * w ) % p;
    }

    var sum[N][3];
    for (var i=0; i<N; i++) {
        for (var e=0; e<3; e++) {
            sum[i][e] = 0;
            for (var j=0; j<N; j++) {
                sum[i][e] = sum[i][e] + ws[(i*j)%N]* in[j][e];
            }
        }
    }

    for (var i=0; i<N; i++) {
        for (var e=0; e<3; e++) {
            k[i][e] <-- sum[i][e] \ p;
            out[i][e] <-- sum[i][e] % p;

            k[i][e]*p + out[i][e] === sum[i][e];

            _ <== CustomNum2Bits(64)(out[i][e]);
            _ <== CustomNum2Bits(64 + nBits + 1)(k[i][e]);
        }
    }
}
