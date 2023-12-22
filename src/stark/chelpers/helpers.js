module.exports.findPatterns = function findPatterns(array, minRepetitions = 500) {
    const slidingWindow = [];
    const patterns = {};
  
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

    const sortedPatterns = Object.entries(patterns).sort((a, b) => b[1]*(JSON.parse(b[0]).length - 1) - a[1]*(JSON.parse(a[0]).length - 1));
    for (const [pattern, count] of sortedPatterns) {
    console.log(`Sequence ${pattern} has occurred ${count} times.`);
    }
  
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