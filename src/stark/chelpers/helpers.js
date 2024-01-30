const { assert } = require("chai");

module.exports.getIdMaps = function getIdMaps(maxid, ID1D, ID3D, code) {

    let Ini1D = new Array(maxid).fill(-1);
    let End1D = new Array(maxid).fill(-1);

    let Ini3D = new Array(maxid).fill(-1);
    let End3D = new Array(maxid).fill(-1);

    // Explore all the code to find the first and last appearance of each tmp
    for (let j = 0; j < code.length; j++) {
        const r = code[j];
        if (r.dest.type == 'tmp') {

            let id_ = r.dest.id;
            let dim_ = r.dest.dim;
            assert(id_ >= 0 && id_ < maxid);

            if (dim_ == 1) {
                if (Ini1D[id_] == -1) {
                    Ini1D[id_] = j;
                    End1D[id_] = j;
                } else {
                    End1D[id_] = j;
                }
            } else {
                assert(dim_ == 3);
                if (Ini3D[id_] == -1) {
                    Ini3D[id_] = j;
                    End3D[id_] = j;
                } else {
                    End3D[id_] = j;
                }
            }
        }
        for (k = 0; k < r.src.length; k++) {
            if (r.src[k].type == 'tmp') {

                let id_ = r.src[k].id;
                let dim_ = r.src[k].dim;
                assert(id_ >= 0 && id_ < maxid);

                if (dim_ == 1) {
                    if (Ini1D[id_] == -1) {
                        Ini1D[id_] = j;
                        End1D[id_] = j;
                    } else {
                        End1D[id_] = j;
                    }
                } else {
                    assert(dim_ == 3);
                    if (Ini3D[id_] == -1) {
                        Ini3D[id_] = j;
                        End3D[id_] = j;
                    } else {
                        End3D[id_] = j;
                    }
                }
            }
        }
    }

    // Store, for each temporal ID, its first and last appearance in the following form: [first, last, id]
    const segments1D = [];
    const segments3D = [];
    for (let j = 0; j < maxid; j++) {
        if (Ini1D[j] >= 0) {
            segments1D.push([Ini1D[j], End1D[j], j])
        }
        if (Ini3D[j] >= 0) {
            segments3D.push([Ini3D[j], End3D[j], j])
        }
    }

    // Create subsets of non-intersecting segments for basefield and extended field temporal variables
    subsets1D = temporalsSubsets(segments1D);
    subsets3D = temporalsSubsets(segments3D);

    // Assign unique numerical IDs to subsets of segments representing 1D and 3D temporal variables
    let count1d = 0;
    for (s of subsets1D) {
        for (a of s) {
            ID1D[a[2]] = count1d;
        }
        ++count1d;
    }
    let count3d = 0;
    for (s of subsets3D) {
        for (a of s) {
            ID3D[a[2]] = count3d;
        }
        ++count3d;
    }
    console.log(`Number of tmp1: ${count1d}`);
    console.log(`Number of tmp3: ${count3d}`);
    return { count1d, count3d };
}

function temporalsSubsets(segments) {
    segments.sort((a, b) => a[1] - b[1]);
    const result = [];
    for (const s of segments) {
        let inserted = false;
        for (a of result) {
            if (!isIntersecting(s, a[a.length - 1])) {
                a.push(s);
                inserted = true;
                break;
            }
        }
        if (!inserted) {
            result.push([s]);
        }
    }
    return result;
}

function isIntersecting(segment1, segment2) {
    const [start1, end1] = segment1;
    const [start2, end2] = segment2;
    return start2 <= end1 && start1 <= end2;
}

