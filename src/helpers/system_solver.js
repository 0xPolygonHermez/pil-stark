function matrixByVecMul(F, M, x) {
    if (M[0].length !== x.length) {
        throw new Error('The matrix and the vector have incompatible dimensions');
    }

    const res = new Array(M.length).fill(0n);
    for (let i = 0; i < M.length; i++) {
        for (let j = 0; j < x.length; j++) {
            res[i] = F.add(res[i], F.mul(M[i][j], x[j]));
        }
    }

    return res;
}

function argRowMax(F, M, i, j) {
    let max = M[i][j];
    let maxIdx = i;
    for (let k = i + 1; k < M.length; k++) {
        if (F.gt(M[k][j], max)) {
            max = M[k][j];
            maxIdx = k;
        }
    }

    return maxIdx;
}

function swapRows(M, i, j) {
    const rowi = M[i];
    M[i] = M[j];
    M[j] = rowi;
}

function mulRowByConst(F, M, i, c) {
    if (c === 0n) {
        throw new Error('The constant can not be 0');
    }

    for (let j = 0; j < M[i].length; j++) {
        M[i][j] = F.mul(M[i][j], c);
    }
}

function addRowToAnother(M, i, j, c) {
    if (c === 0n) {
        console.warn('WARNING: The constant is 0');
    }

    for (let k = 0; k < M[i].length; k++) {
        M[j][k] = F.add(M[j][k], F.mul(M[i][k], c));
    }
}

function GaussianElimination(F, A, b) {
    const n = A.length; // nº rows
    const m = A[0].length + 1; // nº columns

    if (n !== b.length) throw new Error('The augmented matrix has incompatible dimension');

    let M = A;
    for (let i = 0; i < n; i++) {
        M[i].push(b[i]);
    }

    let h = 0; // Pivot row
    let k = 0; // Pivot column
    while (h < n && k < m) {
        const i_max = argRowMax(F, M, h, k);
        if (F.isZero(M[i_max][k])) {
            // No pivot in this column
            k++;
        } else {
            swapRows(M, h, i_max);
            for (let i = h + 1; i < n; i++) {
                const f = F.div(M[i][k], M[h][k]);
                M[i][k] = 0n;
                for (let j = k + 1; j < m; j++) {
                    M[i][j] = F.sub(M[i][j], F.mul(M[h][j], f));
                }
            }
            h++;
            k++;
        }
    }

    let Ar = [];
    let br = [];
    for (let i = 0; i < n; i++) {
        br.push(M[i][m - 1]);
        M[i].pop();
        Ar.push(M[i]);
    }

    return [Ar, br];
}

// This function assumes that the system is consistent and has a unique solution
function backSubstitution(F, A, b) {
    const n = A.length; // nº rows
    const m = A[0].length; // nº columns

    let solution = new Array(m).fill(0n);
    let offset = 0;
    for (let i = m - 1; i >= 0; i--) {
        const rowi = A[i];

        // If the variable coefficient is 0, it is either a free variable or the system has multiple solutions
        if (F.isZero(rowi[m - 1 - offset])) {
            continue;
        }

        solution[i] = b[i];
        for (let j = m - 1; j > m - 1 - offset; j--) {
            solution[i] = F.sub(solution[i], F.mul(rowi[j], solution[j]));
        }
        solution[i] = F.div(solution[i], rowi[m - 1 - offset]);
        offset++;
    }

    if (matrixByVecMul(F, A, solution).some((x, i) => F.neq(x, b[i]))) {
        // console.warn('WARNING: The system is inconsistent');
        return false;
    }

    return solution;
}

module.exports = function linearSystemSolver(F, A, b) {
    let [Ar, br] = GaussianElimination(F, A, b);
    return backSubstitution(F, Ar, br);
}