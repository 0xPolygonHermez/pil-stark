pragma circom 2.1.5;


// The templates and functions in this file are general and work for any prime field

/*
*** maxbits(): function that returns the maximum number of bits that we use to represent a number with no overflows in the field
        - Inputs: None
        - Outputs: maximum number of bits that we can use in the field without overflows
        
    
    Example: if we consider the prime p = 11, then maxbits() = 3 as if we consider 4 bits overflows may happen [1, 1, 1, 1] = 15 -> overflows to 4
*/

function maxbits(){
    var n = 1;
    var r = 1;
    while(2 * n > n){
        n = n * 2;
        r = r + 1;
    }
    return r;
}


template AliasCheckT() {

    signal input {binary} in[maxbits() + 1];

    signal compConstant <== CompConstant(-1)(in);
    compConstant === 0;
}

/*
*** Num2Bits(n): template that transforms an input into its binary representation using n bits
        - Inputs: in -> field value
        - Output: out[n] -> binary representation of in using n bits
                            satisfies tag binary
        - Parameter conditions: n <= maxbits() + 1
         
    Example: Num2Bits(3)(7) = [1, 1, 1]
    Note: in case the input in cannot be represented using n bits then the generated system of constraints does not have any solution for that input. 
          For instance, Num2Bits(3)(10) -> no solution
          
*/

template Num2BitsT(n){
    signal input in;
    signal output {binary} out[n];
    
    assert(n <= maxbits() + 1);
    
    var lc1=0;
    var e2=1;
    for (var i = 0; i<n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] -1 ) === 0; // to ensure binary
        lc1 += out[i] * e2;
        e2 = e2+e2;
    }

    lc1 === in; // to ensure that out is the binary representation of in
    
    if (n == maxbits() + 1) { // in this case we need to add extra constraints to ensure uniqueness
        AliasCheckT()(out);        
    }

}

/* 

------> equivalent to Num2Bits(maxbits() + 1)

*** Num2Bits_strict(): template that transforms an input into its binary representation using maxbits() + 1  bits
        - Inputs: in -> field value
        - Output: out[n] -> binary representation of in using maxbits() + 1 bits
                  satisfies tag binary
         
    Example: Assuming p = 11, then Num2Bits_strict()(13) = [0, 1, 0, 0]

*/

template Num2Bits_strictT() {
    signal input in;
    signal output {binary} out[maxbits() + 1];

    out <== Num2BitsT(maxbits() + 1)(in);
    AliasCheckT()(out);
}

/*

*** Bits2Num(n): template that transforms an input of n bits representing a value x in binary into the decimal representation of x
        - Inputs: in[n] -> binary representation of out using n bits
                           satisfies tag binary
        - Output: out -> value represented by the input
                         satisfies tag maxbit with out.maxbit =  n
        - Parameter conditions: n <= maxbits() + 1?
         
    Example: Bits2Num(3)([1, 0, 1]) = 5
          
*/

template Bits2NumT(n) {
    signal input {binary} in[n];
    signal output {maxbit} out;
    var lc1=0;

    var e2 = 1;
    for (var i = 0; i<n; i++) {
        lc1 += in[i] * e2;
        e2 = e2 + e2;
    }

    out.maxbit = n;
    lc1 ==> out;
}

/* 

------> equivalent to Bits2Num(maxbits() + 1)(in)

*** Bits2Num_strict(): template that transforms an input of maxbits() + 1 bits representing a value x in binary into the decimal representation of x
        - Inputs: in[n] -> binary representation of out using maxbits() + 1 bits
                           satisfies tag binary
        - Output: out -> value represented by the input
                         satisfies tag maxbit with out.maxbit =  maxbits() + 1
         
    Example: Assuming p = 11, then Bits2Num_strict()([1, 1, 0, 1]) = 2 (13 mod 11 = 2)

*/

template Bits2Num_strictT() {
    signal input {binary} in[maxbits() + 1];
    signal output {maxbit} out;

    out.maxbit = maxbits() + 1;
    out <== Bits2NumT(maxbits() + 1)(in);
}