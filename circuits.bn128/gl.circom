pragma circom 2.1.0;

include "bitify.circom";
include "lessthangl.circom";
include "utils.circom";

// Given an integer a, computes a % GL
template GLNorm() {
    signal input {maxNum} in;
    signal output {maxNum} out;

    var p=0xFFFFFFFF00000001;

    signal k <-- in\p;
    signal value <== in - k*p;

    var maxQuotientBits = log2((in.maxNum - 1) \ p) + 1;

    _ <== Num2Bits(maxQuotientBits)(k);
    out <== LessThanGoldilocks()(value);
}

template GLCopy() {
    signal input {maxNum} in;
    signal output {maxNum} out;

    out.maxNum = in.maxNum;
    out <== in;
}

// Given two integers a,b, computes a + b
template GLAdd() {
    signal input {maxNum} ina;
    signal input {maxNum} inb;
    signal output {maxNum} out;

    out.maxNum = ina.maxNum + inb.maxNum;
    out <== ina + inb;
}

// Given two integers a,b, computes a - b + GL
template GLSub() {
    signal input {maxNum} ina;
    signal input {maxNum} inb;
    signal output {maxNum} out;

    var p=0xFFFFFFFF00000001;

    var k = (inb.maxNum - 1) \ p + 1;

    out.maxNum = ina.maxNum + k*p;

    out <== ina - inb + k*p;
}

// Given two integers a,b, computes (a·b) % GL
template GLMul() {
    signal input {maxNum} ina;
    signal input {maxNum} inb;
    signal output {maxNum} out;

    var p=0xFFFFFFFF00000001;
    signal k;
    signal m;
        
    m <== ina*inb;

    k <-- m\p;

    signal mul <== m-k*p;

    var maxQuotientBits = log2((ina.maxNum * inb.maxNum - 1) \ p) + 1;


    _ <== Num2Bits(maxQuotientBits)(k);
    out <== LessThan64Bits()(mul);

}

// Given an array of three integers (a₁, a₂, a₃), computes aᵢ % GL for i = 1,2,3
template GLCNorm() {
    signal input {maxNum} in[3];
    signal output {maxNum} out[3];

    for (var i=0; i<3; i++) {
        out[i] <== GLNorm()(in[i]);
    }
}

template GLCCopy() {
    signal input {maxNum} in[3];
    signal output {maxNum} out[3];

    for (var i=0; i<3; i++) {
        out[i] <== GLCopy()(in[i]);
    }
}

template GLCAdd() {
    signal input {maxNum} ina[3];
    signal input {maxNum} inb[3];
    signal output {maxNum} out[3];

    for (var i=0; i<3; i++) {
        out[i] <== GLAdd()(ina[i], inb[i]);
    }
}

// Given two arrays of three integers (a₁, a₂, a₃),(b₁, b₂, b₃), computes aᵢ - bᵢ + GL for i = 1,2,3
template GLCSub() {
    signal input {maxNum} ina[3];
    signal input {maxNum} inb[3];
    signal output {maxNum} out[3];

    for (var i=0; i<3; i++) {
        out[i] <== GLSub()(ina[i], inb[i]);
    }
}

