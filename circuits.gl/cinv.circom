pragma circom 2.0.4;
pragma custom_templates;

include "cmul.circom";

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

    component check = CMul();
    check.ina[0] <== in[0];
    check.ina[1] <== in[1];
    check.ina[2] <== in[2];
    check.inb[0] <== out[0];
    check.inb[1] <== out[1];
    check.inb[2] <== out[2];
    check.out[0] === 1;
    check.out[1] === 0;
    check.out[2] === 0;
}