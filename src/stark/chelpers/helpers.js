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
    const tmpSubsets = [];
    for (const segment of segments) {
        let closestSubset = null;
        let minDistance = Infinity;
        for (const subset of tmpSubsets) {
            const lastSegmentSubset = subset[subset.length - 1];
            if(isIntersecting(segment, lastSegmentSubset)) continue;

            const distance = Math.abs(lastSegmentSubset[1] - segment[0]);
            if(distance < minDistance){
                minDistance = distance;
                closestSubset = subset;
            }
        }

        if(closestSubset) {
            closestSubset.push(segment);
        } else {
            tmpSubsets.push([segment]);
        }
    }
    return tmpSubsets;
}

function isIntersecting(segment1, segment2) {
    const [start1, end1] = segment1;
    const [start2, end2] = segment2;
    return start2 < end1 && start1 < end2;
}

module.exports.findPatterns = function findPatterns(array, operations, maxLength = 16, minReducedOperations = 400) {
    const slidingWindow = [];
    const patterns = {};
    let i = 0;
    while (i < array.length) {
        while(slidingWindow.length < 2) {
            if(i%1000 === 0) console.log("Checking repetitions..." + i + " out of " + array.length);
            slidingWindow.push(array[i++]);
        }

        if(slidingWindow.length > maxLength) {
            slidingWindow.shift();
        } else {
            let reducedOps = countReducedOps(array, slidingWindow);
            if(reducedOps >= minReducedOperations) {
                patterns[slidingWindow.join(", ")] = reducedOps;
                if(i%1000 === 0) console.log("Checking repetitions..." + i + " out of " + array.length);
                slidingWindow.push(array[i++]);
            } else {
                slidingWindow.shift();
            }
        }
    }

    const sortedPatterns = Object.entries(patterns).sort((a, b) => b[1] - a[1]);

    let patternOps = [];
    
    let counter;
    for (const [pattern, count] of sortedPatterns) {
        const sequence = pattern.split(", ").map(v => parseInt(v));
        let reductionApplied = countReducedOps(array, sequence);
        if(reductionApplied > minReducedOperations) {
            let patternAdded = operations.find(op => op.isGroupOps && areArraysEqual(op.ops, sequence));
            if(patternAdded) {
                counter = patternAdded.opIndex;
            } else {
                counter = operations.length;
                operations.push({isGroupOps: true, ops: sequence, opIndex: counter});
            }
            patternOps.push(counter);
            let i = 0;
            while(i < array.length - sequence.length) {
                if(areArraysEqual(array.slice(i, i + sequence.length), sequence)) {
                    array.splice(i, sequence.length, counter);
                }
                i++;
            }
            console.log(`Sequence ${pattern} reduces ${reductionApplied} operations`);
        }
    }

    return patternOps;
}

function countReducedOps(arr, pattern) {
    let count = 0;

    for (let i = 0; i <= arr.length - pattern.length; i++) {
        if (arr[i] === pattern[0]) {
            let match = true;
            for (let j = 1; j < pattern.length; j++) {
                if (arr[i + j] !== pattern[j]) {
                    match = false;
                    break;
                }
            }
            if (match) {
                count++;
                i += pattern.length - 1; // Move to the next position after the pattern
            }
        }
    }

    return count * (pattern.length - 1);
}

function areArraysEqual(arr1, arr2) {
    if(arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}