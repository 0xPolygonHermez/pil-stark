pragma circom 2.1.0;
pragma custom_templates;

include "aliascheck.circom";

template custom RangeCheck() {
    signal input b;
    
    assert(b * (b - 1) == 0);
}

template CustomNum2Bits(nBits) {
    signal input in;
    signal output out[nBits];

    var lc1=0;
    var e2=1;
    
    for(var i =0; i < nBits; i++) {
        out[i] <-- (in >> i) & 1;
        RangeCheck()(out[i]);
        lc1 += out[i] * e2;
        e2 += e2;
    }
    
    assert(lc1 == in);
}

template CustomNum2Bits_strict() {
    signal input in;
    signal output out[254];

    out <== CustomNum2Bits(254)(in);
    AliasCheck()(out);
    
}

template CustomNum2Bits(nBits) {
    signal input in;

    var lc1=0;
    var e2=1;
    
    signal b[nBits];
    component check[nBits];
    for(var i =0; i < nBits; i++) {
        b[i] <-- (in >> i) & 1;
        check[i] = RangeCheck();
        check[i].b <== b[i];
        lc1 += b[i] * e2;
        e2 += e2;
    }
    
    assert(lc1 == in);
}