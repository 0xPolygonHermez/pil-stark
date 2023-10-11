pragma circom 2.1.0;
include "bitify.circom";

template LessThanGoldilocks() {
    var n = 64;
    var p = 0xFFFFFFFF00000001;
    signal input in;
    signal output {maxNum} out;
    
    component n2b = Num2Bits(n+1);

    n2b.in <== in + (1<<n) - p;

    signal lessThan <== 1-n2b.out[n];
    lessThan === 1;

     _ <== n2b.out;

    out.maxNum = p - 1;
    out <== in;
}
