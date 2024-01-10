module.exports.findPatterns = function findPatterns(array, minRepetitions = 500) {
    const slidingWindow = [];
    const patterns = {};
  
    console.log("\n");

    let i = 0;
    while (i < array.length) {
        while(slidingWindow.length < 2) {
            if(i%1000 === 0) console.log("Checking repetitions..." + i + " out of " + array.length);
            slidingWindow.push(array[i++]);
        }

        let repetitions = countRepetitions(array, slidingWindow);
        if(repetitions*(slidingWindow.length - 1) > minRepetitions && slidingWindow.length <= 10) {
            patterns[JSON.stringify(slidingWindow)] = repetitions;
            if(i%1000 === 0) console.log("Checking repetitions..." + i + " out of " + array.length);
            slidingWindow.push(array[i++]);
        } else {
            slidingWindow.shift();
        }
    }

    const sortedPatterns = Object.entries(patterns).filter(p => p[1] > 1).sort((a, b) => b[1]*(JSON.parse(b[0]).length - 1) - a[1]*(JSON.parse(a[0]).length - 1));
    const patternsSelected = [];
    for (const [pattern, count] of sortedPatterns) {
        if(!isPatternSelected(patternsSelected, JSON.parse(pattern))) patternsSelected.push(JSON.parse(pattern));
        console.log(`Sequence ${pattern} has occurred ${count} times.`);
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