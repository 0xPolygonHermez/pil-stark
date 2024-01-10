const { assert } = require("chai");

module.exports.getIdMaps = function getIdMaps(maxid, ID1D, ID3D, code) {

    let Ini1D = new Array(maxid).fill(-1);
    let End1D = new Array(maxid).fill(-1);

    let Ini3D = new Array(maxid).fill(-1);
    let End3D = new Array(maxid).fill(-1);


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
    subsets1D = temporalsSubsets(segments1D);
    subsets3D = temporalsSubsets(segments3D);
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
    segments.sort((a, b, key) => a[1] - b[1]);
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
    const [start1, end1, key1] = segment1;
    const [start2, end2, key2] = segment2;
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