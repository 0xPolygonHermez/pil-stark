pragma circom 2.0.4;
include "../node_modules/circomlib/circuits/bitify.circom";


template GLMul() {
    signal input ina;
    signal input inb;
    signal output out;

    var p=0xFFFFFFFF00000001;
    signal k;
    signal m;

    m <== ina*inb;

    k <-- m\p;
    out <-- m-k*p;

    component n2bK = Num2Bits(70);
    component n2bO = Num2Bits(64);

    n2bK.in <== k;
    n2bO.in <== out;

    ina*inb === k*p + out;
}

template GLMulAdd() {
    signal input ina;
    signal input inb;
    signal input inc;
    signal output out;

    var p=0xFFFFFFFF00000001;
    signal k;
    signal m;

    m <== ina*inb + inc;

    k <-- m\p;
    out <-- m-k*p;

    component n2bK = Num2Bits(70);
    component n2bO = Num2Bits(64);

    n2bK.in <== k;
    n2bO.in <== out;

    m === k*p + out;
}


template GLCMul() {
    signal input ina[3];
    signal input inb[3];
    signal output out[3];

    var p=0xFFFFFFFF00000001;

    signal A,B,C,D,E,F,G;
    signal m[3];

    A <== (ina[0] + ina[1])  * (inb[0] + inb[1]);
    B <== (ina[0] + ina[2])  * (inb[0] + inb[2]);
    C <== (ina[1] + ina[2])  * (inb[1] + inb[2]);
    D <== ina[0]*inb[0];
    E <== ina[1]*inb[1];
    F <== ina[2]*inb[2];
    G <== D-E;
    m[0] <== C+G-F;
    m[1] <== A+C-E-E-D;
    m[2] <== B-G;

    signal k[3];

    k[0] <-- m[0] \ p;
    k[1] <-- m[1] \ p;
    k[2] <-- m[2] \ p;

    out[0] <-- m[0] -k[0]*p;
    out[1] <-- m[1] -k[1]*p;
    out[2] <-- m[2] -k[2]*p;


    component n2bK0 = Num2Bits(70);
    component n2bK1 = Num2Bits(70);
    component n2bK2 = Num2Bits(70);

    component n2bO0 = Num2Bits(64);
    component n2bO1 = Num2Bits(64);
    component n2bO2 = Num2Bits(64);

    n2bK0.in <== k[0];
    n2bK1.in <== k[1];
    n2bK2.in <== k[2];

    n2bO0.in <== out[0];
    n2bO1.in <== out[1];
    n2bO2.in <== out[2];

    m[0]  === k[0]*p + out[0];
    m[1]  === k[1]*p + out[1];
    m[2]  === k[2]*p + out[2];

}


template GLCMulAdd() {
    signal input ina[3];
    signal input inb[3];
    signal input inc[3];
    signal output out[3];

    var p=0xFFFFFFFF00000001;

    signal A,B,C,D,E,F,G;
    signal m[3];

    A <== (ina[0] + ina[1])  * (inb[0] + inb[1]);
    B <== (ina[0] + ina[2])  * (inb[0] + inb[2]);
    C <== (ina[1] + ina[2])  * (inb[1] + inb[2]);
    D <== ina[0]*inb[0];
    E <== ina[1]*inb[1];
    F <== ina[2]*inb[2];
    G <== D-E;
    m[0] <== C+G-F + inc[0];
    m[1] <== A+C-E-E-D + inc[1];
    m[2] <== B-G + inc[2];

    signal k[3];

    k[0] <-- m[0] \ p;
    k[1] <-- m[1] \ p;
    k[2] <-- m[2] \ p;

    out[0] <-- m[0] -k[0]*p;
    out[1] <-- m[1] -k[1]*p;
    out[2] <-- m[2] -k[2]*p;


    component n2bK0 = Num2Bits(70);
    component n2bK1 = Num2Bits(70);
    component n2bK2 = Num2Bits(70);

    component n2bO0 = Num2Bits(64);
    component n2bO1 = Num2Bits(64);
    component n2bO2 = Num2Bits(64);

    n2bK0.in <== k[0];
    n2bK1.in <== k[1];
    n2bK2.in <== k[2];

    n2bO0.in <== out[0];
    n2bO1.in <== out[1];
    n2bO2.in <== out[2];

    m[0]  === k[0]*p + out[0];
    m[1]  === k[1]*p + out[1];
    m[2]  === k[2]*p + out[2];

}


function _inv1(a) {
    assert(a!=0);
    var p = 0xFFFFFFFF00000001;
    var t = 0;
    var r = p;
    var newt = 1;
    var newr = a % p;
    while (newr) {
        var q = r \ newr;
        var aux1 = newt;
        var aux2 = t-q*newt;
        t = aux1;
        newt = aux2;
        aux1 = newr;
        aux2 = r-q*newr;
        r = aux1;
        newr = aux2;
    }
    if (t<0) t += p;
    return t;
}

template GLInv() {
    signal input in;
    signal output out;

    out <-- _inv1(in);

    component check = GLMul();

    check.ina <== in;
    check.inb <== out;

    check.out === 1;

    // Check that the output is 64 bits TODO: May bi it's not required

    component n2bO = Num2Bits(64);

    n2bO.in <== out;

}


template GLCInv() {
    signal input in[3];
    signal output out[3];

    var p = 0xFFFFFFFF00000001;

    var aa = (in[0] * in[0]) % p;
    var ac = (in[0] * in[2]) % p;
    var ba = (in[1] * in[0]) % p;
    var bb = (in[1] * in[1]) % p;
    var bc = (in[1] * in[2]) % p;
    var cc = (in[2] * in[2]) % p;

    var aaa = (aa * in[0]) % p;
    var aac = (aa * in[2]) % p;
    var abc = (ba * in[2]) % p;
    var abb = (ba * in[1]) % p;
    var acc = (ac * in[2]) % p;
    var bbb = (bb * in[1]) % p;
    var bcc = (bc * in[2]) % p;
    var ccc = (cc * in[2]) % p;

    var t = (-aaa -aac-aac +abc+abc+abc + abb - acc - bbb + bcc - ccc);
    while (t<0) t = t + p;
    t = t % p;
    var tinv = _inv1(t);

    var i1 = ((-aa -ac-ac +bc + bb - cc)*tinv) % p;
    if (i1 <0) i1 = i1 + p;
    var i2 = ((ba -cc)*tinv) % p;
    if (i2 <0) i2 = i2 + p;
    var i3 =  ((-bb +ac + cc)*tinv) % p;
    if (i3 <0) i3 = i3 + p;

    out[0] <--  i1;
    out[1] <--  i2;
    out[2] <--  i3;

    component check = GLCMul();
    check.ina[0] <== in[0];
    check.ina[1] <== in[1];
    check.ina[2] <== in[2];
    check.inb[0] <== out[0];
    check.inb[1] <== out[1];
    check.inb[2] <== out[2];
    check.out[0] === 1;
    check.out[1] === 0;
    check.out[2] === 0;

    // Check that the output is 64 bits TODO: May bi it's not required

    component n2bO0 = Num2Bits(64);
    component n2bO1 = Num2Bits(64);
    component n2bO2 = Num2Bits(64);

    n2bO0.in <== out[0];
    n2bO1.in <== out[1];
    n2bO2.in <== out[2];
}