module.exports.findPatterns = function findPatterns(array, minRepetitions = 50, minReducedOperations = 500) {
    const slidingWindow = [];
    const patterns = {};
    let i = 0;
    while (i < array.length) {
        while(slidingWindow.length < 2) {
            if(i%1000 === 0) console.log("Checking repetitions..." + i + " out of " + array.length);
            slidingWindow.push(array[i++]);
        }

        let repetitions = countRepetitions(array, slidingWindow);
        if(repetitions >= minRepetitions && repetitions*(slidingWindow.length - 1) >= minReducedOperations && slidingWindow.length <= 10) {
            patterns[JSON.stringify(slidingWindow)] = repetitions;
            if(i%1000 === 0) console.log("Checking repetitions..." + i + " out of " + array.length);
            slidingWindow.push(array[i++]);
        } else {
            slidingWindow.shift();
        }
    }

    const sortedPatterns = Object.entries(patterns).sort((a, b) => b[1]*(JSON.parse(b[0]).length - 1) - a[1]*(JSON.parse(a[0]).length - 1));
    const patternsSelected = [];
    for (const [pattern, count] of sortedPatterns) {
        if(!isPatternSelected(patternsSelected, JSON.parse(pattern))) patternsSelected.push(JSON.parse(pattern));
        // console.log(`Sequence ${pattern} has occurred ${count} times.`);
    }
    return patternsSelected;
}

function countRepetitions(arr, pattern) {
    let slidingWindow = [];
    let count = 0;

    let stringifiedPattern = JSON.stringify(pattern);

    for (const element of arr) {
        slidingWindow.push(element);

        if (slidingWindow.length === pattern.length) {
            if (JSON.stringify(slidingWindow) === stringifiedPattern) {
                count++;
                slidingWindow = [];
            } else {
                slidingWindow.shift();
            }
        }
    }

    return count;
}

function isPatternSelected(patternsSelected, newPattern) {
    for (let i = 0; i < patternsSelected.length; i++) {
        let bigArray = newPattern.length <= patternsSelected[i].length ? patternsSelected[i] : newPattern;
        let subArray = newPattern.length <= patternsSelected[i].length ? newPattern : patternsSelected[i];
        
        for (let j = 0; j <= bigArray.length - subArray.length; j++) {

            if(areCircularPermutations(bigArray, subArray)) return true;
            
            let match = true;
            for (let k = 0; k < subArray.length; k++) {
                if (subArray[k] !== bigArray[j + k]) {
                    match = false;
                    break;
                }
            }

            if (match) {
                return true; // newPattern is a subarray respecting the order of patternsSelected[i]
            }
        }
    }
    return false;
}

function areCircularPermutations(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;

    const n = arr1.length;

    for (let startIndex = 0; startIndex < n; startIndex++) {
        let isCircularPermutation = true;

        for (let i = 0; i < n; i++) {
            if (arr1[i] !== arr2[(startIndex + i) % n]) {
                isCircularPermutation = false;
                break;
            }
        }

        if (isCircularPermutation) {
            return true;
        }
    }

    return false;
}

