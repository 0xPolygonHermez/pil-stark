pragma circom 2.1.0;
pragma custom_templates;

template custom Num2Bytes(nBits) {
    var nBytes = (nBits + 15)\16;
    signal input in;
    signal output out[nBytes];

    var lc1=0;
    var e2=1;
    
    var b = 0;
    var e = 1;
    for(var i =0; i < nBits; i++) {
        b += ((in >> i) & 1) * e;
        e = e+e;
        if(i%16 == 15) {
            out[i\16] <-- b; 
            lc1 += b * e2;
            e2 = e2*65536;
            b = 0;
            e = 1;
        }
    }

    if(nBits%16 != 0) {
        out[nBytes - 1] <-- b;
        lc1 += b; 
    }
    
    assert(lc1 == in);
}