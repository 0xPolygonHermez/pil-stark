/* eslint-disable prefer-arrow-callback */
/* eslint-disable no-console */
const { assert } = require('chai');
const getPoseidon = require('../src/helpers/hash/poseidon/poseidon.js');

describe('poseidon', async function () {
    this.timeout(300000000);

    it('should calculate poseidon of test vector 0...0', async () => {
        const poseidon = await getPoseidon();
        const { F } = poseidon;

        const res = poseidon([0, 0, 0, 0, 0, 0, 0, 0]);
        const expectedRes = [F.e('0x3c18a9786cb0b359'), F.e('0xc4055e3364a246c3'), F.e('0x7953db0ab48808f4'), F.e('0xc71603f33a1144ca')];

        for (let i = 0; i < 4; i++) {
            assert(F.eq(res[i], expectedRes[i]));
        }
    });

    it('should calculate poseidon of test vector 0..11', async () => {
        const poseidon = await getPoseidon();
        const { F } = poseidon;

        const res = poseidon([0, 1, 2, 3, 4, 5, 6, 7], [8, 9, 10, 11]);
        const expectedRes = [F.e('0xd64e1e3efc5b8e9e'), F.e('0x53666633020aaa47'), F.e('0xd40285597c6a8825'), F.e('0x613a4f81e81231d2')];

        for (let i = 0; i < 4; i++) {
            assert(F.eq(res[i], expectedRes[i]));
        }
    });

    it('should calculate poseidon of test vector -1..-1', async () => {
        const poseidon = await getPoseidon();
        const { F } = poseidon;

        const res = poseidon([-1, -1, -1, -1, -1, -1, -1, -1], [-1, -1, -1, -1]);
        const expectedRes = [F.e('0xbe0085cfc57a8357'), F.e('0xd95af71847d05c09'), F.e('0xcf55a13d33c1c953'), F.e('0x95803a74f4530e82')];

        for (let i = 0; i < 4; i++) {
            assert(F.eq(res[i], expectedRes[i]));
        }
    });
});
