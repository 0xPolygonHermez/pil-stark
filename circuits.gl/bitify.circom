pragma circom 2.0.4;

template Num2Bits(n) {
    signal input in;
    signal output out[n];
    var lc1=0;

    var e2=1;
    for (var i = 0; i<n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] -1 ) === 0;
        lc1 += out[i] * e2;
        e2 = e2+e2;
    }

    lc1 === in;
}

/*
cm cl sm sl   res
0  0  0  0      0
      0  1      1
      1  0      1
      1  1      1        sm + sl - sm*sl

0  1  0  0     -1
      0  1      0
      1  0      1
      1  1      1        -1 + sl + 2*sm - sm*sl

1  0  0  0     -1
      0  1     -1
      1  0      0
      1  1      1        sm*sl -1  +sm

1  1  0  0     -1
      0  1     -1
      1  0     -1
      1  1      0        sm*sl -1

*/

template CompConstant(ct) {
    signal input in[64];
    signal output out;

    signal parts[32];
    signal sout;

    var clsb;
    var cmsb;
    var sl;
    var sm;

    signal sum[32];

    var e = 1;
    var i;

    for (i=0;i<32; i++) {
        clsb = (ct >> (i*2)) & 1;
        cmsb = (ct >> (i*2+1)) & 1;
        sl = in[i*2];
        sm = in[i*2+1];

        if ((cmsb==0)&&(clsb==0)) {
            parts[i] <== sm*e + sl*e -sm*sl*e;
        } else if ((cmsb==0)&&(clsb==1)) {
            parts[i] <== -e + e*sl + e*2*sm - e*sm*sl;
        } else if ((cmsb==1)&&(clsb==0)) {
            parts[i] <== e*sm*sl -e  +e*sm;
        } else {
            parts[i] <== e*sm*sl -e;
        }

        if (i==0) {
            sum[i] <== (1<<32)-1 + parts[i];
        } else {
            sum[i] <== sum[i-1] + parts[i];
        }

        e = e*2;
    }

    component num2bits = Num2Bits(33);

    num2bits.in <== sum[31];

    out <== num2bits.out[32];
}


template AliasCheck() {

    signal input in[64];

    component  compConstant = CompConstant(-1);

    for (var i=0; i<64; i++) in[i] ==> compConstant.in[i];

    compConstant.out === 0;
}

template Num2Bits_strict() {
    signal input in;
    signal output out[64];

    component aliasCheck = AliasCheck();
    component n2b = Num2Bits(64);
    in ==> n2b.in;

    for (var i=0; i<64; i++) {
        n2b.out[i] ==> out[i];
        n2b.out[i] ==> aliasCheck.in[i];
    }
}

template Bits2Num(n) {
    signal input in[n];
    signal output out;
    var lc1=0;

    var e2 = 1;
    for (var i = 0; i<n; i++) {
        lc1 += in[i] * e2;
        e2 = e2 + e2;
    }

    lc1 ==> out;
}

template Bits2Num_strict() {
    signal input in[64];
    signal output out;

    component aliasCheck = AliasCheck();
    component b2n = Bits2Num(64);

    for (var i=0; i<64; i++) {
        in[i] ==> b2n.in[i];
        in[i] ==> aliasCheck.in[i];
    }

    b2n.out ==> out;
}