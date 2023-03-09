pragma circom 2.1.0;

template Main() {
    signal input a;
    signal input b;
    signal output out;

    signal s1, s2;

    s1 <== a*a + a + b + 1;
    s2 <== b*b - a -b -1;

    out <== s1*s2;
}

component main = Main();