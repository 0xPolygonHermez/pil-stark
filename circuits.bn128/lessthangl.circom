pragma circom 2.1.0;

include "bitifyT.circom";

// Given an integer a, checks whether a < GL
template LessThanGoldilocks() {
    var n = 64;
    var p = 0xFFFFFFFF00000001;
    signal input in;
    signal output {maxNum} out;
    
    _ <== Num2BitsT(n)(in); // We discard the invalid solutions

    signal {binary} n2b[n+1] <== Num2BitsT(n+1)(in + (1<<n) - p);

    signal {binary} lessThan <== 1-n2b[n];
    lessThan === 1;

     _ <== n2b;

    out.maxNum = p - 1;
    out <== in;
}

template LessThan64Bits() {
    signal input in;
    signal output {maxNum} out;

    _ <== Num2BitsT(64)(in);
    
    out.maxNum = 0xFFFFFFFFFFFFFFFF;
    out <== in;
}