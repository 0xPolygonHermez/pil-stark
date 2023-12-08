pragma circom 2.1.0;
pragma custom_templates;

include "cmul.circom";

// Calculate the inverse of an element in Fp³ using (X³ - 2) as a irreductible polynomial
// The coefficients of the inverse are calculated beforehand and the resulting expression is explicitly written
// The inverse of a = a + bX + cX² is the following:
// ( (-a² - 2ac + bc + b² + c²) + (ab - c²)X + (-b² + ca + c²)X² ) * 1/(-a³ + 6*abc - 2*b³ - 4*c³) 
template CInv() {
    signal input in[3];
    signal output out[3];

    var aa = in[0] * in[0];
    var ac = in[0] * in[2];
    var ba = in[1] * in[0];
    var bb = in[1] * in[1];
    var bc = in[1] * in[2];
    var cc = in[2] * in[2];

    var aaa = aa * in[0];
    var bbb = bb * in[1];
    var ccc = cc * in[2];
    var abc = ba * in[2];

    var t = -aaa + 6*abc - 2*bbb - 4*ccc;
    var tinv = 1/t;

    out[0] <--  (-aa + 2*bc)*tinv;
    out[1] <--  (ba - 2*cc)*tinv;
    out[2] <--  (-bb + ac)*tinv;

    signal check[3] <== CMul()(in, out);
    check === [1,0,0];
}
