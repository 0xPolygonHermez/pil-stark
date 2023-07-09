pragma circom 2.1.0;

template CompConstant64(ct) {
    signal input in[64];
    signal output out;

    signal parts[32];

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

    signal num2bits[33] <== Num2Bits(33)(sum[31]);
    
    _ <== num2bits;

    out <== num2bits[32];
}
