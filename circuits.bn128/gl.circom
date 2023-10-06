pragma circom 2.1.0;

include "bitify.circom";
include "lessthangl.circom";

template GLNorm(norm) {
    assert(norm == 0 || norm == 1);
    
    signal input in;
    signal output out;

    var p=0xFFFFFFFF00000001;

    
    signal k;

     if(norm) {
        k <-- in \ p;
        k * (k - 1) === 0;
        out <== in - k*p;   
    } else {
        k <-- (in + 16*p)\p;
        _ <== Num2Bits(10)(k);
        out <== (in + 16*p) - k*p;   
    }

    
    LessThanGoldilocks()(out);
}

template GLCNorm(norm) {
    assert(norm == 0 || norm == 1);

    signal input in[3];
    signal output out[3];


    for (var i=0; i<3; i++) {
        out[i] <== GLNorm(norm)(in[i]);
    }
}

template GLAdd(norm) {
    assert(norm == 0 || norm == 1);

    signal input ina;
    signal input inb;
    signal output out;

    if(norm) {
        out <== GLNorm(norm)(ina + inb);
    } else {
        out <== ina + inb;
    }
}

template GLSub(norm) {
    assert(norm == 0 || norm == 1);

    signal input ina;
    signal input inb;
    signal output out;

    var p=0xFFFFFFFF00000001;

    if(norm) {
        out <== GLNorm(norm)(ina - inb + p);
    } else {
        out <== ina - inb + p;
    }
}

template GLMul(norm) {
    signal input ina;
    signal input inb;
    signal output out;

    var p=0xFFFFFFFF00000001;

    signal k;
    signal m;

    if (norm) {
        m <== ina*inb;
    } else {
        m <== (ina + 16*p)*(inb + 16*p);
    }

    k <-- m\p;
    out <== m-k*p;

    LessThanGoldilocks()(out);

    if (norm) {
        _ <== Num2Bits(65)(k);
    } else {
        _ <== Num2Bits(80)(k);
    }
}

template GLCAdd(norm) {
    assert(norm == 0 || norm == 1);

    signal input ina[3];
    signal input inb[3];
    signal output out[3];

    for(var i = 0; i < 3; i++) {
        out[i] <== GLAdd(norm)(ina[i], inb[i]);
    }
}

template GLCSub(norm) {
    assert(norm == 0 || norm == 1);

    signal input ina[3];
    signal input inb[3];
    signal output out[3];

    var p=0xFFFFFFFF00000001;

    for(var i = 0; i < 3; i++) {
        out[i] <== GLSub(norm)(ina[i], inb[i]);
    }
    
}

template GLCMul(norm) {
    assert(norm == 0 || norm == 1);

    signal input ina[3];
    signal input inb[3];
    signal output out[3];

    var p=0xFFFFFFFF00000001;

    signal A,B,C,D,E,F;
    signal m[3];

    if(norm) {
        A <== (ina[0] + ina[1])  * (inb[0] + inb[1]);
        B <== (ina[0] + ina[2])  * (inb[0] + inb[2]);
        C <== (ina[1] + ina[2])  * (inb[1] + inb[2]);
        D <== ina[0] * inb[0];
        E <== ina[1] * inb[1];
        F <== ina[2] * inb[2];
        m[0] <== C+D-E-F + 2*p;
        m[1] <== A+C-E-E-D + 3*p;
        m[2] <== B+E-D + p;
    } else {
        A <== ((ina[0]+16*p) + (ina[1]+16*p))  * ((inb[0]+16*p) + (inb[1]+16*p));
        B <== ((ina[0]+16*p) + (ina[2]+16*p))  * ((inb[0]+16*p) + (inb[2]+16*p));
        C <== ((ina[1]+16*p) + (ina[2]+16*p))  * ((inb[1]+16*p) + (inb[2]+16*p));
        D <== (ina[0]+16*p) * (inb[0]+16*p);
        E <== (ina[1]+16*p) * (inb[1]+16*p);
        F <== (ina[2]+16*p) * (inb[2]+16*p);
        m[0] <== C+D-E-F;
        m[1] <== A+C-E-E-D;
        m[2] <== B+E-D;
    }

    signal k[3];

    k[0] <-- m[0] \ p;
    k[1] <-- m[1] \ p;
    k[2] <-- m[2] \ p;

    out[0] <== m[0] - k[0]*p;
    out[1] <== m[1] - k[1]*p;
    out[2] <== m[2] - k[2]*p;

    for (var i = 0; i<3; i++) {
        LessThanGoldilocks()(out[i]);
    }

    if(norm) {
        for (var i = 0; i<3; i++) {
            _ <== Num2Bits(69)(k[i]);
        }
    } else {
        for (var i = 0; i<3; i++) {
            _ <== Num2Bits(80)(k[i]);
        }
    }
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

template GLInv(norm) {
    assert(norm == 0 || norm == 1);

    signal input in;
    signal output out;

    out <-- _inv1(in);

    signal check <== GLMul(norm)(in, out);
    check === 1;
}


template GLCInv(norm) {
    assert(norm == 0 || norm == 1);

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

    var i1 = (-aa -ac-ac +bc + bb - cc);
    while (i1 <0) i1 = i1 + p;
    i1 = i1*tinv % p;

    var i2 = (ba -cc);
    while (i2<0) i2 = i2 + p;
    i2 = i2*tinv % p;

    var i3 =  (-bb +ac + cc);
    while (i3 <0) i3 = i3 + p;
    i3 = i3*tinv % p;

    out[0] <--  i1;
    out[1] <--  i2;
    out[2] <--  i3;

    signal check[3] <== GLCMul(norm)(in, out);
    check === [1,0,0];

}
