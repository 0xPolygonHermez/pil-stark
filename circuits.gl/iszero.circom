pragma circom 2.1.0;

/*
    Check if a value is zero or not. Used in recursive2
*/
template IsZero() {
    signal input in;
    signal output out;

    signal inv;

    inv <-- in!=0 ? 1/in : 0;

    out <== -in*inv +1;
    in*out === 0;
}