// Given three arrays of three integers a = (a₁, a₂, a₃),b = (b₁, b₂, b₃),c = (c₁, c₂, c₃),
// computes (a·b + c) % GL³ for i = 1,2,3
template GLCMulAdd() {
    signal input {maxNum} ina[3];
    signal input {maxNum} inb[3];
    signal input {maxNum} inc[3];
    signal output {maxNum} out[3];

    var p=0xFFFFFFFF00000001;

    signal A,B,C,D,E,F,G;
    signal m[3];

    A <== (ina[0] + ina[1])  * (inb[0] + inb[1]);
    B <== (ina[0] + ina[2])  * (inb[0] + inb[2]);
    C <== (ina[1] + ina[2])  * (inb[1] + inb[2]);
    D <== ina[0] * inb[0];
    E <== ina[1] * inb[1];
    F <== ina[2] * inb[2];
    G <== D-E;

    m[0] <== C+G-F + inc[0];
    m[1] <== A+C-E-E-D + inc[1];
    m[2] <== B-G + inc[2];

    // m[0] = a1b1 + a1b2 + a2b1 + a2b2 + a0b0 - a1b1 - a2b2 
    //     = a1b2 + a2b1 + a0b0 -> 3*ina.maxNum * inb.maxNum

    // m[1] = a0b0 + a0b1 + a1b0 + a1b1 + a1b1 + a1b2 + a2b1 + a2b2 - a1b1 - a1b1 - a0b0 
    //     = a0b1 + a1b0 + a1b2 + a2b1 + a2b2 -> 5*ina.maxNum * inb.maxNum
    
    // m[2] = a0b0 + a0b2 + a2b0 + a2b2 - a0b0 + a1b1 
    //      = a0b2 + a2b0 + a2b2 + a1b1 -> 4*ina.maxNum * inb.maxNum

    //Since all the elements of the array takes the same tag value, we set as the max value 5*ina.maxNum * inb.maxNum
    var maxQuotientBits = log2((5*ina.maxNum * inb.maxNum + inc.maxNum - 1) \ p) + 1;

    signal k[3];

    k[0] <-- m[0] \ p;
    k[1] <-- m[1] \ p;
    k[2] <-- m[2] \ p;

    signal muladd[3];

    muladd[0] <== m[0] -k[0]*p;
    muladd[1] <== m[1] -k[1]*p;
    muladd[2] <== m[2] -k[2]*p;

    out.maxNum = 0xFFFFFFFFFFFFFFFF;

    for (var i = 0; i<3; i++) {
        _ <== Num2Bits(maxQuotientBits)(k[i]);
        out[i] <== LessThan64Bits()(muladd[i]);
    }
}

// Given two arrays of three integers a = (a₁, a₂, a₃),b = (b₁, b₂, b₃), computes (a·b) % GL³ for i = 1,2,3
template GLCMul() {
    signal input {maxNum} ina[3];
    signal input {maxNum} inb[3];
    signal output {maxNum} out[3];

    signal {maxNum} inc[3];
    inc.maxNum = 0;
    inc <== [0,0,0];

    out <== GLCMulAdd()(ina, inb, inc);
}

// Given an integer a != 0, computes the extended euclidean algorithm of a and GL
// and returns the integer x satisfying a·x + GL·y = 1
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

// Given an integer a != 0, computes a⁻¹ % GL
template GLInv() {
    signal input {maxNum} in;
    signal output {maxNum} out;

    signal inv <-- _inv1(in);

    out <== LessThan64Bits()(inv);

    signal {maxNum} check <== GLMul()(in, out);
    check === 1;
}

// Given an array of three integers a = (a₁, a₂, a₃), computes a⁻¹ % GL³
template GLCInv() {
    signal input {maxNum} in[3];
    signal output {maxNum} out[3];

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

    var i1 = (-aa -ac-ac +bc + bb - cc);
    while (i1 <0) i1 = i1 + p;
    i1 = i1*tinv % p;

    var i2 = (ba -cc);
    while (i2<0) i2 = i2 + p;
    i2 = i2*tinv % p;

    var i3 =  (-bb +ac + cc);
    while (i3 <0) i3 = i3 + p;
    i3 = i3*tinv % p;

    signal inv[3];

    inv[0] <--  i1;
    inv[1] <--  i2;
    inv[2] <--  i3;

    out[0] <== LessThan64Bits()(inv[0]);
    out[1] <== LessThan64Bits()(inv[1]);
    out[2] <== LessThan64Bits()(inv[2]);

    signal check[3] <== GLCMul()(in, out);
    check === [1,0,0];
}