module.exports.compileCode = function compileCode(functionName, starkInfo, code, dom, ret) {
    const body = [];

    const nBits = starkInfo.starkStruct.nBits;
    const nBitsExt = starkInfo.starkStruct.nBitsExt;


    const next = (dom == "n" ? 1 : 1 << (nBitsExt - nBits)).toString();
    const N = (dom == "n" ? (1 << nBits) : (1 << nBitsExt)).toString();

    for (let j = 0; j < code.length; j++) {
        const src = [];
        const r = code[j];
        for (k = 0; k < r.src.length; k++) {
            src.push(getRef(r.src[k]));
        }
        let lexp = getLRef(r);
        switch (r.op) {
            case 'add': {
                if (r.dest.dim == 1) {
                    if (((r.src[0].dim != 1) || r.src[1].dim != 1)) {
                        throw new Error("Invalid dimension")
                    }
                    body.push(`      Goldilocks::add(${lexp}, ${src[0]}, ${src[1]});`)
                } else if (r.dest.dim == 3) {
                    if (((r.src[0].dim == 1) || r.src[1].dim == 3)) {
                        body.push(`      Goldilocks3::add(${lexp}, ${src[0]}, ${src[1]});`)
                    } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                        body.push(`      Goldilocks3::add(${lexp}, ${src[1]}, ${src[0]});`)
                    } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                        body.push(`      Goldilocks3::add(${lexp}, ${src[0]}, ${src[1]});`)
                    } else {
                        throw new Error("Invalid dimension")
                    }
                } else {
                    throw new Error("Invalid dim");
                }
                break;
            }
            case 'sub': {
                if (r.dest.dim == 1) {
                    if (((r.src[0].dim != 1) || r.src[1].dim != 1)) {
                        throw new Error("Invalid dimension")
                    }
                    body.push(`      Goldilocks::sub(${lexp}, ${src[0]}, ${src[1]});`)
                } else if (r.dest.dim == 3) {
                    if (((r.src[0].dim == 1) || r.src[1].dim == 3)) {
                        body.push(`      Goldilocks3::sub(${lexp}, ${src[0]}, ${src[1]});`)
                    } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                        body.push(`      Goldilocks3::sub(${lexp}, ${src[0]}, ${src[1]});`)
                    } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                        body.push(`      Goldilocks3::sub(${lexp}, ${src[0]}, ${src[1]});`)
                    } else {
                        throw new Error("Invalid dimension")
                    }
                } else {
                    throw new Error("Invalid dim");
                }
                break;
            }
            case 'mul': {
                if (r.dest.dim == 1) {
                    if (((r.src[0].dim != 1) || r.src[1].dim != 1)) {
                        throw new Error("Invalid dimension")
                    }
                    body.push(`      Goldilocks::mul(${lexp}, ${src[0]}, ${src[1]});`)
                } else if (r.dest.dim == 3) {
                    if (((r.src[0].dim == 1) || r.src[1].dim == 3)) {
                        body.push(`      Goldilocks3::mul(${lexp}, ${src[0]}, ${src[1]});`)
                    } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                        body.push(`      Goldilocks3::mul(${lexp}, ${src[1]}, ${src[0]});`)
                    } else if (((r.src[0].dim == 3) || r.src[1].dim == 1)) {
                        body.push(`      Goldilocks3::mul(${lexp}, ${src[0]}, ${src[1]});`)
                    } else {
                        throw new Error("Invalid dimension")
                    }
                } else {
                    throw new Error("Invalid dim");
                }
                break;
            }
            case 'copy': {
                if (r.dest.dim == 1) {
                    if (r.src[0].dim != 1) {
                        throw new Error("Invalid dimension")
                    }
                    body.push(`      Goldilocks::copy(${lexp}, ${src[0]});`)
                } else if (r.dest.dim == 3) {
                    if (r.src[0].dim == 1) {
                        body.push(`      Goldilocks3::copy(${lexp}, ${src[0]});`)
                    } else if (r.src[0].dim == 3) {
                        body.push(`      Goldilocks3::copy(${lexp}, ${src[0]});`)
                    } else {
                        throw new Error("Invalid dimension")
                    }
                } else {
                    throw new Error("Invalid dim");
                }
                break;
            }
            default: throw new Error("Invalid op:" + c[j].op);
        }


    }

    if (ret) {
        body.push(`     return ${getRef(code[code.length - 1].dest)};`);
    }

    let res;
    if (ret) {
        res = [
            `#include "chelpers_steps.hpp"\n`,
            `Goldilocks::Element ${functionName}(StepsParams &params, uint64_t N) {`,
            "#pragma omp parallel for",
            "   for (uint64_t i = 0; i < N; i++) {",
            `${body.join('\n')}`,
            `   }`,
            `}`
        ].join("\n");
    } else {
        res = [
            `#include "chelpers_steps.hpp"\n`,
            `void ${functionName}(StepsParams &params, uint64_t N) {`,
            "#pragma omp parallel for",
            "   for (uint64_t i = 0; i < N; i++) {",
            `${body.join('\n')}`,
            `   }`,
            `}`
        ].join("\n");
    }

    return res;

    function getRef(r) {
        switch (r.type) {
            case "tmp": return `tmp_${r.id}`;
            case "const": {
                if (dom == "n") {
                    if (r.prime) {
                        return ` params.pConstPols->getElement(${r.id},(i+1)%${N})`;
                    } else {
                        return ` params.pConstPols->getElement(${r.id},i)`;
                    }
                } else if (dom == "2ns") {
                    if (r.prime) {
                        return `params.pConstPols2ns->getElement(${r.id},(i+${next})%${N})`;
                    } else {
                        return `params.pConstPols2ns->getElement(${r.id},i)`;
                    }
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "tmpExp": {
                if (dom == "n") {
                    return evalMap(starkInfo.tmpExp_n[r.id], r.prime)
                } else if (dom == "2ns") {
                    throw new Error("Invalid dom");
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "cm": {
                if (dom == "n") {
                    return evalMap(starkInfo.cm_n[r.id], r.prime)
                } else if (dom == "2ns") {
                    return evalMap(starkInfo.cm_2ns[r.id], r.prime)
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "q": {
                if (dom == "n") {
                    throw new Error("Accessing q in domain n");
                } else if (dom == "2ns") {
                    return evalMap(starkInfo.qs[r.id], r.prime)
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "number": return `Goldilocks::fromU64(${BigInt(r.value).toString()}ULL)`;
            case "public": return `params.publicInputs[${r.id}]`;
            case "challenge": return `(Goldilocks3::Element &)*params.challenges[${r.id}]`;
            case "eval": return `(Goldilocks3::Element &)*params.evals[${r.id}]`;
            case "xDivXSubXi": return `(Goldilocks3::Element &)*params.xDivXSubXi[i]`;
            case "xDivXSubWXi": return `(Goldilocks3::Element &)*params.xDivXSubWXi[i]`;
            case "x": {
                if (dom == "n") {
                    return `(Goldilocks::Element &)*params.x_n[i]`;
                } else if (dom == "2ns") {
                    return `(Goldilocks::Element &)*params.x_2ns[i]`;
                } else {
                    throw new Error("Invalid dom");
                }
            }
            case "Zi": return `params.zi.zhInv(i)`;
            default: throw new Error("Invalid reference type get: " + r.type);
        }
    }

    function getLRef(r) {
        let eDst;
        switch (r.dest.type) {
            case "tmp": {
                if (r.dest.dim == 1) {
                    body.push(`      Goldilocks::Element tmp_${r.dest.id};`);
                } else if (r.dest.dim == 3) {
                    body.push(`      Goldilocks3::Element tmp_${r.dest.id};`);
                } else {
                    throw new Error("Invalid dim");
                }
                eDst = `tmp_${r.dest.id}`;
                break;
            }
            case "q": {
                if (dom == "n") {
                    throw new Error("Accessing q in domain n");
                } else if (dom == "2ns") {
                    eDst = `(Goldilocks3::Element &)(params.q_2ns[i * 3])`
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            }
            case "cm": {
                if (dom == "n") {
                    eDst = evalMap(starkInfo.cm_n[r.dest.id], r.dest.prime)
                } else if (dom == "2ns") {
                    eDst = evalMap(starkInfo.cm_2ns[r.dest.id], r.dest.prime)
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            }
            case "tmpExp": {
                if (dom == "n") {
                    eDst = evalMap(starkInfo.tmpExp_n[r.dest.id], r.dest.prime)
                } else if (dom == "2ns") {
                    throw new Error("Invalid dom");
                } else {
                    throw new Error("Invalid dom");
                }
                break;
            }
            case "f": {
                if (dom == "n") {
                    throw new Error("Accessing q in domain n");
                } else if (dom == "2ns") {
                    eDst = `(Goldilocks3::Element &)(params.f_2ns[i * 3])`
                } else {
                    throw new Error("Invalid dom");
                }
            }
                break;
            default: throw new Error("Invalid reference type set: " + r.dest.type);
        }
        return eDst;
    }

    function evalMap(polId, prime) {
        let p = starkInfo.varPolMap[polId];
        if (!p) {
            console.log("xx");
        }
        let offset = starkInfo.mapOffsets[p.section];
        offset += p.sectionPos;
        let size = starkInfo.mapSectionsN[p.section];
        if (p.dim == 1) {
            if (prime) {
                return `params.pols[${offset} + ((i + ${next})%${N})*${size}]`;
            } else {
                return `params.pols[${offset} + i*${size}]`;
            }
        } else if (p.dim == 3) {
            if (prime) {
                return `(Goldilocks3::Element &)(params.pols[${offset} + ((i + ${next})%${N})*${size}])`;
            } else {
                return `(Goldilocks3::Element &)(params.pols[${offset} + i*${size}])`;
            }
        } else {
            throw new Error("invalid dim");
        }
    }

}