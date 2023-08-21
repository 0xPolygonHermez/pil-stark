module.exports.expressionError = function expressionError(pil, strErr, e1, e2, warn) {
    let str  = strErr;
    if (typeof e1 !== "undefined")  {
        str = str + "\n" + getExpressionInfo(pil, e1);
    }
    if (typeof e2 !== "undefined") {
        str = str + "\n" + getExpressionInfo(pil, e2);
    }

    if(warn) {
        console.log("WARNING: " + str);
    } else {
        throw new Error(str);
    }
}

function getExpressionInfo(pil, expId) {
    for (let i=0; i<pil.polIdentities.length; i++) {
        const pi = pil.polIdentities[i];
        if (pi.e == expId) {
            return `${pi.fileName}:${pi.line}`;
        }
    }
    for (let i=0; i<pil.plookupIdentities.length; i++) {
        const pi = pil.plookupIdentities[i];
        let isThis = false;
        let prefix
        for (j=0; j<pi.f.length; j++) {
            if (pi.f[j] == expId) {
                isThis = true;
                prefix = "f="+j;
            }
        }
        for (j=0; j<pi.t.length; j++) {
            if (pi.t[j] == expId) {
                isThis = true;
                prefix = "t="+j;
            }
        }
        if (pi.selfF === expId) {
            isThis = true;
            prefix = "selF"+j;
        }
        if (pi.selfT === expId) {
            isThis = true;
            prefix = "selF"+j;
        }
        if (isThis) {
            return `${pi.fileName}:${pi.line} ${prefix}`;
        }
    }
    for (let i=0; i<pil.permutationIdentities.length; i++) {
        const pi = pil.permutationIdentities[i];
        let isThis = false;
        let prefix
        for (j=0; j<pi.f.length; j++) {
            if (pi.f[j] == expId) {
                isThis = true;
                prefix = "f="+j;
            }
        }
        for (j=0; j<pi.t.length; j++) {
            if (pi.t[j] == expId) {
                isThis = true;
                prefix = "t="+j;
            }
        }
        if (pi.selfF === expId) {
            isThis = true;
            prefix = "selF"+j;
        }
        if (pi.selfT === expId) {
            isThis = true;
            prefix = "selF"+j;
        }
        if (isThis) {
            return `${pi.fileName}:${pi.line} ${prefix}`;
        }
    }
    for (let i=0; i<pil.connectionIdentities.length; i++) {
        const ci = pil.connectionIdentities[i];
        let isThis = false;
        let prefix
        for (j=0; j<ci.pols.length; j++) {
            if (ci.pols[j] == expId) {
                isThis = true;
                prefix = "pols="+j;
            }
        }
        for (j=0; j<ci.connections.length; j++) {
            if (ci.connections[j] == expId) {
                isThis = true;
                prefix = "connections="+j;
            }
        }
        if (isThis) {
            return `${pi.fileName}:${pi.line} ${prefix}`;
        }
    }
    return "Orphaned Expression: "+ expId;
}