pragma circom 2.1.0;
pragma custom_templates;

include "cmul.circom";

// Calculate the inverse of an element in Fp³ using (X³ - X - 1) as a irreductible polynomial
// The coefficients of the inverse are calculated beforehand and the resulting expression is explicitly written
// The inverse of a = a + bX + cX² is the following:
// ( (-a² - 2ac + bc + b² + c²) + (ab - c²)X + (-b² + ca + c²)X² ) * 1/(-a³ + ab² - b³ - 2a²c - 3abc - ac² + bc² - c³) 
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
    var aac = aa * in[2];
    var abc = ba * in[2];
    var abb = ba * in[1];
    var acc = ac * in[2];
    var bbb = bb * in[1];
    var bcc = bc * in[2];
    var ccc = cc * in[2];

    var t = -aaa -aac-aac +abc+abc+abc + abb - acc - bbb + bcc - ccc;
    var tinv = 1/t;

    out[0] <--  (-aa -ac-ac +bc + bb - cc)*tinv;
    out[1] <--  (ba -cc)*tinv;
    out[2] <--  (-bb +ac + cc)*tinv;

    signal check[3] <== CMul()(in, out);
    check === [1,0,0];
}
