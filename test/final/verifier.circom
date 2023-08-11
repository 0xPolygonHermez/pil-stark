pragma circom 2.1.0;

include "gl.circom";
include "poseidon.circom";
include "bitify.circom";
include "sha256/sha256.circom";
include "fft.circom";
include "merklehash.circom";
include "evalpol.circom";
include "treeselector.circom";
include "bn1togl3.circom";
include "compconstant64.circom";


/* 
    Calculate the transcript
*/ 
template Transcript() {

    signal input publics[3];
    signal input root1; 
    signal input root2; 
    signal input root3; 
    signal input rootQ;
    signal input evals[83][3]; 
    signal input s1_root;
    signal input s2_root;
    signal input s3_root;
    signal input s4_root;
    signal input finalPol[16][3];

    signal output challenges[8][3];  
    signal output ys[32][17];
    signal output s0_specialX[3];
    signal output s1_specialX[3];
    signal output s2_specialX[3];
    signal output s3_specialX[3];
    signal output s4_specialX[3];
  


    
    signal transcriptHash_0[17] <== PoseidonEx(16, 17)([publics[0],publics[1],publics[2],root1,0,0,0,0,0,0,0,0,0,0,0,0], 0);
    signal bn1togl3_0[3] <== BN1toGL3()(transcriptHash_0[0]);
    challenges[0] <== [bn1togl3_0[0], bn1togl3_0[1], bn1togl3_0[2]];
    signal bn1togl3_1[3] <== BN1toGL3()(transcriptHash_0[1]);
    challenges[1] <== [bn1togl3_1[0], bn1togl3_1[1], bn1togl3_1[2]];
    for(var i = 2; i < 17; i++){
        _ <== transcriptHash_0[i]; // Unused transcript values        
    }
    
    signal transcriptHash_1[17] <== PoseidonEx(16, 17)([root2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], transcriptHash_0[0]);
    signal bn1togl3_2[3] <== BN1toGL3()(transcriptHash_1[0]);
    challenges[2] <== [bn1togl3_2[0], bn1togl3_2[1], bn1togl3_2[2]];
    signal bn1togl3_3[3] <== BN1toGL3()(transcriptHash_1[1]);
    challenges[3] <== [bn1togl3_3[0], bn1togl3_3[1], bn1togl3_3[2]];
    for(var i = 2; i < 17; i++){
        _ <== transcriptHash_1[i]; // Unused transcript values        
    }
    
    signal transcriptHash_2[17] <== PoseidonEx(16, 17)([root3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], transcriptHash_1[0]);
    signal bn1togl3_4[3] <== BN1toGL3()(transcriptHash_2[0]);
    challenges[4] <== [bn1togl3_4[0], bn1togl3_4[1], bn1togl3_4[2]];
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_2[i]; // Unused transcript values        
    }
    
    signal transcriptHash_3[17] <== PoseidonEx(16, 17)([rootQ,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], transcriptHash_2[0]);
    signal bn1togl3_5[3] <== BN1toGL3()(transcriptHash_3[0]);
    challenges[7] <== [bn1togl3_5[0], bn1togl3_5[1], bn1togl3_5[2]];
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_3[i]; // Unused transcript values        
    }
    
    signal transcriptHash_4[17] <== PoseidonEx(16, 17)([evals[0][0],evals[0][1],evals[0][2],evals[1][0],evals[1][1],evals[1][2],evals[2][0],evals[2][1],evals[2][2],evals[3][0],evals[3][1],evals[3][2],evals[4][0],evals[4][1],evals[4][2],evals[5][0]], transcriptHash_3[0]);
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_4[i]; // Unused transcript values        
    }
    
    signal transcriptHash_5[17] <== PoseidonEx(16, 17)([evals[5][1],evals[5][2],evals[6][0],evals[6][1],evals[6][2],evals[7][0],evals[7][1],evals[7][2],evals[8][0],evals[8][1],evals[8][2],evals[9][0],evals[9][1],evals[9][2],evals[10][0],evals[10][1]], transcriptHash_4[0]);
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_5[i]; // Unused transcript values        
    }
    
    signal transcriptHash_6[17] <== PoseidonEx(16, 17)([evals[10][2],evals[11][0],evals[11][1],evals[11][2],evals[12][0],evals[12][1],evals[12][2],evals[13][0],evals[13][1],evals[13][2],evals[14][0],evals[14][1],evals[14][2],evals[15][0],evals[15][1],evals[15][2]], transcriptHash_5[0]);
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_6[i]; // Unused transcript values        
    }
    
    signal transcriptHash_7[17] <== PoseidonEx(16, 17)([evals[16][0],evals[16][1],evals[16][2],evals[17][0],evals[17][1],evals[17][2],evals[18][0],evals[18][1],evals[18][2],evals[19][0],evals[19][1],evals[19][2],evals[20][0],evals[20][1],evals[20][2],evals[21][0]], transcriptHash_6[0]);
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_7[i]; // Unused transcript values        
    }
    
    signal transcriptHash_8[17] <== PoseidonEx(16, 17)([evals[21][1],evals[21][2],evals[22][0],evals[22][1],evals[22][2],evals[23][0],evals[23][1],evals[23][2],evals[24][0],evals[24][1],evals[24][2],evals[25][0],evals[25][1],evals[25][2],evals[26][0],evals[26][1]], transcriptHash_7[0]);
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_8[i]; // Unused transcript values        
    }
    
    signal transcriptHash_9[17] <== PoseidonEx(16, 17)([evals[26][2],evals[27][0],evals[27][1],evals[27][2],evals[28][0],evals[28][1],evals[28][2],evals[29][0],evals[29][1],evals[29][2],evals[30][0],evals[30][1],evals[30][2],evals[31][0],evals[31][1],evals[31][2]], transcriptHash_8[0]);
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_9[i]; // Unused transcript values        
    }
    
    signal transcriptHash_10[17] <== PoseidonEx(16, 17)([evals[32][0],evals[32][1],evals[32][2],evals[33][0],evals[33][1],evals[33][2],evals[34][0],evals[34][1],evals[34][2],evals[35][0],evals[35][1],evals[35][2],evals[36][0],evals[36][1],evals[36][2],evals[37][0]], transcriptHash_9[0]);
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_10[i]; // Unused transcript values        
    }
    
    signal transcriptHash_11[17] <== PoseidonEx(16, 17)([evals[37][1],evals[37][2],evals[38][0],evals[38][1],evals[38][2],evals[39][0],evals[39][1],evals[39][2],evals[40][0],evals[40][1],evals[40][2],evals[41][0],evals[41][1],evals[41][2],evals[42][0],evals[42][1]], transcriptHash_10[0]);
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_11[i]; // Unused transcript values        
    }
    
    signal transcriptHash_12[17] <== PoseidonEx(16, 17)([evals[42][2],evals[43][0],evals[43][1],evals[43][2],evals[44][0],evals[44][1],evals[44][2],evals[45][0],evals[45][1],evals[45][2],evals[46][0],evals[46][1],evals[46][2],evals[47][0],evals[47][1],evals[47][2]], transcriptHash_11[0]);
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_12[i]; // Unused transcript values        
    }
    
    signal transcriptHash_13[17] <== PoseidonEx(16, 17)([evals[48][0],evals[48][1],evals[48][2],evals[49][0],evals[49][1],evals[49][2],evals[50][0],evals[50][1],evals[50][2],evals[51][0],evals[51][1],evals[51][2],evals[52][0],evals[52][1],evals[52][2],evals[53][0]], transcriptHash_12[0]);
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_13[i]; // Unused transcript values        
    }
    
    signal transcriptHash_14[17] <== PoseidonEx(16, 17)([evals[53][1],evals[53][2],evals[54][0],evals[54][1],evals[54][2],evals[55][0],evals[55][1],evals[55][2],evals[56][0],evals[56][1],evals[56][2],evals[57][0],evals[57][1],evals[57][2],evals[58][0],evals[58][1]], transcriptHash_13[0]);
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_14[i]; // Unused transcript values        
    }
    
    signal transcriptHash_15[17] <== PoseidonEx(16, 17)([evals[58][2],evals[59][0],evals[59][1],evals[59][2],evals[60][0],evals[60][1],evals[60][2],evals[61][0],evals[61][1],evals[61][2],evals[62][0],evals[62][1],evals[62][2],evals[63][0],evals[63][1],evals[63][2]], transcriptHash_14[0]);
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_15[i]; // Unused transcript values        
    }
    
    signal transcriptHash_16[17] <== PoseidonEx(16, 17)([evals[64][0],evals[64][1],evals[64][2],evals[65][0],evals[65][1],evals[65][2],evals[66][0],evals[66][1],evals[66][2],evals[67][0],evals[67][1],evals[67][2],evals[68][0],evals[68][1],evals[68][2],evals[69][0]], transcriptHash_15[0]);
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_16[i]; // Unused transcript values        
    }
    
    signal transcriptHash_17[17] <== PoseidonEx(16, 17)([evals[69][1],evals[69][2],evals[70][0],evals[70][1],evals[70][2],evals[71][0],evals[71][1],evals[71][2],evals[72][0],evals[72][1],evals[72][2],evals[73][0],evals[73][1],evals[73][2],evals[74][0],evals[74][1]], transcriptHash_16[0]);
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_17[i]; // Unused transcript values        
    }
    
    signal transcriptHash_18[17] <== PoseidonEx(16, 17)([evals[74][2],evals[75][0],evals[75][1],evals[75][2],evals[76][0],evals[76][1],evals[76][2],evals[77][0],evals[77][1],evals[77][2],evals[78][0],evals[78][1],evals[78][2],evals[79][0],evals[79][1],evals[79][2]], transcriptHash_17[0]);
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_18[i]; // Unused transcript values        
    }
    
    signal transcriptHash_19[17] <== PoseidonEx(16, 17)([evals[80][0],evals[80][1],evals[80][2],evals[81][0],evals[81][1],evals[81][2],evals[82][0],evals[82][1],evals[82][2],0,0,0,0,0,0,0], transcriptHash_18[0]);
    signal bn1togl3_6[3] <== BN1toGL3()(transcriptHash_19[0]);
    challenges[5] <== [bn1togl3_6[0], bn1togl3_6[1], bn1togl3_6[2]];
    signal bn1togl3_7[3] <== BN1toGL3()(transcriptHash_19[1]);
    challenges[6] <== [bn1togl3_7[0], bn1togl3_7[1], bn1togl3_7[2]];
    signal bn1togl3_8[3] <== BN1toGL3()(transcriptHash_19[2]);
    s0_specialX <== [bn1togl3_8[0], bn1togl3_8[1], bn1togl3_8[2]];
    for(var i = 3; i < 17; i++){
        _ <== transcriptHash_19[i]; // Unused transcript values        
    }
    
    signal transcriptHash_20[17] <== PoseidonEx(16, 17)([s1_root,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], transcriptHash_19[0]);
    signal bn1togl3_9[3] <== BN1toGL3()(transcriptHash_20[0]);
    s1_specialX <== [bn1togl3_9[0], bn1togl3_9[1], bn1togl3_9[2]];
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_20[i]; // Unused transcript values        
    }
    
    signal transcriptHash_21[17] <== PoseidonEx(16, 17)([s2_root,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], transcriptHash_20[0]);
    signal bn1togl3_10[3] <== BN1toGL3()(transcriptHash_21[0]);
    s2_specialX <== [bn1togl3_10[0], bn1togl3_10[1], bn1togl3_10[2]];
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_21[i]; // Unused transcript values        
    }
    
    signal transcriptHash_22[17] <== PoseidonEx(16, 17)([s3_root,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], transcriptHash_21[0]);
    signal bn1togl3_11[3] <== BN1toGL3()(transcriptHash_22[0]);
    s3_specialX <== [bn1togl3_11[0], bn1togl3_11[1], bn1togl3_11[2]];
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_22[i]; // Unused transcript values        
    }
    
    signal transcriptHash_23[17] <== PoseidonEx(16, 17)([s4_root,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], transcriptHash_22[0]);
    signal bn1togl3_12[3] <== BN1toGL3()(transcriptHash_23[0]);
    s4_specialX <== [bn1togl3_12[0], bn1togl3_12[1], bn1togl3_12[2]];
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_23[i]; // Unused transcript values        
    }
    
    signal transcriptHash_24[17] <== PoseidonEx(16, 17)([finalPol[0][0],finalPol[0][1],finalPol[0][2],finalPol[1][0],finalPol[1][1],finalPol[1][2],finalPol[2][0],finalPol[2][1],finalPol[2][2],finalPol[3][0],finalPol[3][1],finalPol[3][2],finalPol[4][0],finalPol[4][1],finalPol[4][2],finalPol[5][0]], transcriptHash_23[0]);
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_24[i]; // Unused transcript values        
    }
    
    signal transcriptHash_25[17] <== PoseidonEx(16, 17)([finalPol[5][1],finalPol[5][2],finalPol[6][0],finalPol[6][1],finalPol[6][2],finalPol[7][0],finalPol[7][1],finalPol[7][2],finalPol[8][0],finalPol[8][1],finalPol[8][2],finalPol[9][0],finalPol[9][1],finalPol[9][2],finalPol[10][0],finalPol[10][1]], transcriptHash_24[0]);
    for(var i = 1; i < 17; i++){
        _ <== transcriptHash_25[i]; // Unused transcript values        
    }
    
    signal transcriptHash_26[17] <== PoseidonEx(16, 17)([finalPol[10][2],finalPol[11][0],finalPol[11][1],finalPol[11][2],finalPol[12][0],finalPol[12][1],finalPol[12][2],finalPol[13][0],finalPol[13][1],finalPol[13][2],finalPol[14][0],finalPol[14][1],finalPol[14][2],finalPol[15][0],finalPol[15][1],finalPol[15][2]], transcriptHash_25[0]);
    signal transcriptN2b_0[254] <== Num2Bits_strict()(transcriptHash_26[0]);
    signal transcriptN2b_1[254] <== Num2Bits_strict()(transcriptHash_26[1]);
    signal transcriptN2b_2[254] <== Num2Bits_strict()(transcriptHash_26[2]);
    for(var i = 3; i < 17; i++){
        _ <== transcriptHash_26[i]; // Unused transcript values           
    }

    // From each transcript hash converted to bits, we assign those bits to ys[q] to define the query positions
    var q = 0; // Query number 
    var b = 0; // Bit number 
    for(var j = 0; j < 253; j++) {
        ys[q][b] <== transcriptN2b_0[j];
        b++;
        if(b == 17) {
            b = 0; 
            q++;
        }
    }
    _ <== transcriptN2b_0[253]; // Unused last bit

    for(var j = 0; j < 253; j++) {
        ys[q][b] <== transcriptN2b_1[j];
        b++;
        if(b == 17) {
            b = 0; 
            q++;
        }
    }
    _ <== transcriptN2b_1[253]; // Unused last bit

    for(var j = 0; j < 38; j++) {
        ys[q][b] <== transcriptN2b_2[j];
        b++;
        if(b == 17) {
            b = 0; 
            q++;
        }
    }
    for(var j = 38; j < 254; j++) {
        _ <== transcriptN2b_2[j]; // Unused bits
    }

}

/*
    Verify that FRI polynomials are built properly
*/
template parallel VerifyFRI(prevStepBits, currStepBits, nextStepBits, e0, e1) {
    var nextStep = currStepBits - nextStepBits;
    var step = prevStepBits - currStepBits;

    var p = 0xFFFFFFFF00000001;

    signal input ys[currStepBits];
    signal input s_specialX[3];
    signal input s_vals_curr[1 << step][3];
    signal input s_vals_next[1 << nextStep][3];
    signal input enable;

    signal s_sx[currStepBits - 1];
    s_sx[0] <== GLMul()(ys[0] * (e1 - e0) + e0, ys[1] * (invroots(prevStepBits - 1) -1) + 1);
    for (var i=1; i< currStepBits - 1; i++ ) {
        s_sx[i] <== GLMul()(s_sx[i-1], ys[i + 1] * (invroots(prevStepBits - (i + 1)) -1) + 1);
    }

    signal s_X; 
    if(currStepBits > 1) {
        s_X <== s_sx[currStepBits - 2];
    } else {
        s_X <== GLMul()(e0, ys[0] * (invroots(prevStepBits) -1) + 1);
    }

    signal coefs[1 << step][3] <== FFT(step, 1)(s_vals_curr);
    signal evalXprime[3] <== GLCMul()(s_specialX, [s_X, 0, 0]);
    signal evalPol[3] <== EvalPol(1 << step)(coefs, evalXprime);
    
    signal s_keys_lowValues[nextStep];
    for(var i = 0; i < nextStep; i++) { s_keys_lowValues[i] <== ys[i + nextStepBits]; } 
    signal lowValues[3] <== TreeSelector(nextStep, 3)(s_vals_next, s_keys_lowValues);

    signal cNorm[3] <== GLCNorm()([evalPol[0] - lowValues[0] + p, evalPol[1] - lowValues[1] + p, evalPol[2] - lowValues[2] + p]);
    
    enable * cNorm[0] === 0;
    enable * cNorm[1] === 0;
    enable * cNorm[2] === 0;
}

/* 
    Verify that all committed polynomials are calculated correctly
*/
template parallel VerifyEvaluations() {
   
    signal input challenges2[3];
    signal input challenges3[3];
    signal input challenges4[3];
    signal input challenges7[3];
    signal input evals[83][3];
    signal input publics[3];
    signal input enable;

    var p = 0xFFFFFFFF00000001;

    // zMul stores all the powers of z (which is stored in challenge7) up to nBits, i.e, [z, z^2, ..., z^nBits]
    signal zMul[13][3];
    for (var i=0; i< 13 ; i++) {
        if(i==0){
            zMul[i] <== GLCMul()(challenges7, challenges7);
        } else {
            zMul[i] <== GLCMul()(zMul[i-1], zMul[i-1]);
        }
    }

    // Store the vanishing polynomial Zg = x^nBits - 1 evaluated at z
    signal Z[3] <== [zMul[12][0] -1 + p, zMul[12][1], zMul[12][2]];

    // Using the evaluations committed and the challenges,
    // calculate the sum of q_i, i.e, q_0(X) + challenge * q_1(X) + challenge^2 * q_2(X) +  ... + challenge^(l-1) * q_l-1(X) evaluated at z 
    signal tmp_0[3] <== [evals[0][0] - publics[0] + p, evals[0][1], evals[0][2]];
    signal tmp_1[3] <== GLCMul()(evals[1], tmp_0);
    signal tmp_2015[3] <== [tmp_1[0] - 0 + p, tmp_1[1], tmp_1[2]];
    signal tmp_2[3] <== [evals[2][0] - publics[1] + p, evals[2][1], evals[2][2]];
    signal tmp_3[3] <== GLCMul()(evals[1], tmp_2);
    signal tmp_2016[3] <== [tmp_3[0] - 0 + p, tmp_3[1], tmp_3[2]];
    signal tmp_4[3] <== [evals[3][0] - publics[2] + p, evals[3][1], evals[3][2]];
    signal tmp_5[3] <== GLCMul()(evals[1], tmp_4);
    signal tmp_2017[3] <== [tmp_5[0] - 0 + p, tmp_5[1], tmp_5[2]];
    signal tmp_2018[3] <== GLCMul()(evals[0], evals[2]);
    signal tmp_6[3] <== GLCMul()(evals[4], tmp_2018);
    signal tmp_7[3] <== GLCMul()(evals[5], evals[0]);
    signal tmp_8[3] <== [tmp_6[0] + tmp_7[0], tmp_6[1] + tmp_7[1], tmp_6[2] + tmp_7[2]];
    signal tmp_9[3] <== GLCMul()(evals[6], evals[2]);
    signal tmp_10[3] <== [tmp_8[0] + tmp_9[0], tmp_8[1] + tmp_9[1], tmp_8[2] + tmp_9[2]];
    signal tmp_11[3] <== GLCMul()(evals[7], evals[3]);
    signal tmp_12[3] <== [tmp_10[0] + tmp_11[0], tmp_10[1] + tmp_11[1], tmp_10[2] + tmp_11[2]];
    signal tmp_2019[3] <== [tmp_12[0] + evals[8][0], tmp_12[1] + evals[8][1], tmp_12[2] + evals[8][2]];
    signal tmp_13[3] <== GLCMul()(tmp_2019, evals[9]);
    signal tmp_2020[3] <== [tmp_13[0] - 0 + p, tmp_13[1], tmp_13[2]];
    signal tmp_2021[3] <== GLCMul()(evals[10], evals[11]);
    signal tmp_14[3] <== GLCMul()(evals[4], tmp_2021);
    signal tmp_15[3] <== GLCMul()(evals[5], evals[10]);
    signal tmp_16[3] <== [tmp_14[0] + tmp_15[0], tmp_14[1] + tmp_15[1], tmp_14[2] + tmp_15[2]];
    signal tmp_17[3] <== GLCMul()(evals[6], evals[11]);
    signal tmp_18[3] <== [tmp_16[0] + tmp_17[0], tmp_16[1] + tmp_17[1], tmp_16[2] + tmp_17[2]];
    signal tmp_19[3] <== GLCMul()(evals[7], evals[12]);
    signal tmp_20[3] <== [tmp_18[0] + tmp_19[0], tmp_18[1] + tmp_19[1], tmp_18[2] + tmp_19[2]];
    signal tmp_2022[3] <== [tmp_20[0] + evals[8][0], tmp_20[1] + evals[8][1], tmp_20[2] + evals[8][2]];
    signal tmp_21[3] <== GLCMul()(tmp_2022, evals[9]);
    signal tmp_2023[3] <== [tmp_21[0] - 0 + p, tmp_21[1], tmp_21[2]];
    signal tmp_2024[3] <== GLCMul()(evals[13], evals[14]);
    signal tmp_22[3] <== GLCMul()(evals[15], tmp_2024);
    signal tmp_23[3] <== GLCMul()(evals[16], evals[13]);
    signal tmp_24[3] <== [tmp_22[0] + tmp_23[0], tmp_22[1] + tmp_23[1], tmp_22[2] + tmp_23[2]];
    signal tmp_25[3] <== GLCMul()(evals[17], evals[14]);
    signal tmp_26[3] <== [tmp_24[0] + tmp_25[0], tmp_24[1] + tmp_25[1], tmp_24[2] + tmp_25[2]];
    signal tmp_27[3] <== GLCMul()(evals[18], evals[19]);
    signal tmp_28[3] <== [tmp_26[0] + tmp_27[0], tmp_26[1] + tmp_27[1], tmp_26[2] + tmp_27[2]];
    signal tmp_2025[3] <== [tmp_28[0] + evals[20][0], tmp_28[1] + evals[20][1], tmp_28[2] + evals[20][2]];
    signal tmp_29[3] <== GLCMul()(tmp_2025, evals[9]);
    signal tmp_2026[3] <== [tmp_29[0] - 0 + p, tmp_29[1], tmp_29[2]];
    signal tmp_2027[3] <== GLCMul()(evals[21], evals[22]);
    signal tmp_30[3] <== GLCMul()(evals[15], tmp_2027);
    signal tmp_31[3] <== GLCMul()(evals[16], evals[21]);
    signal tmp_32[3] <== [tmp_30[0] + tmp_31[0], tmp_30[1] + tmp_31[1], tmp_30[2] + tmp_31[2]];
    signal tmp_33[3] <== GLCMul()(evals[17], evals[22]);
    signal tmp_34[3] <== [tmp_32[0] + tmp_33[0], tmp_32[1] + tmp_33[1], tmp_32[2] + tmp_33[2]];
    signal tmp_35[3] <== GLCMul()(evals[18], evals[23]);
    signal tmp_36[3] <== [tmp_34[0] + tmp_35[0], tmp_34[1] + tmp_35[1], tmp_34[2] + tmp_35[2]];
    signal tmp_2028[3] <== [tmp_36[0] + evals[20][0], tmp_36[1] + evals[20][1], tmp_36[2] + evals[20][2]];
    signal tmp_37[3] <== GLCMul()(tmp_2028, evals[9]);
    signal tmp_2029[3] <== [tmp_37[0] - 0 + p, tmp_37[1], tmp_37[2]];
    signal tmp_38[3] <== [evals[19][0] - 1 + p, evals[19][1], evals[19][2]];
    signal tmp_2030[3] <== GLCMul()(evals[19], tmp_38);
    signal tmp_39[3] <== GLCMul()(evals[24], tmp_2030);
    signal tmp_2031[3] <== [tmp_39[0] - 0 + p, tmp_39[1], tmp_39[2]];
    signal tmp_2032[3] <== GLCMul()(evals[25], evals[25]);
    signal tmp_2033[3] <== GLCMul()(tmp_2032, evals[25]);
    signal tmp_40[3] <== [evals[0][0] - evals[11][0] + p, evals[0][1] - evals[11][1] + p, evals[0][2] - evals[11][2] + p];
    signal tmp_41[3] <== GLCMul()(evals[19], tmp_40);
    signal tmp_2034[3] <== [tmp_41[0] + evals[11][0], tmp_41[1] + evals[11][1], tmp_41[2] + evals[11][2]];
    signal tmp_42[3] <== [tmp_2034[0] - evals[0][0] + p, tmp_2034[1] - evals[0][1] + p, tmp_2034[2] - evals[0][2] + p];
    signal tmp_43[3] <== GLCMul()(evals[24], tmp_42);
    signal tmp_44[3] <== [tmp_43[0] + evals[0][0], tmp_43[1] + evals[0][1], tmp_43[2] + evals[0][2]];
    signal tmp_45[3] <== [evals[26][0] + evals[24][0], evals[26][1] + evals[24][1], evals[26][2] + evals[24][2]];
    signal tmp_46[3] <== GLCMul()(tmp_45, [0xb585f766f2144405,0,0]);
    signal tmp_2035[3] <== [tmp_44[0] + tmp_46[0], tmp_44[1] + tmp_46[1], tmp_44[2] + tmp_46[2]];
    signal tmp_47[3] <== GLCMul()(tmp_2033, tmp_2035);
    signal tmp_2036[3] <== [tmp_47[0] + evals[4][0], tmp_47[1] + evals[4][1], tmp_47[2] + evals[4][2]];
    signal tmp_2037[3] <== GLCMul()(evals[27], evals[27]);
    signal tmp_2038[3] <== GLCMul()(tmp_2037, tmp_2037);
    signal tmp_2039[3] <== GLCMul()(tmp_2038, tmp_2037);
    signal tmp_48[3] <== GLCMul()(tmp_2039, evals[27]);
    signal tmp_2040[3] <== [tmp_48[0] + evals[5][0], tmp_48[1] + evals[5][1], tmp_48[2] + evals[5][2]];
    signal tmp_2041[3] <== GLCMul()(evals[28], evals[28]);
    signal tmp_2042[3] <== GLCMul()(tmp_2041, tmp_2041);
    signal tmp_2043[3] <== GLCMul()(tmp_2042, tmp_2041);
    signal tmp_49[3] <== GLCMul()(tmp_2043, evals[28]);
    signal tmp_2044[3] <== [tmp_49[0] + evals[6][0], tmp_49[1] + evals[6][1], tmp_49[2] + evals[6][2]];
    signal tmp_2045[3] <== GLCMul()(evals[29], evals[29]);
    signal tmp_2046[3] <== GLCMul()(tmp_2045, tmp_2045);
    signal tmp_2047[3] <== GLCMul()(tmp_2046, tmp_2045);
    signal tmp_50[3] <== GLCMul()(tmp_2047, evals[29]);
    signal tmp_2048[3] <== [tmp_50[0] + evals[7][0], tmp_50[1] + evals[7][1], tmp_50[2] + evals[7][2]];
    signal tmp_2049[3] <== GLCMul()(evals[30], evals[30]);
    signal tmp_2050[3] <== GLCMul()(tmp_2049, tmp_2049);
    signal tmp_2051[3] <== GLCMul()(tmp_2050, tmp_2049);
    signal tmp_51[3] <== GLCMul()(tmp_2051, evals[30]);
    signal tmp_2052[3] <== [tmp_51[0] + evals[8][0], tmp_51[1] + evals[8][1], tmp_51[2] + evals[8][2]];
    signal tmp_2053[3] <== GLCMul()(evals[31], evals[31]);
    signal tmp_2054[3] <== GLCMul()(tmp_2053, tmp_2053);
    signal tmp_2055[3] <== GLCMul()(tmp_2054, tmp_2053);
    signal tmp_52[3] <== GLCMul()(tmp_2055, evals[31]);
    signal tmp_2056[3] <== [tmp_52[0] + evals[32][0], tmp_52[1] + evals[32][1], tmp_52[2] + evals[32][2]];
    signal tmp_2057[3] <== GLCMul()(evals[33], evals[33]);
    signal tmp_2058[3] <== GLCMul()(tmp_2057, tmp_2057);
    signal tmp_2059[3] <== GLCMul()(tmp_2058, tmp_2057);
    signal tmp_53[3] <== GLCMul()(tmp_2059, evals[33]);
    signal tmp_2060[3] <== [tmp_53[0] + evals[15][0], tmp_53[1] + evals[15][1], tmp_53[2] + evals[15][2]];
    signal tmp_2061[3] <== GLCMul()(evals[34], evals[34]);
    signal tmp_2062[3] <== GLCMul()(tmp_2061, tmp_2061);
    signal tmp_2063[3] <== GLCMul()(tmp_2062, tmp_2061);
    signal tmp_54[3] <== GLCMul()(tmp_2063, evals[34]);
    signal tmp_2064[3] <== [tmp_54[0] + evals[16][0], tmp_54[1] + evals[16][1], tmp_54[2] + evals[16][2]];
    signal tmp_2065[3] <== GLCMul()(evals[35], evals[35]);
    signal tmp_2066[3] <== GLCMul()(tmp_2065, tmp_2065);
    signal tmp_2067[3] <== GLCMul()(tmp_2066, tmp_2065);
    signal tmp_55[3] <== GLCMul()(tmp_2067, evals[35]);
    signal tmp_2068[3] <== [tmp_55[0] + evals[17][0], tmp_55[1] + evals[17][1], tmp_55[2] + evals[17][2]];
    signal tmp_2069[3] <== GLCMul()(evals[36], evals[36]);
    signal tmp_2070[3] <== GLCMul()(tmp_2069, tmp_2069);
    signal tmp_2071[3] <== GLCMul()(tmp_2070, tmp_2069);
    signal tmp_56[3] <== GLCMul()(tmp_2071, evals[36]);
    signal tmp_2072[3] <== [tmp_56[0] + evals[18][0], tmp_56[1] + evals[18][1], tmp_56[2] + evals[18][2]];
    signal tmp_2073[3] <== GLCMul()(evals[37], evals[37]);
    signal tmp_2074[3] <== GLCMul()(tmp_2073, tmp_2073);
    signal tmp_2075[3] <== GLCMul()(tmp_2074, tmp_2073);
    signal tmp_57[3] <== GLCMul()(tmp_2075, evals[37]);
    signal tmp_2076[3] <== [tmp_57[0] + evals[20][0], tmp_57[1] + evals[20][1], tmp_57[2] + evals[20][2]];
    signal tmp_58[3] <== [0 - evals[23][0] + p, -evals[23][1] + p, -evals[23][2] + p];
    signal tmp_59[3] <== GLCMul()(evals[24], tmp_58);
    signal tmp_60[3] <== [tmp_59[0] + evals[23][0], tmp_59[1] + evals[23][1], tmp_59[2] + evals[23][2]];
    signal tmp_61[3] <== [evals[26][0] + evals[24][0], evals[26][1] + evals[24][1], evals[26][2] + evals[24][2]];
    signal tmp_62[3] <== GLCMul()(tmp_61, [0xc54302f225db2c76,0,0]);
    signal tmp_2077[3] <== [tmp_60[0] + tmp_62[0], tmp_60[1] + tmp_62[1], tmp_60[2] + tmp_62[2]];
    signal tmp_2078[3] <== GLCMul()(tmp_2077, tmp_2077);
    signal tmp_2079[3] <== GLCMul()(evals[38], tmp_2078);
    signal tmp_63[3] <== GLCMul()(tmp_2079, tmp_2077);
    signal tmp_2080[3] <== [tmp_63[0] + evals[39][0], tmp_63[1] + evals[39][1], tmp_63[2] + evals[39][2]];
    signal tmp_64[3] <== GLCMul()([0x19, 0, 0], tmp_2036);
    signal tmp_65[3] <== GLCMul()([0xf, 0, 0], tmp_2040);
    signal tmp_66[3] <== [tmp_64[0] + tmp_65[0], tmp_64[1] + tmp_65[1], tmp_64[2] + tmp_65[2]];
    signal tmp_67[3] <== GLCMul()([0x29, 0, 0], tmp_2044);
    signal tmp_68[3] <== [tmp_66[0] + tmp_67[0], tmp_66[1] + tmp_67[1], tmp_66[2] + tmp_67[2]];
    signal tmp_69[3] <== GLCMul()([0x10, 0, 0], tmp_2048);
    signal tmp_70[3] <== [tmp_68[0] + tmp_69[0], tmp_68[1] + tmp_69[1], tmp_68[2] + tmp_69[2]];
    signal tmp_71[3] <== GLCMul()([0x2, 0, 0], tmp_2052);
    signal tmp_72[3] <== [tmp_70[0] + tmp_71[0], tmp_70[1] + tmp_71[1], tmp_70[2] + tmp_71[2]];
    signal tmp_73[3] <== GLCMul()([0x1c, 0, 0], tmp_2056);
    signal tmp_74[3] <== [tmp_72[0] + tmp_73[0], tmp_72[1] + tmp_73[1], tmp_72[2] + tmp_73[2]];
    signal tmp_75[3] <== GLCMul()([0xd, 0, 0], tmp_2060);
    signal tmp_76[3] <== [tmp_74[0] + tmp_75[0], tmp_74[1] + tmp_75[1], tmp_74[2] + tmp_75[2]];
    signal tmp_77[3] <== GLCMul()([0xd, 0, 0], tmp_2064);
    signal tmp_78[3] <== [tmp_76[0] + tmp_77[0], tmp_76[1] + tmp_77[1], tmp_76[2] + tmp_77[2]];
    signal tmp_79[3] <== GLCMul()([0x27, 0, 0], tmp_2068);
    signal tmp_80[3] <== [tmp_78[0] + tmp_79[0], tmp_78[1] + tmp_79[1], tmp_78[2] + tmp_79[2]];
    signal tmp_81[3] <== GLCMul()([0x12, 0, 0], tmp_2072);
    signal tmp_82[3] <== [tmp_80[0] + tmp_81[0], tmp_80[1] + tmp_81[1], tmp_80[2] + tmp_81[2]];
    signal tmp_83[3] <== GLCMul()([0x22, 0, 0], tmp_2076);
    signal tmp_84[3] <== [tmp_82[0] + tmp_83[0], tmp_82[1] + tmp_83[1], tmp_82[2] + tmp_83[2]];
    signal tmp_85[3] <== GLCMul()([0x14, 0, 0], tmp_2080);
    signal tmp_86[3] <== [tmp_84[0] + tmp_85[0], tmp_84[1] + tmp_85[1], tmp_84[2] + tmp_85[2]];
    signal tmp_87[3] <== [evals[40][0] - tmp_86[0] + p, evals[40][1] - tmp_86[1] + p, evals[40][2] - tmp_86[2] + p];
    signal tmp_88[3] <== GLCMul()(evals[41], tmp_87);
    signal tmp_2081[3] <== [tmp_88[0] - 0 + p, tmp_88[1], tmp_88[2]];
    signal tmp_89[3] <== GLCMul()([0x78566230aa7cc5d0, 0, 0], tmp_2036);
    signal tmp_90[3] <== GLCMul()([0x817bd8a7869ed1b5, 0, 0], tmp_2040);
    signal tmp_91[3] <== [tmp_89[0] + tmp_90[0], tmp_89[1] + tmp_90[1], tmp_89[2] + tmp_90[2]];
    signal tmp_92[3] <== GLCMul()([0xd267254bea1097f4, 0, 0], tmp_2044);
    signal tmp_93[3] <== [tmp_91[0] + tmp_92[0], tmp_91[1] + tmp_92[1], tmp_91[2] + tmp_92[2]];
    signal tmp_94[3] <== GLCMul()([0x60c33ebd1e023f0a, 0, 0], tmp_2048);
    signal tmp_95[3] <== [tmp_93[0] + tmp_94[0], tmp_93[1] + tmp_94[1], tmp_93[2] + tmp_94[2]];
    signal tmp_96[3] <== GLCMul()([0xa89ef32ae1462322, 0, 0], tmp_2052);
    signal tmp_97[3] <== [tmp_95[0] + tmp_96[0], tmp_95[1] + tmp_96[1], tmp_95[2] + tmp_96[2]];
    signal tmp_98[3] <== GLCMul()([0x6250f5f176d483e7, 0, 0], tmp_2056);
    signal tmp_99[3] <== [tmp_97[0] + tmp_98[0], tmp_97[1] + tmp_98[1], tmp_97[2] + tmp_98[2]];
    signal tmp_100[3] <== GLCMul()([0xe16a6c1dee3ba347, 0, 0], tmp_2060);
    signal tmp_101[3] <== [tmp_99[0] + tmp_100[0], tmp_99[1] + tmp_100[1], tmp_99[2] + tmp_100[2]];
    signal tmp_102[3] <== GLCMul()([0xec9730136b7c2c05, 0, 0], tmp_2064);
    signal tmp_103[3] <== [tmp_101[0] + tmp_102[0], tmp_101[1] + tmp_102[1], tmp_101[2] + tmp_102[2]];
    signal tmp_104[3] <== GLCMul()([0x3cf7c3a39d94c236, 0, 0], tmp_2068);
    signal tmp_105[3] <== [tmp_103[0] + tmp_104[0], tmp_103[1] + tmp_104[1], tmp_103[2] + tmp_104[2]];
    signal tmp_106[3] <== GLCMul()([0xb4707207455f57e3, 0, 0], tmp_2072);
    signal tmp_107[3] <== [tmp_105[0] + tmp_106[0], tmp_105[1] + tmp_106[1], tmp_105[2] + tmp_106[2]];
    signal tmp_108[3] <== GLCMul()([0xaadb39e83e76a9e0, 0, 0], tmp_2076);
    signal tmp_109[3] <== [tmp_107[0] + tmp_108[0], tmp_107[1] + tmp_108[1], tmp_107[2] + tmp_108[2]];
    signal tmp_110[3] <== GLCMul()([0x32f8ae916e567d39, 0, 0], tmp_2080);
    signal tmp_111[3] <== [tmp_109[0] + tmp_110[0], tmp_109[1] + tmp_110[1], tmp_109[2] + tmp_110[2]];
    signal tmp_112[3] <== [evals[42][0] - tmp_111[0] + p, evals[42][1] - tmp_111[1] + p, evals[42][2] - tmp_111[2] + p];
    signal tmp_113[3] <== GLCMul()(evals[41], tmp_112);
    signal tmp_2082[3] <== [tmp_113[0] - 0 + p, tmp_113[1], tmp_113[2]];
    signal tmp_114[3] <== GLCMul()([0xdbf23e50005e7f24, 0, 0], tmp_2036);
    signal tmp_115[3] <== GLCMul()([0x819f2c14a8366b1f, 0, 0], tmp_2040);
    signal tmp_116[3] <== [tmp_114[0] + tmp_115[0], tmp_114[1] + tmp_115[1], tmp_114[2] + tmp_115[2]];
    signal tmp_117[3] <== GLCMul()([0x2dc10fce3233f443, 0, 0], tmp_2044);
    signal tmp_118[3] <== [tmp_116[0] + tmp_117[0], tmp_116[1] + tmp_117[1], tmp_116[2] + tmp_117[2]];
    signal tmp_119[3] <== GLCMul()([0xdb6945a20d277091, 0, 0], tmp_2048);
    signal tmp_120[3] <== [tmp_118[0] + tmp_119[0], tmp_118[1] + tmp_119[1], tmp_118[2] + tmp_119[2]];
    signal tmp_121[3] <== GLCMul()([0x77c1a153e73659e8, 0, 0], tmp_2052);
    signal tmp_122[3] <== [tmp_120[0] + tmp_121[0], tmp_120[1] + tmp_121[1], tmp_120[2] + tmp_121[2]];
    signal tmp_123[3] <== GLCMul()([0xaad1255d46e78f07, 0, 0], tmp_2056);
    signal tmp_124[3] <== [tmp_122[0] + tmp_123[0], tmp_122[1] + tmp_123[1], tmp_122[2] + tmp_123[2]];
    signal tmp_125[3] <== GLCMul()([0x13d316e45539aef4, 0, 0], tmp_2060);
    signal tmp_126[3] <== [tmp_124[0] + tmp_125[0], tmp_124[1] + tmp_125[1], tmp_124[2] + tmp_125[2]];
    signal tmp_127[3] <== GLCMul()([0xe1ecc5c21eec0646, 0, 0], tmp_2064);
    signal tmp_128[3] <== [tmp_126[0] + tmp_127[0], tmp_126[1] + tmp_127[1], tmp_126[2] + tmp_127[2]];
    signal tmp_129[3] <== GLCMul()([0x9e62c7d7b000cb0b, 0, 0], tmp_2068);
    signal tmp_130[3] <== [tmp_128[0] + tmp_129[0], tmp_128[1] + tmp_129[1], tmp_128[2] + tmp_129[2]];
    signal tmp_131[3] <== GLCMul()([0x8e1de42b665c6706, 0, 0], tmp_2072);
    signal tmp_132[3] <== [tmp_130[0] + tmp_131[0], tmp_130[1] + tmp_131[1], tmp_130[2] + tmp_131[2]];
    signal tmp_133[3] <== GLCMul()([0xcd9bf0bd292c5fda, 0, 0], tmp_2076);
    signal tmp_134[3] <== [tmp_132[0] + tmp_133[0], tmp_132[1] + tmp_133[1], tmp_132[2] + tmp_133[2]];
    signal tmp_135[3] <== GLCMul()([0xaadb39e83e76a9e0, 0, 0], tmp_2080);
    signal tmp_136[3] <== [tmp_134[0] + tmp_135[0], tmp_134[1] + tmp_135[1], tmp_134[2] + tmp_135[2]];
    signal tmp_137[3] <== [evals[43][0] - tmp_136[0] + p, evals[43][1] - tmp_136[1] + p, evals[43][2] - tmp_136[2] + p];
    signal tmp_138[3] <== GLCMul()(evals[41], tmp_137);
    signal tmp_2083[3] <== [tmp_138[0] - 0 + p, tmp_138[1], tmp_138[2]];
    signal tmp_139[3] <== GLCMul()([0xb4a02c5c826d523e, 0, 0], tmp_2036);
    signal tmp_140[3] <== GLCMul()([0x7a5cf5b7b922e946, 0, 0], tmp_2040);
    signal tmp_141[3] <== [tmp_139[0] + tmp_140[0], tmp_139[1] + tmp_140[1], tmp_139[2] + tmp_140[2]];
    signal tmp_142[3] <== GLCMul()([0xfa9db0de2d852e7a, 0, 0], tmp_2044);
    signal tmp_143[3] <== [tmp_141[0] + tmp_142[0], tmp_141[1] + tmp_142[1], tmp_141[2] + tmp_142[2]];
    signal tmp_144[3] <== GLCMul()([0x383dd77e07998487, 0, 0], tmp_2048);
    signal tmp_145[3] <== [tmp_143[0] + tmp_144[0], tmp_143[1] + tmp_144[1], tmp_143[2] + tmp_144[2]];
    signal tmp_146[3] <== GLCMul()([0x2aec981be4b62ed5, 0, 0], tmp_2052);
    signal tmp_147[3] <== [tmp_145[0] + tmp_146[0], tmp_145[1] + tmp_146[1], tmp_145[2] + tmp_146[2]];
    signal tmp_148[3] <== GLCMul()([0x8a00c7c83c762584, 0, 0], tmp_2056);
    signal tmp_149[3] <== [tmp_147[0] + tmp_148[0], tmp_147[1] + tmp_148[1], tmp_147[2] + tmp_148[2]];
    signal tmp_150[3] <== GLCMul()([0x577e0472764f061d, 0, 0], tmp_2060);
    signal tmp_151[3] <== [tmp_149[0] + tmp_150[0], tmp_149[1] + tmp_150[1], tmp_149[2] + tmp_150[2]];
    signal tmp_152[3] <== GLCMul()([0x956d3c8b5528e064, 0, 0], tmp_2064);
    signal tmp_153[3] <== [tmp_151[0] + tmp_152[0], tmp_151[1] + tmp_152[1], tmp_151[2] + tmp_152[2]];
    signal tmp_154[3] <== GLCMul()([0xe202be7ad7265af6, 0, 0], tmp_2068);
    signal tmp_155[3] <== [tmp_153[0] + tmp_154[0], tmp_153[1] + tmp_154[1], tmp_153[2] + tmp_154[2]];
    signal tmp_156[3] <== GLCMul()([0xee7b04568203481, 0, 0], tmp_2072);
    signal tmp_157[3] <== [tmp_155[0] + tmp_156[0], tmp_155[1] + tmp_156[1], tmp_155[2] + tmp_156[2]];
    signal tmp_158[3] <== GLCMul()([0x8e1de42b665c6706, 0, 0], tmp_2076);
    signal tmp_159[3] <== [tmp_157[0] + tmp_158[0], tmp_157[1] + tmp_158[1], tmp_157[2] + tmp_158[2]];
    signal tmp_160[3] <== GLCMul()([0xb4707207455f57e3, 0, 0], tmp_2080);
    signal tmp_161[3] <== [tmp_159[0] + tmp_160[0], tmp_159[1] + tmp_160[1], tmp_159[2] + tmp_160[2]];
    signal tmp_162[3] <== [evals[44][0] - tmp_161[0] + p, evals[44][1] - tmp_161[1] + p, evals[44][2] - tmp_161[2] + p];
    signal tmp_163[3] <== GLCMul()(evals[41], tmp_162);
    signal tmp_2084[3] <== [tmp_163[0] - 0 + p, tmp_163[1], tmp_163[2]];
    signal tmp_164[3] <== GLCMul()([0x466d8f66a8f9fed5, 0, 0], tmp_2036);
    signal tmp_165[3] <== GLCMul()([0x727eca45c8d7bb71, 0, 0], tmp_2040);
    signal tmp_166[3] <== [tmp_164[0] + tmp_165[0], tmp_164[1] + tmp_165[1], tmp_164[2] + tmp_165[2]];
    signal tmp_167[3] <== GLCMul()([0xde2a0516f8c9d943, 0, 0], tmp_2044);
    signal tmp_168[3] <== [tmp_166[0] + tmp_167[0], tmp_166[1] + tmp_167[1], tmp_166[2] + tmp_167[2]];
    signal tmp_169[3] <== GLCMul()([0xe04ea1957ad8305c, 0, 0], tmp_2048);
    signal tmp_170[3] <== [tmp_168[0] + tmp_169[0], tmp_168[1] + tmp_169[1], tmp_168[2] + tmp_169[2]];
    signal tmp_171[3] <== GLCMul()([0xb70fb5f2b4f1f85f, 0, 0], tmp_2052);
    signal tmp_172[3] <== [tmp_170[0] + tmp_171[0], tmp_170[1] + tmp_171[1], tmp_170[2] + tmp_171[2]];
    signal tmp_173[3] <== GLCMul()([0xc734f3829ed30b0c, 0, 0], tmp_2056);
    signal tmp_174[3] <== [tmp_172[0] + tmp_173[0], tmp_172[1] + tmp_173[1], tmp_172[2] + tmp_173[2]];
    signal tmp_175[3] <== GLCMul()([0x226a4dcf5db3316d, 0, 0], tmp_2060);
    signal tmp_176[3] <== [tmp_174[0] + tmp_175[0], tmp_174[1] + tmp_175[1], tmp_174[2] + tmp_175[2]];
    signal tmp_177[3] <== GLCMul()([0x6df1d31fa84398f4, 0, 0], tmp_2064);
    signal tmp_178[3] <== [tmp_176[0] + tmp_177[0], tmp_176[1] + tmp_177[1], tmp_176[2] + tmp_177[2]];
    signal tmp_179[3] <== GLCMul()([0x82178371fa5fff69, 0, 0], tmp_2068);
    signal tmp_180[3] <== [tmp_178[0] + tmp_179[0], tmp_178[1] + tmp_179[1], tmp_178[2] + tmp_179[2]];
    signal tmp_181[3] <== GLCMul()([0xe202be7ad7265af6, 0, 0], tmp_2072);
    signal tmp_182[3] <== [tmp_180[0] + tmp_181[0], tmp_180[1] + tmp_181[1], tmp_180[2] + tmp_181[2]];
    signal tmp_183[3] <== GLCMul()([0x9e62c7d7b000cb0b, 0, 0], tmp_2076);
    signal tmp_184[3] <== [tmp_182[0] + tmp_183[0], tmp_182[1] + tmp_183[1], tmp_182[2] + tmp_183[2]];
    signal tmp_185[3] <== GLCMul()([0x3cf7c3a39d94c236, 0, 0], tmp_2080);
    signal tmp_186[3] <== [tmp_184[0] + tmp_185[0], tmp_184[1] + tmp_185[1], tmp_184[2] + tmp_185[2]];
    signal tmp_187[3] <== [evals[45][0] - tmp_186[0] + p, evals[45][1] - tmp_186[1] + p, evals[45][2] - tmp_186[2] + p];
    signal tmp_188[3] <== GLCMul()(evals[41], tmp_187);
    signal tmp_2085[3] <== [tmp_188[0] - 0 + p, tmp_188[1], tmp_188[2]];
    signal tmp_189[3] <== GLCMul()([0x68da2264f65ec3e, 0, 0], tmp_2036);
    signal tmp_190[3] <== GLCMul()([0x605a82c52b5ad2f1, 0, 0], tmp_2040);
    signal tmp_191[3] <== [tmp_189[0] + tmp_190[0], tmp_189[1] + tmp_190[1], tmp_189[2] + tmp_190[2]];
    signal tmp_192[3] <== GLCMul()([0xe6fdf23648931b99, 0, 0], tmp_2044);
    signal tmp_193[3] <== [tmp_191[0] + tmp_192[0], tmp_191[1] + tmp_192[1], tmp_191[2] + tmp_192[2]];
    signal tmp_194[3] <== GLCMul()([0xd499fcbf63fbd266, 0, 0], tmp_2048);
    signal tmp_195[3] <== [tmp_193[0] + tmp_194[0], tmp_193[1] + tmp_194[1], tmp_193[2] + tmp_194[2]];
    signal tmp_196[3] <== GLCMul()([0x7c66d474cd2087cb, 0, 0], tmp_2052);
    signal tmp_197[3] <== [tmp_195[0] + tmp_196[0], tmp_195[1] + tmp_196[1], tmp_195[2] + tmp_196[2]];
    signal tmp_198[3] <== GLCMul()([0xb1a0132288b1619b, 0, 0], tmp_2056);
    signal tmp_199[3] <== [tmp_197[0] + tmp_198[0], tmp_197[1] + tmp_198[1], tmp_197[2] + tmp_198[2]];
    signal tmp_200[3] <== GLCMul()([0x3373035a3ca3dac6, 0, 0], tmp_2060);
    signal tmp_201[3] <== [tmp_199[0] + tmp_200[0], tmp_199[1] + tmp_200[1], tmp_199[2] + tmp_200[2]];
    signal tmp_202[3] <== GLCMul()([0xf4898a1a3554ee49, 0, 0], tmp_2064);
    signal tmp_203[3] <== [tmp_201[0] + tmp_202[0], tmp_201[1] + tmp_202[1], tmp_201[2] + tmp_202[2]];
    signal tmp_204[3] <== GLCMul()([0x6df1d31fa84398f4, 0, 0], tmp_2068);
    signal tmp_205[3] <== [tmp_203[0] + tmp_204[0], tmp_203[1] + tmp_204[1], tmp_203[2] + tmp_204[2]];
    signal tmp_206[3] <== GLCMul()([0x956d3c8b5528e064, 0, 0], tmp_2072);
    signal tmp_207[3] <== [tmp_205[0] + tmp_206[0], tmp_205[1] + tmp_206[1], tmp_205[2] + tmp_206[2]];
    signal tmp_208[3] <== GLCMul()([0xe1ecc5c21eec0646, 0, 0], tmp_2076);
    signal tmp_209[3] <== [tmp_207[0] + tmp_208[0], tmp_207[1] + tmp_208[1], tmp_207[2] + tmp_208[2]];
    signal tmp_210[3] <== GLCMul()([0xec9730136b7c2c05, 0, 0], tmp_2080);
    signal tmp_211[3] <== [tmp_209[0] + tmp_210[0], tmp_209[1] + tmp_210[1], tmp_209[2] + tmp_210[2]];
    signal tmp_212[3] <== [evals[46][0] - tmp_211[0] + p, evals[46][1] - tmp_211[1] + p, evals[46][2] - tmp_211[2] + p];
    signal tmp_213[3] <== GLCMul()(evals[41], tmp_212);
    signal tmp_2086[3] <== [tmp_213[0] - 0 + p, tmp_213[1], tmp_213[2]];
    signal tmp_214[3] <== GLCMul()([0xb59f9ff0ac6d5d78, 0, 0], tmp_2036);
    signal tmp_215[3] <== GLCMul()([0x59ccc4d5184bc93a, 0, 0], tmp_2040);
    signal tmp_216[3] <== [tmp_214[0] + tmp_215[0], tmp_214[1] + tmp_215[1], tmp_214[2] + tmp_215[2]];
    signal tmp_217[3] <== GLCMul()([0x3743057c07a5dbfa, 0, 0], tmp_2044);
    signal tmp_218[3] <== [tmp_216[0] + tmp_217[0], tmp_216[1] + tmp_217[1], tmp_216[2] + tmp_217[2]];
    signal tmp_219[3] <== GLCMul()([0x462269e4b04620a5, 0, 0], tmp_2048);
    signal tmp_220[3] <== [tmp_218[0] + tmp_219[0], tmp_218[1] + tmp_219[1], tmp_218[2] + tmp_219[2]];
    signal tmp_221[3] <== GLCMul()([0x39302966be7df654, 0, 0], tmp_2052);
    signal tmp_222[3] <== [tmp_220[0] + tmp_221[0], tmp_220[1] + tmp_221[1], tmp_220[2] + tmp_221[2]];
    signal tmp_223[3] <== GLCMul()([0x88685b4f0798dfd1, 0, 0], tmp_2056);
    signal tmp_224[3] <== [tmp_222[0] + tmp_223[0], tmp_222[1] + tmp_223[1], tmp_222[2] + tmp_223[2]];
    signal tmp_225[3] <== GLCMul()([0x441f3a3747b5adb7, 0, 0], tmp_2060);
    signal tmp_226[3] <== [tmp_224[0] + tmp_225[0], tmp_224[1] + tmp_225[1], tmp_224[2] + tmp_225[2]];
    signal tmp_227[3] <== GLCMul()([0x3373035a3ca3dac6, 0, 0], tmp_2064);
    signal tmp_228[3] <== [tmp_226[0] + tmp_227[0], tmp_226[1] + tmp_227[1], tmp_226[2] + tmp_227[2]];
    signal tmp_229[3] <== GLCMul()([0x226a4dcf5db3316d, 0, 0], tmp_2068);
    signal tmp_230[3] <== [tmp_228[0] + tmp_229[0], tmp_228[1] + tmp_229[1], tmp_228[2] + tmp_229[2]];
    signal tmp_231[3] <== GLCMul()([0x577e0472764f061d, 0, 0], tmp_2072);
    signal tmp_232[3] <== [tmp_230[0] + tmp_231[0], tmp_230[1] + tmp_231[1], tmp_230[2] + tmp_231[2]];
    signal tmp_233[3] <== GLCMul()([0x13d316e45539aef4, 0, 0], tmp_2076);
    signal tmp_234[3] <== [tmp_232[0] + tmp_233[0], tmp_232[1] + tmp_233[1], tmp_232[2] + tmp_233[2]];
    signal tmp_235[3] <== GLCMul()([0xe16a6c1dee3ba347, 0, 0], tmp_2080);
    signal tmp_236[3] <== [tmp_234[0] + tmp_235[0], tmp_234[1] + tmp_235[1], tmp_234[2] + tmp_235[2]];
    signal tmp_237[3] <== [evals[47][0] - tmp_236[0] + p, evals[47][1] - tmp_236[1] + p, evals[47][2] - tmp_236[2] + p];
    signal tmp_238[3] <== GLCMul()(evals[41], tmp_237);
    signal tmp_2087[3] <== [tmp_238[0] - 0 + p, tmp_238[1], tmp_238[2]];
    signal tmp_239[3] <== GLCMul()([0xcfb03c902d447551, 0, 0], tmp_2036);
    signal tmp_240[3] <== GLCMul()([0x66c8bab2096cfd38, 0, 0], tmp_2040);
    signal tmp_241[3] <== [tmp_239[0] + tmp_240[0], tmp_239[1] + tmp_240[1], tmp_239[2] + tmp_240[2]];
    signal tmp_242[3] <== GLCMul()([0xa6fdb8ebccc51667, 0, 0], tmp_2044);
    signal tmp_243[3] <== [tmp_241[0] + tmp_242[0], tmp_241[1] + tmp_242[1], tmp_241[2] + tmp_242[2]];
    signal tmp_244[3] <== GLCMul()([0x63c9679d8572a867, 0, 0], tmp_2048);
    signal tmp_245[3] <== [tmp_243[0] + tmp_244[0], tmp_243[1] + tmp_244[1], tmp_243[2] + tmp_244[2]];
    signal tmp_246[3] <== GLCMul()([0xb827c807875511c0, 0, 0], tmp_2052);
    signal tmp_247[3] <== [tmp_245[0] + tmp_246[0], tmp_245[1] + tmp_246[1], tmp_245[2] + tmp_246[2]];
    signal tmp_248[3] <== GLCMul()([0xfc02e869e21b72f8, 0, 0], tmp_2056);
    signal tmp_249[3] <== [tmp_247[0] + tmp_248[0], tmp_247[1] + tmp_248[1], tmp_247[2] + tmp_248[2]];
    signal tmp_250[3] <== GLCMul()([0x88685b4f0798dfd1, 0, 0], tmp_2060);
    signal tmp_251[3] <== [tmp_249[0] + tmp_250[0], tmp_249[1] + tmp_250[1], tmp_249[2] + tmp_250[2]];
    signal tmp_252[3] <== GLCMul()([0xb1a0132288b1619b, 0, 0], tmp_2064);
    signal tmp_253[3] <== [tmp_251[0] + tmp_252[0], tmp_251[1] + tmp_252[1], tmp_251[2] + tmp_252[2]];
    signal tmp_254[3] <== GLCMul()([0xc734f3829ed30b0c, 0, 0], tmp_2068);
    signal tmp_255[3] <== [tmp_253[0] + tmp_254[0], tmp_253[1] + tmp_254[1], tmp_253[2] + tmp_254[2]];
    signal tmp_256[3] <== GLCMul()([0x8a00c7c83c762584, 0, 0], tmp_2072);
    signal tmp_257[3] <== [tmp_255[0] + tmp_256[0], tmp_255[1] + tmp_256[1], tmp_255[2] + tmp_256[2]];
    signal tmp_258[3] <== GLCMul()([0xaad1255d46e78f07, 0, 0], tmp_2076);
    signal tmp_259[3] <== [tmp_257[0] + tmp_258[0], tmp_257[1] + tmp_258[1], tmp_257[2] + tmp_258[2]];
    signal tmp_260[3] <== GLCMul()([0x6250f5f176d483e7, 0, 0], tmp_2080);
    signal tmp_261[3] <== [tmp_259[0] + tmp_260[0], tmp_259[1] + tmp_260[1], tmp_259[2] + tmp_260[2]];
    signal tmp_262[3] <== [evals[48][0] - tmp_261[0] + p, evals[48][1] - tmp_261[1] + p, evals[48][2] - tmp_261[2] + p];
    signal tmp_263[3] <== GLCMul()(evals[41], tmp_262);
    signal tmp_2088[3] <== [tmp_263[0] - 0 + p, tmp_263[1], tmp_263[2]];
    signal tmp_264[3] <== GLCMul()([0x2044ce14eaf8f5d9, 0, 0], tmp_2036);
    signal tmp_265[3] <== GLCMul()([0xeb4c0ce280c3e935, 0, 0], tmp_2040);
    signal tmp_266[3] <== [tmp_264[0] + tmp_265[0], tmp_264[1] + tmp_265[1], tmp_264[2] + tmp_265[2]];
    signal tmp_267[3] <== GLCMul()([0x2c4916605e3dea58, 0, 0], tmp_2044);
    signal tmp_268[3] <== [tmp_266[0] + tmp_267[0], tmp_266[1] + tmp_267[1], tmp_266[2] + tmp_267[2]];
    signal tmp_269[3] <== GLCMul()([0x81c44e9699915693, 0, 0], tmp_2048);
    signal tmp_270[3] <== [tmp_268[0] + tmp_269[0], tmp_268[1] + tmp_269[1], tmp_268[2] + tmp_269[2]];
    signal tmp_271[3] <== GLCMul()([0xa4daffb3ffd0e78f, 0, 0], tmp_2052);
    signal tmp_272[3] <== [tmp_270[0] + tmp_271[0], tmp_270[1] + tmp_271[1], tmp_270[2] + tmp_271[2]];
    signal tmp_273[3] <== GLCMul()([0xb827c807875511c0, 0, 0], tmp_2056);
    signal tmp_274[3] <== [tmp_272[0] + tmp_273[0], tmp_272[1] + tmp_273[1], tmp_272[2] + tmp_273[2]];
    signal tmp_275[3] <== GLCMul()([0x39302966be7df654, 0, 0], tmp_2060);
    signal tmp_276[3] <== [tmp_274[0] + tmp_275[0], tmp_274[1] + tmp_275[1], tmp_274[2] + tmp_275[2]];
    signal tmp_277[3] <== GLCMul()([0x7c66d474cd2087cb, 0, 0], tmp_2064);
    signal tmp_278[3] <== [tmp_276[0] + tmp_277[0], tmp_276[1] + tmp_277[1], tmp_276[2] + tmp_277[2]];
    signal tmp_279[3] <== GLCMul()([0xb70fb5f2b4f1f85f, 0, 0], tmp_2068);
    signal tmp_280[3] <== [tmp_278[0] + tmp_279[0], tmp_278[1] + tmp_279[1], tmp_278[2] + tmp_279[2]];
    signal tmp_281[3] <== GLCMul()([0x2aec981be4b62ed5, 0, 0], tmp_2072);
    signal tmp_282[3] <== [tmp_280[0] + tmp_281[0], tmp_280[1] + tmp_281[1], tmp_280[2] + tmp_281[2]];
    signal tmp_283[3] <== GLCMul()([0x77c1a153e73659e8, 0, 0], tmp_2076);
    signal tmp_284[3] <== [tmp_282[0] + tmp_283[0], tmp_282[1] + tmp_283[1], tmp_282[2] + tmp_283[2]];
    signal tmp_285[3] <== GLCMul()([0xa89ef32ae1462322, 0, 0], tmp_2080);
    signal tmp_286[3] <== [tmp_284[0] + tmp_285[0], tmp_284[1] + tmp_285[1], tmp_284[2] + tmp_285[2]];
    signal tmp_287[3] <== [evals[49][0] - tmp_286[0] + p, evals[49][1] - tmp_286[1] + p, evals[49][2] - tmp_286[2] + p];
    signal tmp_288[3] <== GLCMul()(evals[41], tmp_287);
    signal tmp_2089[3] <== [tmp_288[0] - 0 + p, tmp_288[1], tmp_288[2]];
    signal tmp_289[3] <== GLCMul()([0xfb9373c8481e0f0d, 0, 0], tmp_2036);
    signal tmp_290[3] <== GLCMul()([0x17f9202c16676b2f, 0, 0], tmp_2040);
    signal tmp_291[3] <== [tmp_289[0] + tmp_290[0], tmp_289[1] + tmp_290[1], tmp_289[2] + tmp_290[2]];
    signal tmp_292[3] <== GLCMul()([0xe95c10ae32e05085, 0, 0], tmp_2044);
    signal tmp_293[3] <== [tmp_291[0] + tmp_292[0], tmp_291[1] + tmp_292[1], tmp_291[2] + tmp_292[2]];
    signal tmp_294[3] <== GLCMul()([0x62ecbe05e02433fc, 0, 0], tmp_2048);
    signal tmp_295[3] <== [tmp_293[0] + tmp_294[0], tmp_293[1] + tmp_294[1], tmp_293[2] + tmp_294[2]];
    signal tmp_296[3] <== GLCMul()([0x81c44e9699915693, 0, 0], tmp_2052);
    signal tmp_297[3] <== [tmp_295[0] + tmp_296[0], tmp_295[1] + tmp_296[1], tmp_295[2] + tmp_296[2]];
    signal tmp_298[3] <== GLCMul()([0x63c9679d8572a867, 0, 0], tmp_2056);
    signal tmp_299[3] <== [tmp_297[0] + tmp_298[0], tmp_297[1] + tmp_298[1], tmp_297[2] + tmp_298[2]];
    signal tmp_300[3] <== GLCMul()([0x462269e4b04620a5, 0, 0], tmp_2060);
    signal tmp_301[3] <== [tmp_299[0] + tmp_300[0], tmp_299[1] + tmp_300[1], tmp_299[2] + tmp_300[2]];
    signal tmp_302[3] <== GLCMul()([0xd499fcbf63fbd266, 0, 0], tmp_2064);
    signal tmp_303[3] <== [tmp_301[0] + tmp_302[0], tmp_301[1] + tmp_302[1], tmp_301[2] + tmp_302[2]];
    signal tmp_304[3] <== GLCMul()([0xe04ea1957ad8305c, 0, 0], tmp_2068);
    signal tmp_305[3] <== [tmp_303[0] + tmp_304[0], tmp_303[1] + tmp_304[1], tmp_303[2] + tmp_304[2]];
    signal tmp_306[3] <== GLCMul()([0x383dd77e07998487, 0, 0], tmp_2072);
    signal tmp_307[3] <== [tmp_305[0] + tmp_306[0], tmp_305[1] + tmp_306[1], tmp_305[2] + tmp_306[2]];
    signal tmp_308[3] <== GLCMul()([0xdb6945a20d277091, 0, 0], tmp_2076);
    signal tmp_309[3] <== [tmp_307[0] + tmp_308[0], tmp_307[1] + tmp_308[1], tmp_307[2] + tmp_308[2]];
    signal tmp_310[3] <== GLCMul()([0x60c33ebd1e023f0a, 0, 0], tmp_2080);
    signal tmp_311[3] <== [tmp_309[0] + tmp_310[0], tmp_309[1] + tmp_310[1], tmp_309[2] + tmp_310[2]];
    signal tmp_312[3] <== [evals[50][0] - tmp_311[0] + p, evals[50][1] - tmp_311[1] + p, evals[50][2] - tmp_311[2] + p];
    signal tmp_313[3] <== GLCMul()(evals[41], tmp_312);
    signal tmp_2090[3] <== [tmp_313[0] - 0 + p, tmp_313[1], tmp_313[2]];
    signal tmp_314[3] <== GLCMul()([0x72af70cdcb99214f, 0, 0], tmp_2036);
    signal tmp_315[3] <== GLCMul()([0x9b6e5164ed35d878, 0, 0], tmp_2040);
    signal tmp_316[3] <== [tmp_314[0] + tmp_315[0], tmp_314[1] + tmp_315[1], tmp_314[2] + tmp_315[2]];
    signal tmp_317[3] <== GLCMul()([0x97f9b7d2cfc2ade5, 0, 0], tmp_2044);
    signal tmp_318[3] <== [tmp_316[0] + tmp_317[0], tmp_316[1] + tmp_317[1], tmp_316[2] + tmp_317[2]];
    signal tmp_319[3] <== GLCMul()([0xe95c10ae32e05085, 0, 0], tmp_2048);
    signal tmp_320[3] <== [tmp_318[0] + tmp_319[0], tmp_318[1] + tmp_319[1], tmp_318[2] + tmp_319[2]];
    signal tmp_321[3] <== GLCMul()([0x2c4916605e3dea58, 0, 0], tmp_2052);
    signal tmp_322[3] <== [tmp_320[0] + tmp_321[0], tmp_320[1] + tmp_321[1], tmp_320[2] + tmp_321[2]];
    signal tmp_323[3] <== GLCMul()([0xa6fdb8ebccc51667, 0, 0], tmp_2056);
    signal tmp_324[3] <== [tmp_322[0] + tmp_323[0], tmp_322[1] + tmp_323[1], tmp_322[2] + tmp_323[2]];
    signal tmp_325[3] <== GLCMul()([0x3743057c07a5dbfa, 0, 0], tmp_2060);
    signal tmp_326[3] <== [tmp_324[0] + tmp_325[0], tmp_324[1] + tmp_325[1], tmp_324[2] + tmp_325[2]];
    signal tmp_327[3] <== GLCMul()([0xe6fdf23648931b99, 0, 0], tmp_2064);
    signal tmp_328[3] <== [tmp_326[0] + tmp_327[0], tmp_326[1] + tmp_327[1], tmp_326[2] + tmp_327[2]];
    signal tmp_329[3] <== GLCMul()([0xde2a0516f8c9d943, 0, 0], tmp_2068);
    signal tmp_330[3] <== [tmp_328[0] + tmp_329[0], tmp_328[1] + tmp_329[1], tmp_328[2] + tmp_329[2]];
    signal tmp_331[3] <== GLCMul()([0xfa9db0de2d852e7a, 0, 0], tmp_2072);
    signal tmp_332[3] <== [tmp_330[0] + tmp_331[0], tmp_330[1] + tmp_331[1], tmp_330[2] + tmp_331[2]];
    signal tmp_333[3] <== GLCMul()([0x2dc10fce3233f443, 0, 0], tmp_2076);
    signal tmp_334[3] <== [tmp_332[0] + tmp_333[0], tmp_332[1] + tmp_333[1], tmp_332[2] + tmp_333[2]];
    signal tmp_335[3] <== GLCMul()([0xd267254bea1097f4, 0, 0], tmp_2080);
    signal tmp_336[3] <== [tmp_334[0] + tmp_335[0], tmp_334[1] + tmp_335[1], tmp_334[2] + tmp_335[2]];
    signal tmp_337[3] <== [evals[51][0] - tmp_336[0] + p, evals[51][1] - tmp_336[1] + p, evals[51][2] - tmp_336[2] + p];
    signal tmp_338[3] <== GLCMul()(evals[41], tmp_337);
    signal tmp_2091[3] <== [tmp_338[0] - 0 + p, tmp_338[1], tmp_338[2]];
    signal tmp_339[3] <== GLCMul()([0xe3ef40eacc6ff78d, 0, 0], tmp_2036);
    signal tmp_340[3] <== GLCMul()([0x6fadc9347faeee81, 0, 0], tmp_2040);
    signal tmp_341[3] <== [tmp_339[0] + tmp_340[0], tmp_339[1] + tmp_340[1], tmp_339[2] + tmp_340[2]];
    signal tmp_342[3] <== GLCMul()([0x9b6e5164ed35d878, 0, 0], tmp_2044);
    signal tmp_343[3] <== [tmp_341[0] + tmp_342[0], tmp_341[1] + tmp_342[1], tmp_341[2] + tmp_342[2]];
    signal tmp_344[3] <== GLCMul()([0x17f9202c16676b2f, 0, 0], tmp_2048);
    signal tmp_345[3] <== [tmp_343[0] + tmp_344[0], tmp_343[1] + tmp_344[1], tmp_343[2] + tmp_344[2]];
    signal tmp_346[3] <== GLCMul()([0xeb4c0ce280c3e935, 0, 0], tmp_2052);
    signal tmp_347[3] <== [tmp_345[0] + tmp_346[0], tmp_345[1] + tmp_346[1], tmp_345[2] + tmp_346[2]];
    signal tmp_348[3] <== GLCMul()([0x66c8bab2096cfd38, 0, 0], tmp_2056);
    signal tmp_349[3] <== [tmp_347[0] + tmp_348[0], tmp_347[1] + tmp_348[1], tmp_347[2] + tmp_348[2]];
    signal tmp_350[3] <== GLCMul()([0x59ccc4d5184bc93a, 0, 0], tmp_2060);
    signal tmp_351[3] <== [tmp_349[0] + tmp_350[0], tmp_349[1] + tmp_350[1], tmp_349[2] + tmp_350[2]];
    signal tmp_352[3] <== GLCMul()([0x605a82c52b5ad2f1, 0, 0], tmp_2064);
    signal tmp_353[3] <== [tmp_351[0] + tmp_352[0], tmp_351[1] + tmp_352[1], tmp_351[2] + tmp_352[2]];
    signal tmp_354[3] <== GLCMul()([0x727eca45c8d7bb71, 0, 0], tmp_2068);
    signal tmp_355[3] <== [tmp_353[0] + tmp_354[0], tmp_353[1] + tmp_354[1], tmp_353[2] + tmp_354[2]];
    signal tmp_356[3] <== GLCMul()([0x7a5cf5b7b922e946, 0, 0], tmp_2072);
    signal tmp_357[3] <== [tmp_355[0] + tmp_356[0], tmp_355[1] + tmp_356[1], tmp_355[2] + tmp_356[2]];
    signal tmp_358[3] <== GLCMul()([0x819f2c14a8366b1f, 0, 0], tmp_2076);
    signal tmp_359[3] <== [tmp_357[0] + tmp_358[0], tmp_357[1] + tmp_358[1], tmp_357[2] + tmp_358[2]];
    signal tmp_360[3] <== GLCMul()([0x817bd8a7869ed1b5, 0, 0], tmp_2080);
    signal tmp_361[3] <== [tmp_359[0] + tmp_360[0], tmp_359[1] + tmp_360[1], tmp_359[2] + tmp_360[2]];
    signal tmp_362[3] <== [evals[52][0] - tmp_361[0] + p, evals[52][1] - tmp_361[1] + p, evals[52][2] - tmp_361[2] + p];
    signal tmp_363[3] <== GLCMul()(evals[41], tmp_362);
    signal tmp_2092[3] <== [tmp_363[0] - 0 + p, tmp_363[1], tmp_363[2]];
    signal tmp_364[3] <== GLCMul()([0x19, 0, 0], tmp_2036);
    signal tmp_365[3] <== GLCMul()([0xf, 0, 0], tmp_2040);
    signal tmp_366[3] <== [tmp_364[0] + tmp_365[0], tmp_364[1] + tmp_365[1], tmp_364[2] + tmp_365[2]];
    signal tmp_367[3] <== GLCMul()([0x29, 0, 0], tmp_2044);
    signal tmp_368[3] <== [tmp_366[0] + tmp_367[0], tmp_366[1] + tmp_367[1], tmp_366[2] + tmp_367[2]];
    signal tmp_369[3] <== GLCMul()([0x10, 0, 0], tmp_2048);
    signal tmp_370[3] <== [tmp_368[0] + tmp_369[0], tmp_368[1] + tmp_369[1], tmp_368[2] + tmp_369[2]];
    signal tmp_371[3] <== GLCMul()([0x2, 0, 0], tmp_2052);
    signal tmp_372[3] <== [tmp_370[0] + tmp_371[0], tmp_370[1] + tmp_371[1], tmp_370[2] + tmp_371[2]];
    signal tmp_373[3] <== GLCMul()([0x1c, 0, 0], tmp_2056);
    signal tmp_374[3] <== [tmp_372[0] + tmp_373[0], tmp_372[1] + tmp_373[1], tmp_372[2] + tmp_373[2]];
    signal tmp_375[3] <== GLCMul()([0xd, 0, 0], tmp_2060);
    signal tmp_376[3] <== [tmp_374[0] + tmp_375[0], tmp_374[1] + tmp_375[1], tmp_374[2] + tmp_375[2]];
    signal tmp_377[3] <== GLCMul()([0xd, 0, 0], tmp_2064);
    signal tmp_378[3] <== [tmp_376[0] + tmp_377[0], tmp_376[1] + tmp_377[1], tmp_376[2] + tmp_377[2]];
    signal tmp_379[3] <== GLCMul()([0x27, 0, 0], tmp_2068);
    signal tmp_380[3] <== [tmp_378[0] + tmp_379[0], tmp_378[1] + tmp_379[1], tmp_378[2] + tmp_379[2]];
    signal tmp_381[3] <== GLCMul()([0x12, 0, 0], tmp_2072);
    signal tmp_382[3] <== [tmp_380[0] + tmp_381[0], tmp_380[1] + tmp_381[1], tmp_380[2] + tmp_381[2]];
    signal tmp_383[3] <== GLCMul()([0x22, 0, 0], tmp_2076);
    signal tmp_384[3] <== [tmp_382[0] + tmp_383[0], tmp_382[1] + tmp_383[1], tmp_382[2] + tmp_383[2]];
    signal tmp_385[3] <== GLCMul()([0x14, 0, 0], tmp_2080);
    signal tmp_386[3] <== [tmp_384[0] + tmp_385[0], tmp_384[1] + tmp_385[1], tmp_384[2] + tmp_385[2]];
    signal tmp_387[3] <== [evals[40][0] - tmp_386[0] + p, evals[40][1] - tmp_386[1] + p, evals[40][2] - tmp_386[2] + p];
    signal tmp_388[3] <== GLCMul()(evals[53], tmp_387);
    signal tmp_2093[3] <== [tmp_388[0] - 0 + p, tmp_388[1], tmp_388[2]];
    signal tmp_389[3] <== GLCMul()([0x14, 0, 0], tmp_2036);
    signal tmp_390[3] <== GLCMul()([0x11, 0, 0], tmp_2040);
    signal tmp_391[3] <== [tmp_389[0] + tmp_390[0], tmp_389[1] + tmp_390[1], tmp_389[2] + tmp_390[2]];
    signal tmp_392[3] <== GLCMul()([0xf, 0, 0], tmp_2044);
    signal tmp_393[3] <== [tmp_391[0] + tmp_392[0], tmp_391[1] + tmp_392[1], tmp_391[2] + tmp_392[2]];
    signal tmp_394[3] <== GLCMul()([0x29, 0, 0], tmp_2048);
    signal tmp_395[3] <== [tmp_393[0] + tmp_394[0], tmp_393[1] + tmp_394[1], tmp_393[2] + tmp_394[2]];
    signal tmp_396[3] <== GLCMul()([0x10, 0, 0], tmp_2052);
    signal tmp_397[3] <== [tmp_395[0] + tmp_396[0], tmp_395[1] + tmp_396[1], tmp_395[2] + tmp_396[2]];
    signal tmp_398[3] <== GLCMul()([0x2, 0, 0], tmp_2056);
    signal tmp_399[3] <== [tmp_397[0] + tmp_398[0], tmp_397[1] + tmp_398[1], tmp_397[2] + tmp_398[2]];
    signal tmp_400[3] <== GLCMul()([0x1c, 0, 0], tmp_2060);
    signal tmp_401[3] <== [tmp_399[0] + tmp_400[0], tmp_399[1] + tmp_400[1], tmp_399[2] + tmp_400[2]];
    signal tmp_402[3] <== GLCMul()([0xd, 0, 0], tmp_2064);
    signal tmp_403[3] <== [tmp_401[0] + tmp_402[0], tmp_401[1] + tmp_402[1], tmp_401[2] + tmp_402[2]];
    signal tmp_404[3] <== GLCMul()([0xd, 0, 0], tmp_2068);
    signal tmp_405[3] <== [tmp_403[0] + tmp_404[0], tmp_403[1] + tmp_404[1], tmp_403[2] + tmp_404[2]];
    signal tmp_406[3] <== GLCMul()([0x27, 0, 0], tmp_2072);
    signal tmp_407[3] <== [tmp_405[0] + tmp_406[0], tmp_405[1] + tmp_406[1], tmp_405[2] + tmp_406[2]];
    signal tmp_408[3] <== GLCMul()([0x12, 0, 0], tmp_2076);
    signal tmp_409[3] <== [tmp_407[0] + tmp_408[0], tmp_407[1] + tmp_408[1], tmp_407[2] + tmp_408[2]];
    signal tmp_410[3] <== GLCMul()([0x22, 0, 0], tmp_2080);
    signal tmp_411[3] <== [tmp_409[0] + tmp_410[0], tmp_409[1] + tmp_410[1], tmp_409[2] + tmp_410[2]];
    signal tmp_412[3] <== [evals[42][0] - tmp_411[0] + p, evals[42][1] - tmp_411[1] + p, evals[42][2] - tmp_411[2] + p];
    signal tmp_413[3] <== GLCMul()(evals[53], tmp_412);
    signal tmp_2094[3] <== [tmp_413[0] - 0 + p, tmp_413[1], tmp_413[2]];
    signal tmp_414[3] <== GLCMul()([0x22, 0, 0], tmp_2036);
    signal tmp_415[3] <== GLCMul()([0x14, 0, 0], tmp_2040);
    signal tmp_416[3] <== [tmp_414[0] + tmp_415[0], tmp_414[1] + tmp_415[1], tmp_414[2] + tmp_415[2]];
    signal tmp_417[3] <== GLCMul()([0x11, 0, 0], tmp_2044);
    signal tmp_418[3] <== [tmp_416[0] + tmp_417[0], tmp_416[1] + tmp_417[1], tmp_416[2] + tmp_417[2]];
    signal tmp_419[3] <== GLCMul()([0xf, 0, 0], tmp_2048);
    signal tmp_420[3] <== [tmp_418[0] + tmp_419[0], tmp_418[1] + tmp_419[1], tmp_418[2] + tmp_419[2]];
    signal tmp_421[3] <== GLCMul()([0x29, 0, 0], tmp_2052);
    signal tmp_422[3] <== [tmp_420[0] + tmp_421[0], tmp_420[1] + tmp_421[1], tmp_420[2] + tmp_421[2]];
    signal tmp_423[3] <== GLCMul()([0x10, 0, 0], tmp_2056);
    signal tmp_424[3] <== [tmp_422[0] + tmp_423[0], tmp_422[1] + tmp_423[1], tmp_422[2] + tmp_423[2]];
    signal tmp_425[3] <== GLCMul()([0x2, 0, 0], tmp_2060);
    signal tmp_426[3] <== [tmp_424[0] + tmp_425[0], tmp_424[1] + tmp_425[1], tmp_424[2] + tmp_425[2]];
    signal tmp_427[3] <== GLCMul()([0x1c, 0, 0], tmp_2064);
    signal tmp_428[3] <== [tmp_426[0] + tmp_427[0], tmp_426[1] + tmp_427[1], tmp_426[2] + tmp_427[2]];
    signal tmp_429[3] <== GLCMul()([0xd, 0, 0], tmp_2068);
    signal tmp_430[3] <== [tmp_428[0] + tmp_429[0], tmp_428[1] + tmp_429[1], tmp_428[2] + tmp_429[2]];
    signal tmp_431[3] <== GLCMul()([0xd, 0, 0], tmp_2072);
    signal tmp_432[3] <== [tmp_430[0] + tmp_431[0], tmp_430[1] + tmp_431[1], tmp_430[2] + tmp_431[2]];
    signal tmp_433[3] <== GLCMul()([0x27, 0, 0], tmp_2076);
    signal tmp_434[3] <== [tmp_432[0] + tmp_433[0], tmp_432[1] + tmp_433[1], tmp_432[2] + tmp_433[2]];
    signal tmp_435[3] <== GLCMul()([0x12, 0, 0], tmp_2080);
    signal tmp_436[3] <== [tmp_434[0] + tmp_435[0], tmp_434[1] + tmp_435[1], tmp_434[2] + tmp_435[2]];
    signal tmp_437[3] <== [evals[43][0] - tmp_436[0] + p, evals[43][1] - tmp_436[1] + p, evals[43][2] - tmp_436[2] + p];
    signal tmp_438[3] <== GLCMul()(evals[53], tmp_437);
    signal tmp_2095[3] <== [tmp_438[0] - 0 + p, tmp_438[1], tmp_438[2]];
    signal tmp_439[3] <== GLCMul()([0x12, 0, 0], tmp_2036);
    signal tmp_440[3] <== GLCMul()([0x22, 0, 0], tmp_2040);
    signal tmp_441[3] <== [tmp_439[0] + tmp_440[0], tmp_439[1] + tmp_440[1], tmp_439[2] + tmp_440[2]];
    signal tmp_442[3] <== GLCMul()([0x14, 0, 0], tmp_2044);
    signal tmp_443[3] <== [tmp_441[0] + tmp_442[0], tmp_441[1] + tmp_442[1], tmp_441[2] + tmp_442[2]];
    signal tmp_444[3] <== GLCMul()([0x11, 0, 0], tmp_2048);
    signal tmp_445[3] <== [tmp_443[0] + tmp_444[0], tmp_443[1] + tmp_444[1], tmp_443[2] + tmp_444[2]];
    signal tmp_446[3] <== GLCMul()([0xf, 0, 0], tmp_2052);
    signal tmp_447[3] <== [tmp_445[0] + tmp_446[0], tmp_445[1] + tmp_446[1], tmp_445[2] + tmp_446[2]];
    signal tmp_448[3] <== GLCMul()([0x29, 0, 0], tmp_2056);
    signal tmp_449[3] <== [tmp_447[0] + tmp_448[0], tmp_447[1] + tmp_448[1], tmp_447[2] + tmp_448[2]];
    signal tmp_450[3] <== GLCMul()([0x10, 0, 0], tmp_2060);
    signal tmp_451[3] <== [tmp_449[0] + tmp_450[0], tmp_449[1] + tmp_450[1], tmp_449[2] + tmp_450[2]];
    signal tmp_452[3] <== GLCMul()([0x2, 0, 0], tmp_2064);
    signal tmp_453[3] <== [tmp_451[0] + tmp_452[0], tmp_451[1] + tmp_452[1], tmp_451[2] + tmp_452[2]];
    signal tmp_454[3] <== GLCMul()([0x1c, 0, 0], tmp_2068);
    signal tmp_455[3] <== [tmp_453[0] + tmp_454[0], tmp_453[1] + tmp_454[1], tmp_453[2] + tmp_454[2]];
    signal tmp_456[3] <== GLCMul()([0xd, 0, 0], tmp_2072);
    signal tmp_457[3] <== [tmp_455[0] + tmp_456[0], tmp_455[1] + tmp_456[1], tmp_455[2] + tmp_456[2]];
    signal tmp_458[3] <== GLCMul()([0xd, 0, 0], tmp_2076);
    signal tmp_459[3] <== [tmp_457[0] + tmp_458[0], tmp_457[1] + tmp_458[1], tmp_457[2] + tmp_458[2]];
    signal tmp_460[3] <== GLCMul()([0x27, 0, 0], tmp_2080);
    signal tmp_461[3] <== [tmp_459[0] + tmp_460[0], tmp_459[1] + tmp_460[1], tmp_459[2] + tmp_460[2]];
    signal tmp_462[3] <== [evals[44][0] - tmp_461[0] + p, evals[44][1] - tmp_461[1] + p, evals[44][2] - tmp_461[2] + p];
    signal tmp_463[3] <== GLCMul()(evals[53], tmp_462);
    signal tmp_2096[3] <== [tmp_463[0] - 0 + p, tmp_463[1], tmp_463[2]];
    signal tmp_464[3] <== GLCMul()([0x27, 0, 0], tmp_2036);
    signal tmp_465[3] <== GLCMul()([0x12, 0, 0], tmp_2040);
    signal tmp_466[3] <== [tmp_464[0] + tmp_465[0], tmp_464[1] + tmp_465[1], tmp_464[2] + tmp_465[2]];
    signal tmp_467[3] <== GLCMul()([0x22, 0, 0], tmp_2044);
    signal tmp_468[3] <== [tmp_466[0] + tmp_467[0], tmp_466[1] + tmp_467[1], tmp_466[2] + tmp_467[2]];
    signal tmp_469[3] <== GLCMul()([0x14, 0, 0], tmp_2048);
    signal tmp_470[3] <== [tmp_468[0] + tmp_469[0], tmp_468[1] + tmp_469[1], tmp_468[2] + tmp_469[2]];
    signal tmp_471[3] <== GLCMul()([0x11, 0, 0], tmp_2052);
    signal tmp_472[3] <== [tmp_470[0] + tmp_471[0], tmp_470[1] + tmp_471[1], tmp_470[2] + tmp_471[2]];
    signal tmp_473[3] <== GLCMul()([0xf, 0, 0], tmp_2056);
    signal tmp_474[3] <== [tmp_472[0] + tmp_473[0], tmp_472[1] + tmp_473[1], tmp_472[2] + tmp_473[2]];
    signal tmp_475[3] <== GLCMul()([0x29, 0, 0], tmp_2060);
    signal tmp_476[3] <== [tmp_474[0] + tmp_475[0], tmp_474[1] + tmp_475[1], tmp_474[2] + tmp_475[2]];
    signal tmp_477[3] <== GLCMul()([0x10, 0, 0], tmp_2064);
    signal tmp_478[3] <== [tmp_476[0] + tmp_477[0], tmp_476[1] + tmp_477[1], tmp_476[2] + tmp_477[2]];
    signal tmp_479[3] <== GLCMul()([0x2, 0, 0], tmp_2068);
    signal tmp_480[3] <== [tmp_478[0] + tmp_479[0], tmp_478[1] + tmp_479[1], tmp_478[2] + tmp_479[2]];
    signal tmp_481[3] <== GLCMul()([0x1c, 0, 0], tmp_2072);
    signal tmp_482[3] <== [tmp_480[0] + tmp_481[0], tmp_480[1] + tmp_481[1], tmp_480[2] + tmp_481[2]];
    signal tmp_483[3] <== GLCMul()([0xd, 0, 0], tmp_2076);
    signal tmp_484[3] <== [tmp_482[0] + tmp_483[0], tmp_482[1] + tmp_483[1], tmp_482[2] + tmp_483[2]];
    signal tmp_485[3] <== GLCMul()([0xd, 0, 0], tmp_2080);
    signal tmp_486[3] <== [tmp_484[0] + tmp_485[0], tmp_484[1] + tmp_485[1], tmp_484[2] + tmp_485[2]];
    signal tmp_487[3] <== [evals[45][0] - tmp_486[0] + p, evals[45][1] - tmp_486[1] + p, evals[45][2] - tmp_486[2] + p];
    signal tmp_488[3] <== GLCMul()(evals[53], tmp_487);
    signal tmp_2097[3] <== [tmp_488[0] - 0 + p, tmp_488[1], tmp_488[2]];
    signal tmp_489[3] <== GLCMul()([0xd, 0, 0], tmp_2036);
    signal tmp_490[3] <== GLCMul()([0x27, 0, 0], tmp_2040);
    signal tmp_491[3] <== [tmp_489[0] + tmp_490[0], tmp_489[1] + tmp_490[1], tmp_489[2] + tmp_490[2]];
    signal tmp_492[3] <== GLCMul()([0x12, 0, 0], tmp_2044);
    signal tmp_493[3] <== [tmp_491[0] + tmp_492[0], tmp_491[1] + tmp_492[1], tmp_491[2] + tmp_492[2]];
    signal tmp_494[3] <== GLCMul()([0x22, 0, 0], tmp_2048);
    signal tmp_495[3] <== [tmp_493[0] + tmp_494[0], tmp_493[1] + tmp_494[1], tmp_493[2] + tmp_494[2]];
    signal tmp_496[3] <== GLCMul()([0x14, 0, 0], tmp_2052);
    signal tmp_497[3] <== [tmp_495[0] + tmp_496[0], tmp_495[1] + tmp_496[1], tmp_495[2] + tmp_496[2]];
    signal tmp_498[3] <== GLCMul()([0x11, 0, 0], tmp_2056);
    signal tmp_499[3] <== [tmp_497[0] + tmp_498[0], tmp_497[1] + tmp_498[1], tmp_497[2] + tmp_498[2]];
    signal tmp_500[3] <== GLCMul()([0xf, 0, 0], tmp_2060);
    signal tmp_501[3] <== [tmp_499[0] + tmp_500[0], tmp_499[1] + tmp_500[1], tmp_499[2] + tmp_500[2]];
    signal tmp_502[3] <== GLCMul()([0x29, 0, 0], tmp_2064);
    signal tmp_503[3] <== [tmp_501[0] + tmp_502[0], tmp_501[1] + tmp_502[1], tmp_501[2] + tmp_502[2]];
    signal tmp_504[3] <== GLCMul()([0x10, 0, 0], tmp_2068);
    signal tmp_505[3] <== [tmp_503[0] + tmp_504[0], tmp_503[1] + tmp_504[1], tmp_503[2] + tmp_504[2]];
    signal tmp_506[3] <== GLCMul()([0x2, 0, 0], tmp_2072);
    signal tmp_507[3] <== [tmp_505[0] + tmp_506[0], tmp_505[1] + tmp_506[1], tmp_505[2] + tmp_506[2]];
    signal tmp_508[3] <== GLCMul()([0x1c, 0, 0], tmp_2076);
    signal tmp_509[3] <== [tmp_507[0] + tmp_508[0], tmp_507[1] + tmp_508[1], tmp_507[2] + tmp_508[2]];
    signal tmp_510[3] <== GLCMul()([0xd, 0, 0], tmp_2080);
    signal tmp_511[3] <== [tmp_509[0] + tmp_510[0], tmp_509[1] + tmp_510[1], tmp_509[2] + tmp_510[2]];
    signal tmp_512[3] <== [evals[46][0] - tmp_511[0] + p, evals[46][1] - tmp_511[1] + p, evals[46][2] - tmp_511[2] + p];
    signal tmp_513[3] <== GLCMul()(evals[53], tmp_512);
    signal tmp_2098[3] <== [tmp_513[0] - 0 + p, tmp_513[1], tmp_513[2]];
    signal tmp_514[3] <== GLCMul()([0xd, 0, 0], tmp_2036);
    signal tmp_515[3] <== GLCMul()([0xd, 0, 0], tmp_2040);
    signal tmp_516[3] <== [tmp_514[0] + tmp_515[0], tmp_514[1] + tmp_515[1], tmp_514[2] + tmp_515[2]];
    signal tmp_517[3] <== GLCMul()([0x27, 0, 0], tmp_2044);
    signal tmp_518[3] <== [tmp_516[0] + tmp_517[0], tmp_516[1] + tmp_517[1], tmp_516[2] + tmp_517[2]];
    signal tmp_519[3] <== GLCMul()([0x12, 0, 0], tmp_2048);
    signal tmp_520[3] <== [tmp_518[0] + tmp_519[0], tmp_518[1] + tmp_519[1], tmp_518[2] + tmp_519[2]];
    signal tmp_521[3] <== GLCMul()([0x22, 0, 0], tmp_2052);
    signal tmp_522[3] <== [tmp_520[0] + tmp_521[0], tmp_520[1] + tmp_521[1], tmp_520[2] + tmp_521[2]];
    signal tmp_523[3] <== GLCMul()([0x14, 0, 0], tmp_2056);
    signal tmp_524[3] <== [tmp_522[0] + tmp_523[0], tmp_522[1] + tmp_523[1], tmp_522[2] + tmp_523[2]];
    signal tmp_525[3] <== GLCMul()([0x11, 0, 0], tmp_2060);
    signal tmp_526[3] <== [tmp_524[0] + tmp_525[0], tmp_524[1] + tmp_525[1], tmp_524[2] + tmp_525[2]];
    signal tmp_527[3] <== GLCMul()([0xf, 0, 0], tmp_2064);
    signal tmp_528[3] <== [tmp_526[0] + tmp_527[0], tmp_526[1] + tmp_527[1], tmp_526[2] + tmp_527[2]];
    signal tmp_529[3] <== GLCMul()([0x29, 0, 0], tmp_2068);
    signal tmp_530[3] <== [tmp_528[0] + tmp_529[0], tmp_528[1] + tmp_529[1], tmp_528[2] + tmp_529[2]];
    signal tmp_531[3] <== GLCMul()([0x10, 0, 0], tmp_2072);
    signal tmp_532[3] <== [tmp_530[0] + tmp_531[0], tmp_530[1] + tmp_531[1], tmp_530[2] + tmp_531[2]];
    signal tmp_533[3] <== GLCMul()([0x2, 0, 0], tmp_2076);
    signal tmp_534[3] <== [tmp_532[0] + tmp_533[0], tmp_532[1] + tmp_533[1], tmp_532[2] + tmp_533[2]];
    signal tmp_535[3] <== GLCMul()([0x1c, 0, 0], tmp_2080);
    signal tmp_536[3] <== [tmp_534[0] + tmp_535[0], tmp_534[1] + tmp_535[1], tmp_534[2] + tmp_535[2]];
    signal tmp_537[3] <== [evals[47][0] - tmp_536[0] + p, evals[47][1] - tmp_536[1] + p, evals[47][2] - tmp_536[2] + p];
    signal tmp_538[3] <== GLCMul()(evals[53], tmp_537);
    signal tmp_2099[3] <== [tmp_538[0] - 0 + p, tmp_538[1], tmp_538[2]];
    signal tmp_539[3] <== GLCMul()([0x1c, 0, 0], tmp_2036);
    signal tmp_540[3] <== GLCMul()([0xd, 0, 0], tmp_2040);
    signal tmp_541[3] <== [tmp_539[0] + tmp_540[0], tmp_539[1] + tmp_540[1], tmp_539[2] + tmp_540[2]];
    signal tmp_542[3] <== GLCMul()([0xd, 0, 0], tmp_2044);
    signal tmp_543[3] <== [tmp_541[0] + tmp_542[0], tmp_541[1] + tmp_542[1], tmp_541[2] + tmp_542[2]];
    signal tmp_544[3] <== GLCMul()([0x27, 0, 0], tmp_2048);
    signal tmp_545[3] <== [tmp_543[0] + tmp_544[0], tmp_543[1] + tmp_544[1], tmp_543[2] + tmp_544[2]];
    signal tmp_546[3] <== GLCMul()([0x12, 0, 0], tmp_2052);
    signal tmp_547[3] <== [tmp_545[0] + tmp_546[0], tmp_545[1] + tmp_546[1], tmp_545[2] + tmp_546[2]];
    signal tmp_548[3] <== GLCMul()([0x22, 0, 0], tmp_2056);
    signal tmp_549[3] <== [tmp_547[0] + tmp_548[0], tmp_547[1] + tmp_548[1], tmp_547[2] + tmp_548[2]];
    signal tmp_550[3] <== GLCMul()([0x14, 0, 0], tmp_2060);
    signal tmp_551[3] <== [tmp_549[0] + tmp_550[0], tmp_549[1] + tmp_550[1], tmp_549[2] + tmp_550[2]];
    signal tmp_552[3] <== GLCMul()([0x11, 0, 0], tmp_2064);
    signal tmp_553[3] <== [tmp_551[0] + tmp_552[0], tmp_551[1] + tmp_552[1], tmp_551[2] + tmp_552[2]];
    signal tmp_554[3] <== GLCMul()([0xf, 0, 0], tmp_2068);
    signal tmp_555[3] <== [tmp_553[0] + tmp_554[0], tmp_553[1] + tmp_554[1], tmp_553[2] + tmp_554[2]];
    signal tmp_556[3] <== GLCMul()([0x29, 0, 0], tmp_2072);
    signal tmp_557[3] <== [tmp_555[0] + tmp_556[0], tmp_555[1] + tmp_556[1], tmp_555[2] + tmp_556[2]];
    signal tmp_558[3] <== GLCMul()([0x10, 0, 0], tmp_2076);
    signal tmp_559[3] <== [tmp_557[0] + tmp_558[0], tmp_557[1] + tmp_558[1], tmp_557[2] + tmp_558[2]];
    signal tmp_560[3] <== GLCMul()([0x2, 0, 0], tmp_2080);
    signal tmp_561[3] <== [tmp_559[0] + tmp_560[0], tmp_559[1] + tmp_560[1], tmp_559[2] + tmp_560[2]];
    signal tmp_562[3] <== [evals[48][0] - tmp_561[0] + p, evals[48][1] - tmp_561[1] + p, evals[48][2] - tmp_561[2] + p];
    signal tmp_563[3] <== GLCMul()(evals[53], tmp_562);
    signal tmp_2100[3] <== [tmp_563[0] - 0 + p, tmp_563[1], tmp_563[2]];
    signal tmp_564[3] <== GLCMul()([0x2, 0, 0], tmp_2036);
    signal tmp_565[3] <== GLCMul()([0x1c, 0, 0], tmp_2040);
    signal tmp_566[3] <== [tmp_564[0] + tmp_565[0], tmp_564[1] + tmp_565[1], tmp_564[2] + tmp_565[2]];
    signal tmp_567[3] <== GLCMul()([0xd, 0, 0], tmp_2044);
    signal tmp_568[3] <== [tmp_566[0] + tmp_567[0], tmp_566[1] + tmp_567[1], tmp_566[2] + tmp_567[2]];
    signal tmp_569[3] <== GLCMul()([0xd, 0, 0], tmp_2048);
    signal tmp_570[3] <== [tmp_568[0] + tmp_569[0], tmp_568[1] + tmp_569[1], tmp_568[2] + tmp_569[2]];
    signal tmp_571[3] <== GLCMul()([0x27, 0, 0], tmp_2052);
    signal tmp_572[3] <== [tmp_570[0] + tmp_571[0], tmp_570[1] + tmp_571[1], tmp_570[2] + tmp_571[2]];
    signal tmp_573[3] <== GLCMul()([0x12, 0, 0], tmp_2056);
    signal tmp_574[3] <== [tmp_572[0] + tmp_573[0], tmp_572[1] + tmp_573[1], tmp_572[2] + tmp_573[2]];
    signal tmp_575[3] <== GLCMul()([0x22, 0, 0], tmp_2060);
    signal tmp_576[3] <== [tmp_574[0] + tmp_575[0], tmp_574[1] + tmp_575[1], tmp_574[2] + tmp_575[2]];
    signal tmp_577[3] <== GLCMul()([0x14, 0, 0], tmp_2064);
    signal tmp_578[3] <== [tmp_576[0] + tmp_577[0], tmp_576[1] + tmp_577[1], tmp_576[2] + tmp_577[2]];
    signal tmp_579[3] <== GLCMul()([0x11, 0, 0], tmp_2068);
    signal tmp_580[3] <== [tmp_578[0] + tmp_579[0], tmp_578[1] + tmp_579[1], tmp_578[2] + tmp_579[2]];
    signal tmp_581[3] <== GLCMul()([0xf, 0, 0], tmp_2072);
    signal tmp_582[3] <== [tmp_580[0] + tmp_581[0], tmp_580[1] + tmp_581[1], tmp_580[2] + tmp_581[2]];
    signal tmp_583[3] <== GLCMul()([0x29, 0, 0], tmp_2076);
    signal tmp_584[3] <== [tmp_582[0] + tmp_583[0], tmp_582[1] + tmp_583[1], tmp_582[2] + tmp_583[2]];
    signal tmp_585[3] <== GLCMul()([0x10, 0, 0], tmp_2080);
    signal tmp_586[3] <== [tmp_584[0] + tmp_585[0], tmp_584[1] + tmp_585[1], tmp_584[2] + tmp_585[2]];
    signal tmp_587[3] <== [evals[49][0] - tmp_586[0] + p, evals[49][1] - tmp_586[1] + p, evals[49][2] - tmp_586[2] + p];
    signal tmp_588[3] <== GLCMul()(evals[53], tmp_587);
    signal tmp_2101[3] <== [tmp_588[0] - 0 + p, tmp_588[1], tmp_588[2]];
    signal tmp_589[3] <== GLCMul()([0x10, 0, 0], tmp_2036);
    signal tmp_590[3] <== GLCMul()([0x2, 0, 0], tmp_2040);
    signal tmp_591[3] <== [tmp_589[0] + tmp_590[0], tmp_589[1] + tmp_590[1], tmp_589[2] + tmp_590[2]];
    signal tmp_592[3] <== GLCMul()([0x1c, 0, 0], tmp_2044);
    signal tmp_593[3] <== [tmp_591[0] + tmp_592[0], tmp_591[1] + tmp_592[1], tmp_591[2] + tmp_592[2]];
    signal tmp_594[3] <== GLCMul()([0xd, 0, 0], tmp_2048);
    signal tmp_595[3] <== [tmp_593[0] + tmp_594[0], tmp_593[1] + tmp_594[1], tmp_593[2] + tmp_594[2]];
    signal tmp_596[3] <== GLCMul()([0xd, 0, 0], tmp_2052);
    signal tmp_597[3] <== [tmp_595[0] + tmp_596[0], tmp_595[1] + tmp_596[1], tmp_595[2] + tmp_596[2]];
    signal tmp_598[3] <== GLCMul()([0x27, 0, 0], tmp_2056);
    signal tmp_599[3] <== [tmp_597[0] + tmp_598[0], tmp_597[1] + tmp_598[1], tmp_597[2] + tmp_598[2]];
    signal tmp_600[3] <== GLCMul()([0x12, 0, 0], tmp_2060);
    signal tmp_601[3] <== [tmp_599[0] + tmp_600[0], tmp_599[1] + tmp_600[1], tmp_599[2] + tmp_600[2]];
    signal tmp_602[3] <== GLCMul()([0x22, 0, 0], tmp_2064);
    signal tmp_603[3] <== [tmp_601[0] + tmp_602[0], tmp_601[1] + tmp_602[1], tmp_601[2] + tmp_602[2]];
    signal tmp_604[3] <== GLCMul()([0x14, 0, 0], tmp_2068);
    signal tmp_605[3] <== [tmp_603[0] + tmp_604[0], tmp_603[1] + tmp_604[1], tmp_603[2] + tmp_604[2]];
    signal tmp_606[3] <== GLCMul()([0x11, 0, 0], tmp_2072);
    signal tmp_607[3] <== [tmp_605[0] + tmp_606[0], tmp_605[1] + tmp_606[1], tmp_605[2] + tmp_606[2]];
    signal tmp_608[3] <== GLCMul()([0xf, 0, 0], tmp_2076);
    signal tmp_609[3] <== [tmp_607[0] + tmp_608[0], tmp_607[1] + tmp_608[1], tmp_607[2] + tmp_608[2]];
    signal tmp_610[3] <== GLCMul()([0x29, 0, 0], tmp_2080);
    signal tmp_611[3] <== [tmp_609[0] + tmp_610[0], tmp_609[1] + tmp_610[1], tmp_609[2] + tmp_610[2]];
    signal tmp_612[3] <== [evals[50][0] - tmp_611[0] + p, evals[50][1] - tmp_611[1] + p, evals[50][2] - tmp_611[2] + p];
    signal tmp_613[3] <== GLCMul()(evals[53], tmp_612);
    signal tmp_2102[3] <== [tmp_613[0] - 0 + p, tmp_613[1], tmp_613[2]];
    signal tmp_614[3] <== GLCMul()([0x29, 0, 0], tmp_2036);
    signal tmp_615[3] <== GLCMul()([0x10, 0, 0], tmp_2040);
    signal tmp_616[3] <== [tmp_614[0] + tmp_615[0], tmp_614[1] + tmp_615[1], tmp_614[2] + tmp_615[2]];
    signal tmp_617[3] <== GLCMul()([0x2, 0, 0], tmp_2044);
    signal tmp_618[3] <== [tmp_616[0] + tmp_617[0], tmp_616[1] + tmp_617[1], tmp_616[2] + tmp_617[2]];
    signal tmp_619[3] <== GLCMul()([0x1c, 0, 0], tmp_2048);
    signal tmp_620[3] <== [tmp_618[0] + tmp_619[0], tmp_618[1] + tmp_619[1], tmp_618[2] + tmp_619[2]];
    signal tmp_621[3] <== GLCMul()([0xd, 0, 0], tmp_2052);
    signal tmp_622[3] <== [tmp_620[0] + tmp_621[0], tmp_620[1] + tmp_621[1], tmp_620[2] + tmp_621[2]];
    signal tmp_623[3] <== GLCMul()([0xd, 0, 0], tmp_2056);
    signal tmp_624[3] <== [tmp_622[0] + tmp_623[0], tmp_622[1] + tmp_623[1], tmp_622[2] + tmp_623[2]];
    signal tmp_625[3] <== GLCMul()([0x27, 0, 0], tmp_2060);
    signal tmp_626[3] <== [tmp_624[0] + tmp_625[0], tmp_624[1] + tmp_625[1], tmp_624[2] + tmp_625[2]];
    signal tmp_627[3] <== GLCMul()([0x12, 0, 0], tmp_2064);
    signal tmp_628[3] <== [tmp_626[0] + tmp_627[0], tmp_626[1] + tmp_627[1], tmp_626[2] + tmp_627[2]];
    signal tmp_629[3] <== GLCMul()([0x22, 0, 0], tmp_2068);
    signal tmp_630[3] <== [tmp_628[0] + tmp_629[0], tmp_628[1] + tmp_629[1], tmp_628[2] + tmp_629[2]];
    signal tmp_631[3] <== GLCMul()([0x14, 0, 0], tmp_2072);
    signal tmp_632[3] <== [tmp_630[0] + tmp_631[0], tmp_630[1] + tmp_631[1], tmp_630[2] + tmp_631[2]];
    signal tmp_633[3] <== GLCMul()([0x11, 0, 0], tmp_2076);
    signal tmp_634[3] <== [tmp_632[0] + tmp_633[0], tmp_632[1] + tmp_633[1], tmp_632[2] + tmp_633[2]];
    signal tmp_635[3] <== GLCMul()([0xf, 0, 0], tmp_2080);
    signal tmp_636[3] <== [tmp_634[0] + tmp_635[0], tmp_634[1] + tmp_635[1], tmp_634[2] + tmp_635[2]];
    signal tmp_637[3] <== [evals[51][0] - tmp_636[0] + p, evals[51][1] - tmp_636[1] + p, evals[51][2] - tmp_636[2] + p];
    signal tmp_638[3] <== GLCMul()(evals[53], tmp_637);
    signal tmp_2103[3] <== [tmp_638[0] - 0 + p, tmp_638[1], tmp_638[2]];
    signal tmp_639[3] <== GLCMul()([0xf, 0, 0], tmp_2036);
    signal tmp_640[3] <== GLCMul()([0x29, 0, 0], tmp_2040);
    signal tmp_641[3] <== [tmp_639[0] + tmp_640[0], tmp_639[1] + tmp_640[1], tmp_639[2] + tmp_640[2]];
    signal tmp_642[3] <== GLCMul()([0x10, 0, 0], tmp_2044);
    signal tmp_643[3] <== [tmp_641[0] + tmp_642[0], tmp_641[1] + tmp_642[1], tmp_641[2] + tmp_642[2]];
    signal tmp_644[3] <== GLCMul()([0x2, 0, 0], tmp_2048);
    signal tmp_645[3] <== [tmp_643[0] + tmp_644[0], tmp_643[1] + tmp_644[1], tmp_643[2] + tmp_644[2]];
    signal tmp_646[3] <== GLCMul()([0x1c, 0, 0], tmp_2052);
    signal tmp_647[3] <== [tmp_645[0] + tmp_646[0], tmp_645[1] + tmp_646[1], tmp_645[2] + tmp_646[2]];
    signal tmp_648[3] <== GLCMul()([0xd, 0, 0], tmp_2056);
    signal tmp_649[3] <== [tmp_647[0] + tmp_648[0], tmp_647[1] + tmp_648[1], tmp_647[2] + tmp_648[2]];
    signal tmp_650[3] <== GLCMul()([0xd, 0, 0], tmp_2060);
    signal tmp_651[3] <== [tmp_649[0] + tmp_650[0], tmp_649[1] + tmp_650[1], tmp_649[2] + tmp_650[2]];
    signal tmp_652[3] <== GLCMul()([0x27, 0, 0], tmp_2064);
    signal tmp_653[3] <== [tmp_651[0] + tmp_652[0], tmp_651[1] + tmp_652[1], tmp_651[2] + tmp_652[2]];
    signal tmp_654[3] <== GLCMul()([0x12, 0, 0], tmp_2068);
    signal tmp_655[3] <== [tmp_653[0] + tmp_654[0], tmp_653[1] + tmp_654[1], tmp_653[2] + tmp_654[2]];
    signal tmp_656[3] <== GLCMul()([0x22, 0, 0], tmp_2072);
    signal tmp_657[3] <== [tmp_655[0] + tmp_656[0], tmp_655[1] + tmp_656[1], tmp_655[2] + tmp_656[2]];
    signal tmp_658[3] <== GLCMul()([0x14, 0, 0], tmp_2076);
    signal tmp_659[3] <== [tmp_657[0] + tmp_658[0], tmp_657[1] + tmp_658[1], tmp_657[2] + tmp_658[2]];
    signal tmp_660[3] <== GLCMul()([0x11, 0, 0], tmp_2080);
    signal tmp_661[3] <== [tmp_659[0] + tmp_660[0], tmp_659[1] + tmp_660[1], tmp_659[2] + tmp_660[2]];
    signal tmp_662[3] <== [evals[52][0] - tmp_661[0] + p, evals[52][1] - tmp_661[1] + p, evals[52][2] - tmp_661[2] + p];
    signal tmp_663[3] <== GLCMul()(evals[53], tmp_662);
    signal tmp_2104[3] <== [tmp_663[0] - 0 + p, tmp_663[1], tmp_663[2]];
    signal tmp_664[3] <== GLCMul()(tmp_2036, [0x94877900674181c3,0,0]);
    signal tmp_2105[3] <== [evals[2][0] + tmp_664[0], evals[2][1] + tmp_664[1], evals[2][2] + tmp_664[2]];
    signal tmp_665[3] <== GLCMul()(tmp_2040, [0xadef3740e71c726,0,0]);
    signal tmp_2106[3] <== [tmp_2105[0] + tmp_665[0], tmp_2105[1] + tmp_665[1], tmp_2105[2] + tmp_665[2]];
    signal tmp_666[3] <== GLCMul()(tmp_2044, [0x481ac7746b159c67,0,0]);
    signal tmp_2107[3] <== [tmp_2106[0] + tmp_666[0], tmp_2106[1] + tmp_666[1], tmp_2106[2] + tmp_666[2]];
    signal tmp_667[3] <== GLCMul()(tmp_2048, [0xb22d2432b72d5098,0,0]);
    signal tmp_2108[3] <== [tmp_2107[0] + tmp_667[0], tmp_2107[1] + tmp_667[1], tmp_2107[2] + tmp_667[2]];
    signal tmp_668[3] <== GLCMul()(tmp_2052, [0x11ba9a1b81718c2a,0,0]);
    signal tmp_2109[3] <== [tmp_2108[0] + tmp_668[0], tmp_2108[1] + tmp_668[1], tmp_2108[2] + tmp_668[2]];
    signal tmp_669[3] <== GLCMul()(tmp_2056, [0x37f4e36af6073c6e,0,0]);
    signal tmp_2110[3] <== [tmp_2109[0] + tmp_669[0], tmp_2109[1] + tmp_669[1], tmp_2109[2] + tmp_669[2]];
    signal tmp_670[3] <== GLCMul()(tmp_2060, [0x577f9a9e7ee3f9c2,0,0]);
    signal tmp_2111[3] <== [tmp_2110[0] + tmp_670[0], tmp_2110[1] + tmp_670[1], tmp_2110[2] + tmp_670[2]];
    signal tmp_671[3] <== GLCMul()(tmp_2064, [0xf02a3ac068ee110b,0,0]);
    signal tmp_2112[3] <== [tmp_2111[0] + tmp_671[0], tmp_2111[1] + tmp_671[1], tmp_2111[2] + tmp_671[2]];
    signal tmp_672[3] <== GLCMul()(tmp_2068, [0xab1cbd41d8c1e335,0,0]);
    signal tmp_2113[3] <== [tmp_2112[0] + tmp_672[0], tmp_2112[1] + tmp_672[1], tmp_2112[2] + tmp_672[2]];
    signal tmp_673[3] <== GLCMul()(tmp_2072, [0x3d4eab2b8ef5f796,0,0]);
    signal tmp_2114[3] <== [tmp_2113[0] + tmp_673[0], tmp_2113[1] + tmp_673[1], tmp_2113[2] + tmp_673[2]];
    signal tmp_674[3] <== GLCMul()(tmp_2036, [0xc6c67cc37a2a2bbd,0,0]);
    signal tmp_2115[3] <== [evals[3][0] + tmp_674[0], evals[3][1] + tmp_674[1], evals[3][2] + tmp_674[2]];
    signal tmp_675[3] <== GLCMul()(tmp_2040, [0xa37bf67c6f986559,0,0]);
    signal tmp_2116[3] <== [tmp_2115[0] + tmp_675[0], tmp_2115[1] + tmp_675[1], tmp_2115[2] + tmp_675[2]];
    signal tmp_676[3] <== GLCMul()(tmp_2044, [0xe367de32f108e278,0,0]);
    signal tmp_2117[3] <== [tmp_2116[0] + tmp_676[0], tmp_2116[1] + tmp_676[1], tmp_2116[2] + tmp_676[2]];
    signal tmp_677[3] <== GLCMul()(tmp_2048, [0x9e18a487f44d2fe4,0,0]);
    signal tmp_2118[3] <== [tmp_2117[0] + tmp_677[0], tmp_2117[1] + tmp_677[1], tmp_2117[2] + tmp_677[2]];
    signal tmp_678[3] <== GLCMul()(tmp_2052, [0x9f7d798a3323410c,0,0]);
    signal tmp_2119[3] <== [tmp_2118[0] + tmp_678[0], tmp_2118[1] + tmp_678[1], tmp_2118[2] + tmp_678[2]];
    signal tmp_679[3] <== GLCMul()(tmp_2056, [0x4edc0918210800e9,0,0]);
    signal tmp_2120[3] <== [tmp_2119[0] + tmp_679[0], tmp_2119[1] + tmp_679[1], tmp_2119[2] + tmp_679[2]];
    signal tmp_680[3] <== GLCMul()(tmp_2060, [0x88c522b949ace7b1,0,0]);
    signal tmp_2121[3] <== [tmp_2120[0] + tmp_680[0], tmp_2120[1] + tmp_680[1], tmp_2120[2] + tmp_680[2]];
    signal tmp_681[3] <== GLCMul()(tmp_2064, [0xa3630dafb8ae2d7,0,0]);
    signal tmp_2122[3] <== [tmp_2121[0] + tmp_681[0], tmp_2121[1] + tmp_681[1], tmp_2121[2] + tmp_681[2]];
    signal tmp_682[3] <== GLCMul()(tmp_2068, [0x9322ed4c0bc2df01,0,0]);
    signal tmp_2123[3] <== [tmp_2122[0] + tmp_682[0], tmp_2122[1] + tmp_682[1], tmp_2122[2] + tmp_682[2]];
    signal tmp_683[3] <== GLCMul()(tmp_2072, [0xcfff421583896e22,0,0]);
    signal tmp_2124[3] <== [tmp_2123[0] + tmp_683[0], tmp_2123[1] + tmp_683[1], tmp_2123[2] + tmp_683[2]];
    signal tmp_684[3] <== GLCMul()(tmp_2036, [0xd667c2055387940f,0,0]);
    signal tmp_2125[3] <== [evals[10][0] + tmp_684[0], evals[10][1] + tmp_684[1], evals[10][2] + tmp_684[2]];
    signal tmp_685[3] <== GLCMul()(tmp_2040, [0xc6b16f7ed4fa1b00,0,0]);
    signal tmp_2126[3] <== [tmp_2125[0] + tmp_685[0], tmp_2125[1] + tmp_685[1], tmp_2125[2] + tmp_685[2]];
    signal tmp_686[3] <== GLCMul()(tmp_2044, [0x73f260087ad28bec,0,0]);
    signal tmp_2127[3] <== [tmp_2126[0] + tmp_686[0], tmp_2126[1] + tmp_686[1], tmp_2126[2] + tmp_686[2]];
    signal tmp_687[3] <== GLCMul()(tmp_2048, [0x4b39e14ce22abd3c,0,0]);
    signal tmp_2128[3] <== [tmp_2127[0] + tmp_687[0], tmp_2127[1] + tmp_687[1], tmp_2127[2] + tmp_687[2]];
    signal tmp_688[3] <== GLCMul()(tmp_2052, [0xa821855c8c1cf5e5,0,0]);
    signal tmp_2129[3] <== [tmp_2128[0] + tmp_688[0], tmp_2128[1] + tmp_688[1], tmp_2128[2] + tmp_688[2]];
    signal tmp_689[3] <== GLCMul()(tmp_2056, [0xc44998e99eae4188,0,0]);
    signal tmp_2130[3] <== [tmp_2129[0] + tmp_689[0], tmp_2129[1] + tmp_689[1], tmp_2129[2] + tmp_689[2]];
    signal tmp_690[3] <== GLCMul()(tmp_2060, [0x82f07007c8b72106,0,0]);
    signal tmp_2131[3] <== [tmp_2130[0] + tmp_690[0], tmp_2130[1] + tmp_690[1], tmp_2130[2] + tmp_690[2]];
    signal tmp_691[3] <== GLCMul()(tmp_2064, [0xce0dc874eaf9b55c,0,0]);
    signal tmp_2132[3] <== [tmp_2131[0] + tmp_691[0], tmp_2131[1] + tmp_691[1], tmp_2131[2] + tmp_691[2]];
    signal tmp_692[3] <== GLCMul()(tmp_2068, [0x51c3c0983d4284e5,0,0]);
    signal tmp_2133[3] <== [tmp_2132[0] + tmp_692[0], tmp_2132[1] + tmp_692[1], tmp_2132[2] + tmp_692[2]];
    signal tmp_693[3] <== GLCMul()(tmp_2072, [0x4143cb32d39ac3d9,0,0]);
    signal tmp_2134[3] <== [tmp_2133[0] + tmp_693[0], tmp_2133[1] + tmp_693[1], tmp_2133[2] + tmp_693[2]];
    signal tmp_694[3] <== GLCMul()(tmp_2036, [0xba63a63e94b5ff0,0,0]);
    signal tmp_2135[3] <== [evals[11][0] + tmp_694[0], evals[11][1] + tmp_694[1], evals[11][2] + tmp_694[2]];
    signal tmp_695[3] <== GLCMul()(tmp_2040, [0x6a065da88d8bfc3c,0,0]);
    signal tmp_2136[3] <== [tmp_2135[0] + tmp_695[0], tmp_2135[1] + tmp_695[1], tmp_2135[2] + tmp_695[2]];
    signal tmp_696[3] <== GLCMul()(tmp_2044, [0x5cfc82216bc1bdca,0,0]);
    signal tmp_2137[3] <== [tmp_2136[0] + tmp_696[0], tmp_2136[1] + tmp_696[1], tmp_2136[2] + tmp_696[2]];
    signal tmp_697[3] <== GLCMul()(tmp_2048, [0x9e77fde2eb315e0d,0,0]);
    signal tmp_2138[3] <== [tmp_2137[0] + tmp_697[0], tmp_2137[1] + tmp_697[1], tmp_2137[2] + tmp_697[2]];
    signal tmp_698[3] <== GLCMul()(tmp_2052, [0x535e8d6fac0031b2,0,0]);
    signal tmp_2139[3] <== [tmp_2138[0] + tmp_698[0], tmp_2138[1] + tmp_698[1], tmp_2138[2] + tmp_698[2]];
    signal tmp_699[3] <== GLCMul()(tmp_2056, [0x9f4310d05d068338,0,0]);
    signal tmp_2140[3] <== [tmp_2139[0] + tmp_699[0], tmp_2139[1] + tmp_699[1], tmp_2139[2] + tmp_699[2]];
    signal tmp_700[3] <== GLCMul()(tmp_2060, [0x8283d37c6675b50e,0,0]);
    signal tmp_2141[3] <== [tmp_2140[0] + tmp_700[0], tmp_2140[1] + tmp_700[1], tmp_2140[2] + tmp_700[2]];
    signal tmp_701[3] <== GLCMul()(tmp_2064, [0x9a95f6cff5b55c7e,0,0]);
    signal tmp_2142[3] <== [tmp_2141[0] + tmp_701[0], tmp_2141[1] + tmp_701[1], tmp_2141[2] + tmp_701[2]];
    signal tmp_702[3] <== GLCMul()(tmp_2068, [0x94178e291145c231,0,0]);
    signal tmp_2143[3] <== [tmp_2142[0] + tmp_702[0], tmp_2142[1] + tmp_702[1], tmp_2142[2] + tmp_702[2]];
    signal tmp_703[3] <== GLCMul()(tmp_2072, [0x22365051b78a5b65,0,0]);
    signal tmp_2144[3] <== [tmp_2143[0] + tmp_703[0], tmp_2143[1] + tmp_703[1], tmp_2143[2] + tmp_703[2]];
    signal tmp_704[3] <== GLCMul()(tmp_2036, [0x99460cc41b8f079f,0,0]);
    signal tmp_2145[3] <== [evals[12][0] + tmp_704[0], evals[12][1] + tmp_704[1], evals[12][2] + tmp_704[2]];
    signal tmp_705[3] <== GLCMul()(tmp_2040, [0x4cabc0916844b46f,0,0]);
    signal tmp_2146[3] <== [tmp_2145[0] + tmp_705[0], tmp_2145[1] + tmp_705[1], tmp_2145[2] + tmp_705[2]];
    signal tmp_706[3] <== GLCMul()(tmp_2044, [0xcaccc870a2663a0e,0,0]);
    signal tmp_2147[3] <== [tmp_2146[0] + tmp_706[0], tmp_2146[1] + tmp_706[1], tmp_2146[2] + tmp_706[2]];
    signal tmp_707[3] <== GLCMul()(tmp_2048, [0xca5e0385fe67014d,0,0]);
    signal tmp_2148[3] <== [tmp_2147[0] + tmp_707[0], tmp_2147[1] + tmp_707[1], tmp_2147[2] + tmp_707[2]];
    signal tmp_708[3] <== GLCMul()(tmp_2052, [0x404e7c751b634320,0,0]);
    signal tmp_2149[3] <== [tmp_2148[0] + tmp_708[0], tmp_2148[1] + tmp_708[1], tmp_2148[2] + tmp_708[2]];
    signal tmp_709[3] <== GLCMul()(tmp_2056, [0x9ec7fe4350680f29,0,0]);
    signal tmp_2150[3] <== [tmp_2149[0] + tmp_709[0], tmp_2149[1] + tmp_709[1], tmp_2149[2] + tmp_709[2]];
    signal tmp_710[3] <== GLCMul()(tmp_2060, [0x98b074d9bbac1123,0,0]);
    signal tmp_2151[3] <== [tmp_2150[0] + tmp_710[0], tmp_2150[1] + tmp_710[1], tmp_2150[2] + tmp_710[2]];
    signal tmp_711[3] <== GLCMul()(tmp_2064, [0x626d76abfed00c7b,0,0]);
    signal tmp_2152[3] <== [tmp_2151[0] + tmp_711[0], tmp_2151[1] + tmp_711[1], tmp_2151[2] + tmp_711[2]];
    signal tmp_712[3] <== GLCMul()(tmp_2068, [0xfd0f1a973d6b2085,0,0]);
    signal tmp_2153[3] <== [tmp_2152[0] + tmp_712[0], tmp_2152[1] + tmp_712[1], tmp_2152[2] + tmp_712[2]];
    signal tmp_713[3] <== GLCMul()(tmp_2072, [0x6f7fd010d027c9b6,0,0]);
    signal tmp_2154[3] <== [tmp_2153[0] + tmp_713[0], tmp_2153[1] + tmp_713[1], tmp_2153[2] + tmp_713[2]];
    signal tmp_714[3] <== GLCMul()(tmp_2036, [0x7ff02375ed524bb3,0,0]);
    signal tmp_2155[3] <== [evals[13][0] + tmp_714[0], evals[13][1] + tmp_714[1], evals[13][2] + tmp_714[2]];
    signal tmp_715[3] <== GLCMul()(tmp_2040, [0x407faac0f02e78d1,0,0]);
    signal tmp_2156[3] <== [tmp_2155[0] + tmp_715[0], tmp_2155[1] + tmp_715[1], tmp_2155[2] + tmp_715[2]];
    signal tmp_716[3] <== GLCMul()(tmp_2044, [0xdb69cd7b4298c45d,0,0]);
    signal tmp_2157[3] <== [tmp_2156[0] + tmp_716[0], tmp_2156[1] + tmp_716[1], tmp_2156[2] + tmp_716[2]];
    signal tmp_717[3] <== GLCMul()(tmp_2048, [0xc2cb99bf1b6bddb,0,0]);
    signal tmp_2158[3] <== [tmp_2157[0] + tmp_717[0], tmp_2157[1] + tmp_717[1], tmp_2157[2] + tmp_717[2]];
    signal tmp_718[3] <== GLCMul()(tmp_2052, [0xa729353f6e55d354,0,0]);
    signal tmp_2159[3] <== [tmp_2158[0] + tmp_718[0], tmp_2158[1] + tmp_718[1], tmp_2158[2] + tmp_718[2]];
    signal tmp_719[3] <== GLCMul()(tmp_2056, [0xc5b2c1fdc0b50874,0,0]);
    signal tmp_2160[3] <== [tmp_2159[0] + tmp_719[0], tmp_2159[1] + tmp_719[1], tmp_2159[2] + tmp_719[2]];
    signal tmp_720[3] <== GLCMul()(tmp_2060, [0x75c56fb7758317c1,0,0]);
    signal tmp_2161[3] <== [tmp_2160[0] + tmp_720[0], tmp_2160[1] + tmp_720[1], tmp_2160[2] + tmp_720[2]];
    signal tmp_721[3] <== GLCMul()(tmp_2064, [0xa0c1cf1251c204ad,0,0]);
    signal tmp_2162[3] <== [tmp_2161[0] + tmp_721[0], tmp_2161[1] + tmp_721[1], tmp_2161[2] + tmp_721[2]];
    signal tmp_722[3] <== GLCMul()(tmp_2068, [0xd427ad96e2b39719,0,0]);
    signal tmp_2163[3] <== [tmp_2162[0] + tmp_722[0], tmp_2162[1] + tmp_722[1], tmp_2162[2] + tmp_722[2]];
    signal tmp_723[3] <== GLCMul()(tmp_2072, [0xd9dd36fba77522ab,0,0]);
    signal tmp_2164[3] <== [tmp_2163[0] + tmp_723[0], tmp_2163[1] + tmp_723[1], tmp_2163[2] + tmp_723[2]];
    signal tmp_724[3] <== GLCMul()(tmp_2036, [0xea0870b47a8caf0e,0,0]);
    signal tmp_2165[3] <== [evals[14][0] + tmp_724[0], evals[14][1] + tmp_724[1], evals[14][2] + tmp_724[2]];
    signal tmp_725[3] <== GLCMul()(tmp_2040, [0x7a786d9cf0852cf,0,0]);
    signal tmp_2166[3] <== [tmp_2165[0] + tmp_725[0], tmp_2165[1] + tmp_725[1], tmp_2165[2] + tmp_725[2]];
    signal tmp_726[3] <== GLCMul()(tmp_2044, [0x7bc9e0c57243e62d,0,0]);
    signal tmp_2167[3] <== [tmp_2166[0] + tmp_726[0], tmp_2166[1] + tmp_726[1], tmp_2166[2] + tmp_726[2]];
    signal tmp_727[3] <== GLCMul()(tmp_2048, [0x99ec1cd2a4460bfe,0,0]);
    signal tmp_2168[3] <== [tmp_2167[0] + tmp_727[0], tmp_2167[1] + tmp_727[1], tmp_2167[2] + tmp_727[2]];
    signal tmp_728[3] <== GLCMul()(tmp_2052, [0x4db97d92e58bb831,0,0]);
    signal tmp_2169[3] <== [tmp_2168[0] + tmp_728[0], tmp_2168[1] + tmp_728[1], tmp_2168[2] + tmp_728[2]];
    signal tmp_729[3] <== GLCMul()(tmp_2056, [0xa01920c5ef8b2ebe,0,0]);
    signal tmp_2170[3] <== [tmp_2169[0] + tmp_729[0], tmp_2169[1] + tmp_729[1], tmp_2169[2] + tmp_729[2]];
    signal tmp_730[3] <== GLCMul()(tmp_2060, [0xfed24e206052bc72,0,0]);
    signal tmp_2171[3] <== [tmp_2170[0] + tmp_730[0], tmp_2170[1] + tmp_730[1], tmp_2170[2] + tmp_730[2]];
    signal tmp_731[3] <== GLCMul()(tmp_2064, [0xdaebd3006321052c,0,0]);
    signal tmp_2172[3] <== [tmp_2171[0] + tmp_731[0], tmp_2171[1] + tmp_731[1], tmp_2171[2] + tmp_731[2]];
    signal tmp_732[3] <== GLCMul()(tmp_2068, [0x8a52437fecaac06b,0,0]);
    signal tmp_2173[3] <== [tmp_2172[0] + tmp_732[0], tmp_2172[1] + tmp_732[1], tmp_2172[2] + tmp_732[2]];
    signal tmp_733[3] <== GLCMul()(tmp_2072, [0xa44cf1cb33e37165,0,0]);
    signal tmp_2174[3] <== [tmp_2173[0] + tmp_733[0], tmp_2173[1] + tmp_733[1], tmp_2173[2] + tmp_733[2]];
    signal tmp_734[3] <== GLCMul()(tmp_2036, [0xabcad82633b7bc9d,0,0]);
    signal tmp_2175[3] <== [evals[19][0] + tmp_734[0], evals[19][1] + tmp_734[1], evals[19][2] + tmp_734[2]];
    signal tmp_735[3] <== GLCMul()(tmp_2040, [0x42433fb6949a629a,0,0]);
    signal tmp_2176[3] <== [tmp_2175[0] + tmp_735[0], tmp_2175[1] + tmp_735[1], tmp_2175[2] + tmp_735[2]];
    signal tmp_736[3] <== GLCMul()(tmp_2044, [0x3cc51c5d368693ae,0,0]);
    signal tmp_2177[3] <== [tmp_2176[0] + tmp_736[0], tmp_2176[1] + tmp_736[1], tmp_2176[2] + tmp_736[2]];
    signal tmp_737[3] <== GLCMul()(tmp_2048, [0x8577a815a2ff843f,0,0]);
    signal tmp_2178[3] <== [tmp_2177[0] + tmp_737[0], tmp_2177[1] + tmp_737[1], tmp_2177[2] + tmp_737[2]];
    signal tmp_738[3] <== GLCMul()(tmp_2052, [0xb53926c27897bf7d,0,0]);
    signal tmp_2179[3] <== [tmp_2178[0] + tmp_738[0], tmp_2178[1] + tmp_738[1], tmp_2178[2] + tmp_738[2]];
    signal tmp_739[3] <== GLCMul()(tmp_2056, [0x59fa6f8bd91d58ba,0,0]);
    signal tmp_2180[3] <== [tmp_2179[0] + tmp_739[0], tmp_2179[1] + tmp_739[1], tmp_2179[2] + tmp_739[2]];
    signal tmp_740[3] <== GLCMul()(tmp_2060, [0x26d7c3d1bc07dae5,0,0]);
    signal tmp_2181[3] <== [tmp_2180[0] + tmp_740[0], tmp_2180[1] + tmp_740[1], tmp_2180[2] + tmp_740[2]];
    signal tmp_741[3] <== GLCMul()(tmp_2064, [0x3d4bd48b625a8065,0,0]);
    signal tmp_2182[3] <== [tmp_2181[0] + tmp_741[0], tmp_2181[1] + tmp_741[1], tmp_2181[2] + tmp_741[2]];
    signal tmp_742[3] <== GLCMul()(tmp_2068, [0xdc20ee4b8c4c9a80,0,0]);
    signal tmp_2183[3] <== [tmp_2182[0] + tmp_742[0], tmp_2182[1] + tmp_742[1], tmp_2182[2] + tmp_742[2]];
    signal tmp_743[3] <== GLCMul()(tmp_2072, [0x3fc83d3038c86417,0,0]);
    signal tmp_2184[3] <== [tmp_2183[0] + tmp_743[0], tmp_2183[1] + tmp_743[1], tmp_2183[2] + tmp_743[2]];
    signal tmp_744[3] <== GLCMul()(tmp_2036, [0x3b8d135261052241,0,0]);
    signal tmp_2185[3] <== [evals[21][0] + tmp_744[0], evals[21][1] + tmp_744[1], evals[21][2] + tmp_744[2]];
    signal tmp_745[3] <== GLCMul()(tmp_2040, [0x891682a147ce43b0,0,0]);
    signal tmp_2186[3] <== [tmp_2185[0] + tmp_745[0], tmp_2185[1] + tmp_745[1], tmp_2185[2] + tmp_745[2]];
    signal tmp_746[3] <== GLCMul()(tmp_2044, [0x366b4e8cc068895b,0,0]);
    signal tmp_2187[3] <== [tmp_2186[0] + tmp_746[0], tmp_2186[1] + tmp_746[1], tmp_2186[2] + tmp_746[2]];
    signal tmp_747[3] <== GLCMul()(tmp_2048, [0x7d80a6b4fd6518a5,0,0]);
    signal tmp_2188[3] <== [tmp_2187[0] + tmp_747[0], tmp_2187[1] + tmp_747[1], tmp_2187[2] + tmp_747[2]];
    signal tmp_748[3] <== GLCMul()(tmp_2052, [0x965040d52fe115c5,0,0]);
    signal tmp_2189[3] <== [tmp_2188[0] + tmp_748[0], tmp_2188[1] + tmp_748[1], tmp_2188[2] + tmp_748[2]];
    signal tmp_749[3] <== GLCMul()(tmp_2056, [0x8bfc9eb89b515a82,0,0]);
    signal tmp_2190[3] <== [tmp_2189[0] + tmp_749[0], tmp_2189[1] + tmp_749[1], tmp_2189[2] + tmp_749[2]];
    signal tmp_750[3] <== GLCMul()(tmp_2060, [0xf88c5e441e28dbb4,0,0]);
    signal tmp_2191[3] <== [tmp_2190[0] + tmp_750[0], tmp_2190[1] + tmp_750[1], tmp_2190[2] + tmp_750[2]];
    signal tmp_751[3] <== GLCMul()(tmp_2064, [0x7f1e584e071f6ed2,0,0]);
    signal tmp_2192[3] <== [tmp_2191[0] + tmp_751[0], tmp_2191[1] + tmp_751[1], tmp_2191[2] + tmp_751[2]];
    signal tmp_752[3] <== GLCMul()(tmp_2068, [0xa2c98e9549da2100,0,0]);
    signal tmp_2193[3] <== [tmp_2192[0] + tmp_752[0], tmp_2192[1] + tmp_752[1], tmp_2192[2] + tmp_752[2]];
    signal tmp_753[3] <== GLCMul()(tmp_2072, [0xc4588d418e88d270,0,0]);
    signal tmp_2194[3] <== [tmp_2193[0] + tmp_753[0], tmp_2193[1] + tmp_753[1], tmp_2193[2] + tmp_753[2]];
    signal tmp_754[3] <== GLCMul()(tmp_2036, [0xfb4515f5e5b0d539,0,0]);
    signal tmp_2195[3] <== [evals[22][0] + tmp_754[0], evals[22][1] + tmp_754[1], evals[22][2] + tmp_754[2]];
    signal tmp_755[3] <== GLCMul()(tmp_2040, [0x26cfd58e7b003b55,0,0]);
    signal tmp_2196[3] <== [tmp_2195[0] + tmp_755[0], tmp_2195[1] + tmp_755[1], tmp_2195[2] + tmp_755[2]];
    signal tmp_756[3] <== GLCMul()(tmp_2044, [0x2bd18715cdabbca4,0,0]);
    signal tmp_2197[3] <== [tmp_2196[0] + tmp_756[0], tmp_2196[1] + tmp_756[1], tmp_2196[2] + tmp_756[2]];
    signal tmp_757[3] <== GLCMul()(tmp_2048, [0xeb6c67123eab62cb,0,0]);
    signal tmp_2198[3] <== [tmp_2197[0] + tmp_757[0], tmp_2197[1] + tmp_757[1], tmp_2197[2] + tmp_757[2]];
    signal tmp_758[3] <== GLCMul()(tmp_2052, [0x9565fa41ebd31fd7,0,0]);
    signal tmp_2199[3] <== [tmp_2198[0] + tmp_758[0], tmp_2198[1] + tmp_758[1], tmp_2198[2] + tmp_758[2]];
    signal tmp_759[3] <== GLCMul()(tmp_2056, [0xbe86a7a2555ae775,0,0]);
    signal tmp_2200[3] <== [tmp_2199[0] + tmp_759[0], tmp_2199[1] + tmp_759[1], tmp_2199[2] + tmp_759[2]];
    signal tmp_760[3] <== GLCMul()(tmp_2060, [0x4fe27f9f96615270,0,0]);
    signal tmp_2201[3] <== [tmp_2200[0] + tmp_760[0], tmp_2200[1] + tmp_760[1], tmp_2200[2] + tmp_760[2]];
    signal tmp_761[3] <== GLCMul()(tmp_2064, [0x720574f0501caed3,0,0]);
    signal tmp_2202[3] <== [tmp_2201[0] + tmp_761[0], tmp_2201[1] + tmp_761[1], tmp_2201[2] + tmp_761[2]];
    signal tmp_762[3] <== GLCMul()(tmp_2068, [0x1603fe12613db5b6,0,0]);
    signal tmp_2203[3] <== [tmp_2202[0] + tmp_762[0], tmp_2202[1] + tmp_762[1], tmp_2202[2] + tmp_762[2]];
    signal tmp_763[3] <== GLCMul()(tmp_2072, [0xce1320f10ab80fe2,0,0]);
    signal tmp_2204[3] <== [tmp_2203[0] + tmp_763[0], tmp_2203[1] + tmp_763[1], tmp_2203[2] + tmp_763[2]];
    signal tmp_764[3] <== GLCMul()(tmp_2036, [0x3ee8011c2b37f77c,0,0]);
    signal tmp_2205[3] <== [evals[23][0] + tmp_764[0], evals[23][1] + tmp_764[1], evals[23][2] + tmp_764[2]];
    signal tmp_765[3] <== GLCMul()(tmp_2040, [0x2bbf0ed7b657acb3,0,0]);
    signal tmp_2206[3] <== [tmp_2205[0] + tmp_765[0], tmp_2205[1] + tmp_765[1], tmp_2205[2] + tmp_765[2]];
    signal tmp_766[3] <== GLCMul()(tmp_2044, [0xa752061c4f33b8cf,0,0]);
    signal tmp_2207[3] <== [tmp_2206[0] + tmp_766[0], tmp_2206[1] + tmp_766[1], tmp_2206[2] + tmp_766[2]];
    signal tmp_767[3] <== GLCMul()(tmp_2048, [0x8f7851650eca21a5,0,0]);
    signal tmp_2208[3] <== [tmp_2207[0] + tmp_767[0], tmp_2207[1] + tmp_767[1], tmp_2207[2] + tmp_767[2]];
    signal tmp_768[3] <== GLCMul()(tmp_2052, [0xaae4438c877ea8f4,0,0]);
    signal tmp_2209[3] <== [tmp_2208[0] + tmp_768[0], tmp_2208[1] + tmp_768[1], tmp_2208[2] + tmp_768[2]];
    signal tmp_769[3] <== GLCMul()(tmp_2056, [0xcbb8bbaa3810babf,0,0]);
    signal tmp_2210[3] <== [tmp_2209[0] + tmp_769[0], tmp_2209[1] + tmp_769[1], tmp_2209[2] + tmp_769[2]];
    signal tmp_770[3] <== GLCMul()(tmp_2060, [0x514d4ba49c2b14fe,0,0]);
    signal tmp_2211[3] <== [tmp_2210[0] + tmp_770[0], tmp_2210[1] + tmp_770[1], tmp_2210[2] + tmp_770[2]];
    signal tmp_771[3] <== GLCMul()(tmp_2064, [0xe3260ba93d23540a,0,0]);
    signal tmp_2212[3] <== [tmp_2211[0] + tmp_771[0], tmp_2211[1] + tmp_771[1], tmp_2211[2] + tmp_771[2]];
    signal tmp_772[3] <== GLCMul()(tmp_2068, [0xe174929433c5505,0,0]);
    signal tmp_2213[3] <== [tmp_2212[0] + tmp_772[0], tmp_2212[1] + tmp_772[1], tmp_2212[2] + tmp_772[2]];
    signal tmp_773[3] <== GLCMul()(tmp_2072, [0xdb5eadbbec18de5d,0,0]);
    signal tmp_2214[3] <== [tmp_2213[0] + tmp_773[0], tmp_2213[1] + tmp_773[1], tmp_2213[2] + tmp_773[2]];
    signal tmp_774[3] <== GLCMul()([0x19, 0, 0], tmp_2076);
    signal tmp_775[3] <== GLCMul()([0x4dd19c38779512ea, 0, 0], tmp_2114);
    signal tmp_776[3] <== [tmp_774[0] + tmp_775[0], tmp_774[1] + tmp_775[1], tmp_774[2] + tmp_775[2]];
    signal tmp_777[3] <== GLCMul()([0xdb79ba02704620e9, 0, 0], tmp_2124);
    signal tmp_778[3] <== [tmp_776[0] + tmp_777[0], tmp_776[1] + tmp_777[1], tmp_776[2] + tmp_777[2]];
    signal tmp_779[3] <== GLCMul()([0x92a29a3675a5d2be, 0, 0], tmp_2134);
    signal tmp_780[3] <== [tmp_778[0] + tmp_779[0], tmp_778[1] + tmp_779[1], tmp_778[2] + tmp_779[2]];
    signal tmp_781[3] <== GLCMul()([0xd5177029fe495166, 0, 0], tmp_2144);
    signal tmp_782[3] <== [tmp_780[0] + tmp_781[0], tmp_780[1] + tmp_781[1], tmp_780[2] + tmp_781[2]];
    signal tmp_783[3] <== GLCMul()([0xd32b3298a13330c1, 0, 0], tmp_2154);
    signal tmp_784[3] <== [tmp_782[0] + tmp_783[0], tmp_782[1] + tmp_783[1], tmp_782[2] + tmp_783[2]];
    signal tmp_785[3] <== GLCMul()([0x251c4a3eb2c5f8fd, 0, 0], tmp_2164);
    signal tmp_786[3] <== [tmp_784[0] + tmp_785[0], tmp_784[1] + tmp_785[1], tmp_784[2] + tmp_785[2]];
    signal tmp_787[3] <== GLCMul()([0xe1c48b26e0d98825, 0, 0], tmp_2174);
    signal tmp_788[3] <== [tmp_786[0] + tmp_787[0], tmp_786[1] + tmp_787[1], tmp_786[2] + tmp_787[2]];
    signal tmp_789[3] <== GLCMul()([0x3301d3362a4ffccb, 0, 0], tmp_2184);
    signal tmp_790[3] <== [tmp_788[0] + tmp_789[0], tmp_788[1] + tmp_789[1], tmp_788[2] + tmp_789[2]];
    signal tmp_791[3] <== GLCMul()([0x9bb6c88de8cd178, 0, 0], tmp_2194);
    signal tmp_792[3] <== [tmp_790[0] + tmp_791[0], tmp_790[1] + tmp_791[1], tmp_790[2] + tmp_791[2]];
    signal tmp_793[3] <== GLCMul()([0xdc05b676564f538a, 0, 0], tmp_2204);
    signal tmp_794[3] <== [tmp_792[0] + tmp_793[0], tmp_792[1] + tmp_793[1], tmp_792[2] + tmp_793[2]];
    signal tmp_795[3] <== GLCMul()([0x60192d883e473fee, 0, 0], tmp_2214);
    signal tmp_2215[3] <== [tmp_794[0] + tmp_795[0], tmp_794[1] + tmp_795[1], tmp_794[2] + tmp_795[2]];
    signal tmp_796[3] <== [evals[40][0] - tmp_2215[0] + p, evals[40][1] - tmp_2215[1] + p, evals[40][2] - tmp_2215[2] + p];
    signal tmp_797[3] <== GLCMul()(evals[54], tmp_796);
    signal tmp_2216[3] <== [tmp_797[0] - 0 + p, tmp_797[1], tmp_797[2]];
    signal tmp_798[3] <== GLCMul()(tmp_2076, [0x1183dfce7c454afd,0,0]);
    signal tmp_2217[3] <== [tmp_2114[0] + tmp_798[0], tmp_2114[1] + tmp_798[1], tmp_2114[2] + tmp_798[2]];
    signal tmp_799[3] <== [evals[42][0] - tmp_2217[0] + p, evals[42][1] - tmp_2217[1] + p, evals[42][2] - tmp_2217[2] + p];
    signal tmp_800[3] <== GLCMul()(evals[54], tmp_799);
    signal tmp_2218[3] <== [tmp_800[0] - 0 + p, tmp_800[1], tmp_800[2]];
    signal tmp_801[3] <== GLCMul()(tmp_2076, [0x21cea4aa3d3ed949,0,0]);
    signal tmp_2219[3] <== [tmp_2124[0] + tmp_801[0], tmp_2124[1] + tmp_801[1], tmp_2124[2] + tmp_801[2]];
    signal tmp_802[3] <== [evals[43][0] - tmp_2219[0] + p, evals[43][1] - tmp_2219[1] + p, evals[43][2] - tmp_2219[2] + p];
    signal tmp_803[3] <== GLCMul()(evals[54], tmp_802);
    signal tmp_2220[3] <== [tmp_803[0] - 0 + p, tmp_803[1], tmp_803[2]];
    signal tmp_804[3] <== GLCMul()(tmp_2076, [0xfce6f70303f2304,0,0]);
    signal tmp_2221[3] <== [tmp_2134[0] + tmp_804[0], tmp_2134[1] + tmp_804[1], tmp_2134[2] + tmp_804[2]];
    signal tmp_805[3] <== [evals[44][0] - tmp_2221[0] + p, evals[44][1] - tmp_2221[1] + p, evals[44][2] - tmp_2221[2] + p];
    signal tmp_806[3] <== GLCMul()(evals[54], tmp_805);
    signal tmp_2222[3] <== [tmp_806[0] - 0 + p, tmp_806[1], tmp_806[2]];
    signal tmp_807[3] <== GLCMul()(tmp_2076, [0x19557d34b55551be,0,0]);
    signal tmp_2223[3] <== [tmp_2144[0] + tmp_807[0], tmp_2144[1] + tmp_807[1], tmp_2144[2] + tmp_807[2]];
    signal tmp_808[3] <== [evals[45][0] - tmp_2223[0] + p, evals[45][1] - tmp_2223[1] + p, evals[45][2] - tmp_2223[2] + p];
    signal tmp_809[3] <== GLCMul()(evals[54], tmp_808);
    signal tmp_2224[3] <== [tmp_809[0] - 0 + p, tmp_809[1], tmp_809[2]];
    signal tmp_810[3] <== GLCMul()(tmp_2076, [0x4c56f689afc5bbc9,0,0]);
    signal tmp_2225[3] <== [tmp_2154[0] + tmp_810[0], tmp_2154[1] + tmp_810[1], tmp_2154[2] + tmp_810[2]];
    signal tmp_811[3] <== [evals[46][0] - tmp_2225[0] + p, evals[46][1] - tmp_2225[1] + p, evals[46][2] - tmp_2225[2] + p];
    signal tmp_812[3] <== GLCMul()(evals[54], tmp_811);
    signal tmp_2226[3] <== [tmp_812[0] - 0 + p, tmp_812[1], tmp_812[2]];
    signal tmp_813[3] <== GLCMul()(tmp_2076, [0xa1e920844334f944,0,0]);
    signal tmp_2227[3] <== [tmp_2164[0] + tmp_813[0], tmp_2164[1] + tmp_813[1], tmp_2164[2] + tmp_813[2]];
    signal tmp_814[3] <== [evals[47][0] - tmp_2227[0] + p, evals[47][1] - tmp_2227[1] + p, evals[47][2] - tmp_2227[2] + p];
    signal tmp_815[3] <== GLCMul()(evals[54], tmp_814);
    signal tmp_2228[3] <== [tmp_815[0] - 0 + p, tmp_815[1], tmp_815[2]];
    signal tmp_816[3] <== GLCMul()(tmp_2076, [0xbad66d423d2ec861,0,0]);
    signal tmp_2229[3] <== [tmp_2174[0] + tmp_816[0], tmp_2174[1] + tmp_816[1], tmp_2174[2] + tmp_816[2]];
    signal tmp_817[3] <== [evals[48][0] - tmp_2229[0] + p, evals[48][1] - tmp_2229[1] + p, evals[48][2] - tmp_2229[2] + p];
    signal tmp_818[3] <== GLCMul()(evals[54], tmp_817);
    signal tmp_2230[3] <== [tmp_818[0] - 0 + p, tmp_818[1], tmp_818[2]];
    signal tmp_819[3] <== GLCMul()(tmp_2076, [0xf318c785dc9e0479,0,0]);
    signal tmp_2231[3] <== [tmp_2184[0] + tmp_819[0], tmp_2184[1] + tmp_819[1], tmp_2184[2] + tmp_819[2]];
    signal tmp_820[3] <== [evals[49][0] - tmp_2231[0] + p, evals[49][1] - tmp_2231[1] + p, evals[49][2] - tmp_2231[2] + p];
    signal tmp_821[3] <== GLCMul()(evals[54], tmp_820);
    signal tmp_2232[3] <== [tmp_821[0] - 0 + p, tmp_821[1], tmp_821[2]];
    signal tmp_822[3] <== GLCMul()(tmp_2076, [0x99e2032e765ddd81,0,0]);
    signal tmp_2233[3] <== [tmp_2194[0] + tmp_822[0], tmp_2194[1] + tmp_822[1], tmp_2194[2] + tmp_822[2]];
    signal tmp_823[3] <== [evals[50][0] - tmp_2233[0] + p, evals[50][1] - tmp_2233[1] + p, evals[50][2] - tmp_2233[2] + p];
    signal tmp_824[3] <== GLCMul()(evals[54], tmp_823);
    signal tmp_2234[3] <== [tmp_824[0] - 0 + p, tmp_824[1], tmp_824[2]];
    signal tmp_825[3] <== GLCMul()(tmp_2076, [0x400ccc9906d66f45,0,0]);
    signal tmp_2235[3] <== [tmp_2204[0] + tmp_825[0], tmp_2204[1] + tmp_825[1], tmp_2204[2] + tmp_825[2]];
    signal tmp_826[3] <== [evals[51][0] - tmp_2235[0] + p, evals[51][1] - tmp_2235[1] + p, evals[51][2] - tmp_2235[2] + p];
    signal tmp_827[3] <== GLCMul()(evals[54], tmp_826);
    signal tmp_2236[3] <== [tmp_827[0] - 0 + p, tmp_827[1], tmp_827[2]];
    signal tmp_828[3] <== GLCMul()(tmp_2076, [0xe1197454db2e0dd9,0,0]);
    signal tmp_2237[3] <== [tmp_2214[0] + tmp_828[0], tmp_2214[1] + tmp_828[1], tmp_2214[2] + tmp_828[2]];
    signal tmp_829[3] <== [evals[52][0] - tmp_2237[0] + p, evals[52][1] - tmp_2237[1] + p, evals[52][2] - tmp_2237[2] + p];
    signal tmp_830[3] <== GLCMul()(evals[54], tmp_829);
    signal tmp_2238[3] <== [tmp_830[0] - 0 + p, tmp_830[1], tmp_830[2]];
    signal tmp_831[3] <== GLCMul()(tmp_2036, [0x84d1ecc4d53d2ff1,0,0]);
    signal tmp_2239[3] <== [evals[2][0] + tmp_831[0], evals[2][1] + tmp_831[1], evals[2][2] + tmp_831[2]];
    signal tmp_832[3] <== GLCMul()(tmp_2040, [0x238aa6daa612186d,0,0]);
    signal tmp_2240[3] <== [tmp_2239[0] + tmp_832[0], tmp_2239[1] + tmp_832[1], tmp_2239[2] + tmp_832[2]];
    signal tmp_833[3] <== GLCMul()(tmp_2044, [0xd6e15ffc055e154e,0,0]);
    signal tmp_2241[3] <== [tmp_2240[0] + tmp_833[0], tmp_2240[1] + tmp_833[1], tmp_2240[2] + tmp_833[2]];
    signal tmp_834[3] <== GLCMul()(tmp_2048, [0xbd87ad390420258,0,0]);
    signal tmp_2242[3] <== [tmp_2241[0] + tmp_834[0], tmp_2241[1] + tmp_834[1], tmp_2241[2] + tmp_834[2]];
    signal tmp_835[3] <== GLCMul()(tmp_2052, [0xcf29427ff7c58,0,0]);
    signal tmp_2243[3] <== [tmp_2242[0] + tmp_835[0], tmp_2242[1] + tmp_835[1], tmp_2242[2] + tmp_835[2]];
    signal tmp_836[3] <== GLCMul()(tmp_2056, [0xe24c99adad8,0,0]);
    signal tmp_2244[3] <== [tmp_2243[0] + tmp_836[0], tmp_2243[1] + tmp_836[1], tmp_2243[2] + tmp_836[2]];
    signal tmp_837[3] <== GLCMul()(tmp_2060, [0xf7157bc98,0,0]);
    signal tmp_2245[3] <== [tmp_2244[0] + tmp_837[0], tmp_2244[1] + tmp_837[1], tmp_2244[2] + tmp_837[2]];
    signal tmp_838[3] <== GLCMul()(tmp_2064, [0x11131738,0,0]);
    signal tmp_2246[3] <== [tmp_2245[0] + tmp_838[0], tmp_2245[1] + tmp_838[1], tmp_2245[2] + tmp_838[2]];
    signal tmp_839[3] <== GLCMul()(tmp_2068, [0x11f718,0,0]);
    signal tmp_2247[3] <== [tmp_2246[0] + tmp_839[0], tmp_2246[1] + tmp_839[1], tmp_2246[2] + tmp_839[2]];
    signal tmp_840[3] <== GLCMul()(tmp_2072, [0x1300,0,0]);
    signal tmp_2248[3] <== [tmp_2247[0] + tmp_840[0], tmp_2247[1] + tmp_840[1], tmp_2247[2] + tmp_840[2]];
    signal tmp_841[3] <== GLCMul()(tmp_2036, [0xd8af8b9ceb4e11b6,0,0]);
    signal tmp_2249[3] <== [evals[3][0] + tmp_841[0], evals[3][1] + tmp_841[1], evals[3][2] + tmp_841[2]];
    signal tmp_842[3] <== GLCMul()(tmp_2040, [0x9137a5c630bad4b4,0,0]);
    signal tmp_2250[3] <== [tmp_2249[0] + tmp_842[0], tmp_2249[1] + tmp_842[1], tmp_2249[2] + tmp_842[2]];
    signal tmp_843[3] <== GLCMul()(tmp_2044, [0xec67881f381a32bf,0,0]);
    signal tmp_2251[3] <== [tmp_2250[0] + tmp_843[0], tmp_2250[1] + tmp_843[1], tmp_2250[2] + tmp_843[2]];
    signal tmp_844[3] <== GLCMul()(tmp_2048, [0xad8617bca9e33c8,0,0]);
    signal tmp_2252[3] <== [tmp_2251[0] + tmp_844[0], tmp_2251[1] + tmp_844[1], tmp_2251[2] + tmp_844[2]];
    signal tmp_845[3] <== GLCMul()(tmp_2052, [0xbd9b3cf49eec8,0,0]);
    signal tmp_2253[3] <== [tmp_2252[0] + tmp_845[0], tmp_2252[1] + tmp_845[1], tmp_2252[2] + tmp_845[2]];
    signal tmp_846[3] <== GLCMul()(tmp_2056, [0xcf389ed4bc8,0,0]);
    signal tmp_2254[3] <== [tmp_2253[0] + tmp_846[0], tmp_2253[1] + tmp_846[1], tmp_2253[2] + tmp_846[2]];
    signal tmp_847[3] <== GLCMul()(tmp_2060, [0xe3006d948,0,0]);
    signal tmp_2255[3] <== [tmp_2254[0] + tmp_847[0], tmp_2254[1] + tmp_847[1], tmp_2254[2] + tmp_847[2]];
    signal tmp_848[3] <== GLCMul()(tmp_2064, [0xf56d588,0,0]);
    signal tmp_2256[3] <== [tmp_2255[0] + tmp_848[0], tmp_2255[1] + tmp_848[1], tmp_2255[2] + tmp_848[2]];
    signal tmp_849[3] <== GLCMul()(tmp_2068, [0x10b6c8,0,0]);
    signal tmp_2257[3] <== [tmp_2256[0] + tmp_849[0], tmp_2256[1] + tmp_849[1], tmp_2256[2] + tmp_849[2]];
    signal tmp_850[3] <== GLCMul()(tmp_2072, [0x1750,0,0]);
    signal tmp_2258[3] <== [tmp_2257[0] + tmp_850[0], tmp_2257[1] + tmp_850[1], tmp_2257[2] + tmp_850[2]];
    signal tmp_851[3] <== GLCMul()(tmp_2036, [0x335856bb527b52f4,0,0]);
    signal tmp_2259[3] <== [evals[10][0] + tmp_851[0], evals[10][1] + tmp_851[1], evals[10][2] + tmp_851[2]];
    signal tmp_852[3] <== GLCMul()(tmp_2040, [0xc7db3817870c5eda,0,0]);
    signal tmp_2260[3] <== [tmp_2259[0] + tmp_852[0], tmp_2259[1] + tmp_852[1], tmp_2259[2] + tmp_852[2]];
    signal tmp_853[3] <== GLCMul()(tmp_2044, [0xfbb1196092bf409c,0,0]);
    signal tmp_2261[3] <== [tmp_2260[0] + tmp_853[0], tmp_2260[1] + tmp_853[1], tmp_2260[2] + tmp_853[2]];
    signal tmp_854[3] <== GLCMul()(tmp_2048, [0xc00ad377a1e2666,0,0]);
    signal tmp_2262[3] <== [tmp_2261[0] + tmp_854[0], tmp_2261[1] + tmp_854[1], tmp_2261[2] + tmp_854[2]];
    signal tmp_855[3] <== GLCMul()(tmp_2052, [0xd1dc8aa81fb26,0,0]);
    signal tmp_2263[3] <== [tmp_2262[0] + tmp_855[0], tmp_2262[1] + tmp_855[1], tmp_2262[2] + tmp_855[2]];
    signal tmp_856[3] <== GLCMul()(tmp_2056, [0xe580cbf6966,0,0]);
    signal tmp_2264[3] <== [tmp_2263[0] + tmp_856[0], tmp_2263[1] + tmp_856[1], tmp_2263[2] + tmp_856[2]];
    signal tmp_857[3] <== GLCMul()(tmp_2060, [0xfa65811e6,0,0]);
    signal tmp_2265[3] <== [tmp_2264[0] + tmp_857[0], tmp_2264[1] + tmp_857[1], tmp_2264[2] + tmp_857[2]];
    signal tmp_858[3] <== GLCMul()(tmp_2064, [0x11050f86,0,0]);
    signal tmp_2266[3] <== [tmp_2265[0] + tmp_858[0], tmp_2265[1] + tmp_858[1], tmp_2265[2] + tmp_858[2]];
    signal tmp_859[3] <== GLCMul()(tmp_2068, [0x134a96,0,0]);
    signal tmp_2267[3] <== [tmp_2266[0] + tmp_859[0], tmp_2266[1] + tmp_859[1], tmp_2266[2] + tmp_859[2]];
    signal tmp_860[3] <== GLCMul()(tmp_2072, [0x114e,0,0]);
    signal tmp_2268[3] <== [tmp_2267[0] + tmp_860[0], tmp_2267[1] + tmp_860[1], tmp_2267[2] + tmp_860[2]];
    signal tmp_861[3] <== GLCMul()(tmp_2036, [0xc756f17fb59be595,0,0]);
    signal tmp_2269[3] <== [evals[11][0] + tmp_861[0], evals[11][1] + tmp_861[1], evals[11][2] + tmp_861[2]];
    signal tmp_862[3] <== GLCMul()(tmp_2040, [0x217e4f04e5718dc9,0,0]);
    signal tmp_2270[3] <== [tmp_2269[0] + tmp_862[0], tmp_2269[1] + tmp_862[1], tmp_2269[2] + tmp_862[2]];
    signal tmp_863[3] <== GLCMul()(tmp_2044, [0xdc9d2e07830ba226,0,0]);
    signal tmp_2271[3] <== [tmp_2270[0] + tmp_863[0], tmp_2270[1] + tmp_863[1], tmp_2270[2] + tmp_863[2]];
    signal tmp_864[3] <== GLCMul()(tmp_2048, [0xac6fc58b3f0518f,0,0]);
    signal tmp_2272[3] <== [tmp_2271[0] + tmp_864[0], tmp_2271[1] + tmp_864[1], tmp_2271[2] + tmp_864[2]];
    signal tmp_865[3] <== GLCMul()(tmp_2052, [0xbc792d5c394ef,0,0]);
    signal tmp_2273[3] <== [tmp_2272[0] + tmp_865[0], tmp_2272[1] + tmp_865[1], tmp_2272[2] + tmp_865[2]];
    signal tmp_866[3] <== GLCMul()(tmp_2056, [0xcde5fd7e04f,0,0]);
    signal tmp_2274[3] <== [tmp_2273[0] + tmp_866[0], tmp_2273[1] + tmp_866[1], tmp_2273[2] + tmp_866[2]];
    signal tmp_867[3] <== GLCMul()(tmp_2060, [0xe0d127e2f,0,0]);
    signal tmp_2275[3] <== [tmp_2274[0] + tmp_867[0], tmp_2274[1] + tmp_867[1], tmp_2274[2] + tmp_867[2]];
    signal tmp_868[3] <== GLCMul()(tmp_2064, [0xf848f4f,0,0]);
    signal tmp_2276[3] <== [tmp_2275[0] + tmp_868[0], tmp_2275[1] + tmp_868[1], tmp_2275[2] + tmp_868[2]];
    signal tmp_869[3] <== GLCMul()(tmp_2068, [0x10cf7f,0,0]);
    signal tmp_2277[3] <== [tmp_2276[0] + tmp_869[0], tmp_2276[1] + tmp_869[1], tmp_2276[2] + tmp_869[2]];
    signal tmp_870[3] <== GLCMul()(tmp_2072, [0x131f,0,0]);
    signal tmp_2278[3] <== [tmp_2277[0] + tmp_870[0], tmp_2277[1] + tmp_870[1], tmp_2277[2] + tmp_870[2]];
    signal tmp_871[3] <== GLCMul()(tmp_2036, [0xc0654e4ea5553a78,0,0]);
    signal tmp_2279[3] <== [evals[12][0] + tmp_871[0], evals[12][1] + tmp_871[1], evals[12][2] + tmp_871[2]];
    signal tmp_872[3] <== GLCMul()(tmp_2040, [0xcae814e2817bd99d,0,0]);
    signal tmp_2280[3] <== [tmp_2279[0] + tmp_872[0], tmp_2279[1] + tmp_872[1], tmp_2279[2] + tmp_872[2]];
    signal tmp_873[3] <== GLCMul()(tmp_2044, [0x698ef3245ff7988,0,0]);
    signal tmp_2281[3] <== [tmp_2280[0] + tmp_873[0], tmp_2280[1] + tmp_873[1], tmp_2280[2] + tmp_873[2]];
    signal tmp_874[3] <== GLCMul()(tmp_2048, [0xc0cc8a892cc4173,0,0]);
    signal tmp_2282[3] <== [tmp_2281[0] + tmp_874[0], tmp_2281[1] + tmp_874[1], tmp_2281[2] + tmp_874[2]];
    signal tmp_875[3] <== GLCMul()(tmp_2052, [0xd2ae0b2266453,0,0]);
    signal tmp_2283[3] <== [tmp_2282[0] + tmp_875[0], tmp_2282[1] + tmp_875[1], tmp_2282[2] + tmp_875[2]];
    signal tmp_876[3] <== GLCMul()(tmp_2056, [0xe63628041b3,0,0]);
    signal tmp_2284[3] <== [tmp_2283[0] + tmp_876[0], tmp_2283[1] + tmp_876[1], tmp_2283[2] + tmp_876[2]];
    signal tmp_877[3] <== GLCMul()(tmp_2060, [0xfc18bfe53,0,0]);
    signal tmp_2285[3] <== [tmp_2284[0] + tmp_877[0], tmp_2284[1] + tmp_877[1], tmp_2284[2] + tmp_877[2]];
    signal tmp_878[3] <== GLCMul()(tmp_2064, [0x111527d3,0,0]);
    signal tmp_2286[3] <== [tmp_2285[0] + tmp_878[0], tmp_2285[1] + tmp_878[1], tmp_2285[2] + tmp_878[2]];
    signal tmp_879[3] <== GLCMul()(tmp_2068, [0x124d03,0,0]);
    signal tmp_2287[3] <== [tmp_2286[0] + tmp_879[0], tmp_2286[1] + tmp_879[1], tmp_2286[2] + tmp_879[2]];
    signal tmp_880[3] <== GLCMul()(tmp_2072, [0x167b,0,0]);
    signal tmp_2288[3] <== [tmp_2287[0] + tmp_880[0], tmp_2287[1] + tmp_880[1], tmp_2287[2] + tmp_880[2]];
    signal tmp_881[3] <== GLCMul()(tmp_2036, [0x9e9a46b61f2ea942,0,0]);
    signal tmp_2289[3] <== [evals[13][0] + tmp_881[0], evals[13][1] + tmp_881[1], evals[13][2] + tmp_881[2]];
    signal tmp_882[3] <== GLCMul()(tmp_2040, [0xe3292e7ab770a8ba,0,0]);
    signal tmp_2290[3] <== [tmp_2289[0] + tmp_882[0], tmp_2289[1] + tmp_882[1], tmp_2289[2] + tmp_882[2]];
    signal tmp_883[3] <== GLCMul()(tmp_2044, [0x194fae2974f8b576,0,0]);
    signal tmp_2291[3] <== [tmp_2290[0] + tmp_883[0], tmp_2290[1] + tmp_883[1], tmp_2290[2] + tmp_883[2]];
    signal tmp_884[3] <== GLCMul()(tmp_2048, [0xc210accb117bc21,0,0]);
    signal tmp_2292[3] <== [tmp_2291[0] + tmp_884[0], tmp_2291[1] + tmp_884[1], tmp_2291[2] + tmp_884[2]];
    signal tmp_885[3] <== GLCMul()(tmp_2052, [0xd413f12c496c1,0,0]);
    signal tmp_2293[3] <== [tmp_2292[0] + tmp_885[0], tmp_2292[1] + tmp_885[1], tmp_2292[2] + tmp_885[2]];
    signal tmp_886[3] <== GLCMul()(tmp_2056, [0xe7e81a87361,0,0]);
    signal tmp_2294[3] <== [tmp_2293[0] + tmp_886[0], tmp_2293[1] + tmp_886[1], tmp_2293[2] + tmp_886[2]];
    signal tmp_887[3] <== GLCMul()(tmp_2060, [0xfd002d901,0,0]);
    signal tmp_2295[3] <== [tmp_2294[0] + tmp_887[0], tmp_2294[1] + tmp_887[1], tmp_2294[2] + tmp_887[2]];
    signal tmp_888[3] <== GLCMul()(tmp_2064, [0x114369a1,0,0]);
    signal tmp_2296[3] <== [tmp_2295[0] + tmp_888[0], tmp_2295[1] + tmp_888[1], tmp_2295[2] + tmp_888[2]];
    signal tmp_889[3] <== GLCMul()(tmp_2068, [0x13f8a1,0,0]);
    signal tmp_2297[3] <== [tmp_2296[0] + tmp_889[0], tmp_2296[1] + tmp_889[1], tmp_2296[2] + tmp_889[2]];
    signal tmp_890[3] <== GLCMul()(tmp_2072, [0x1371,0,0]);
    signal tmp_2298[3] <== [tmp_2297[0] + tmp_890[0], tmp_2297[1] + tmp_890[1], tmp_2297[2] + tmp_890[2]];
    signal tmp_891[3] <== GLCMul()(tmp_2036, [0x14fc8b5b3b809127,0,0]);
    signal tmp_2299[3] <== [evals[14][0] + tmp_891[0], evals[14][1] + tmp_891[1], evals[14][2] + tmp_891[2]];
    signal tmp_892[3] <== GLCMul()(tmp_2040, [0x7bb36ef70b6b9482,0,0]);
    signal tmp_2300[3] <== [tmp_2299[0] + tmp_892[0], tmp_2299[1] + tmp_892[1], tmp_2299[2] + tmp_892[2]];
    signal tmp_893[3] <== GLCMul()(tmp_2044, [0x7a5d9bea6ca4910e,0,0]);
    signal tmp_2301[3] <== [tmp_2300[0] + tmp_893[0], tmp_2300[1] + tmp_893[1], tmp_2300[2] + tmp_893[2]];
    signal tmp_894[3] <== GLCMul()(tmp_2048, [0xb73630dbb46ca18,0,0]);
    signal tmp_2302[3] <== [tmp_2301[0] + tmp_894[0], tmp_2301[1] + tmp_894[1], tmp_2301[2] + tmp_894[2]];
    signal tmp_895[3] <== GLCMul()(tmp_2052, [0xc84128cfed618,0,0]);
    signal tmp_2303[3] <== [tmp_2302[0] + tmp_895[0], tmp_2302[1] + tmp_895[1], tmp_2302[2] + tmp_895[2]];
    signal tmp_896[3] <== GLCMul()(tmp_2056, [0xdabe78f6d98,0,0]);
    signal tmp_2304[3] <== [tmp_2303[0] + tmp_896[0], tmp_2303[1] + tmp_896[1], tmp_2303[2] + tmp_896[2]];
    signal tmp_897[3] <== GLCMul()(tmp_2060, [0xeed6461d8,0,0]);
    signal tmp_2305[3] <== [tmp_2304[0] + tmp_897[0], tmp_2304[1] + tmp_897[1], tmp_2304[2] + tmp_897[2]];
    signal tmp_898[3] <== GLCMul()(tmp_2064, [0x106f2f38,0,0]);
    signal tmp_2306[3] <== [tmp_2305[0] + tmp_898[0], tmp_2305[1] + tmp_898[1], tmp_2305[2] + tmp_898[2]];
    signal tmp_899[3] <== GLCMul()(tmp_2068, [0x117c58,0,0]);
    signal tmp_2307[3] <== [tmp_2306[0] + tmp_899[0], tmp_2306[1] + tmp_899[1], tmp_2306[2] + tmp_899[2]];
    signal tmp_900[3] <== GLCMul()(tmp_2072, [0x1230,0,0]);
    signal tmp_2308[3] <== [tmp_2307[0] + tmp_900[0], tmp_2307[1] + tmp_900[1], tmp_2307[2] + tmp_900[2]];
    signal tmp_901[3] <== GLCMul()(tmp_2036, [0xd7009f0f103be413,0,0]);
    signal tmp_2309[3] <== [evals[19][0] + tmp_901[0], evals[19][1] + tmp_901[1], evals[19][2] + tmp_901[2]];
    signal tmp_902[3] <== GLCMul()(tmp_2040, [0x3c7835fb85bca2d3,0,0]);
    signal tmp_2310[3] <== [tmp_2309[0] + tmp_902[0], tmp_2309[1] + tmp_902[1], tmp_2309[2] + tmp_902[2]];
    signal tmp_903[3] <== GLCMul()(tmp_2044, [0x7aebfea95ccdd1c9,0,0]);
    signal tmp_2311[3] <== [tmp_2310[0] + tmp_903[0], tmp_2310[1] + tmp_903[1], tmp_2310[2] + tmp_903[2]];
    signal tmp_904[3] <== GLCMul()(tmp_2048, [0xc8be4920cbd4a54,0,0]);
    signal tmp_2312[3] <== [tmp_2311[0] + tmp_904[0], tmp_2311[1] + tmp_904[1], tmp_2311[2] + tmp_904[2]];
    signal tmp_905[3] <== GLCMul()(tmp_2052, [0xdb5ebd48fc0d4,0,0]);
    signal tmp_2313[3] <== [tmp_2312[0] + tmp_905[0], tmp_2312[1] + tmp_905[1], tmp_2312[2] + tmp_905[2]];
    signal tmp_906[3] <== GLCMul()(tmp_2056, [0xefb14cac554,0,0]);
    signal tmp_2314[3] <== [tmp_2313[0] + tmp_906[0], tmp_2313[1] + tmp_906[1], tmp_2313[2] + tmp_906[2]];
    signal tmp_907[3] <== GLCMul()(tmp_2060, [0x1068562754,0,0]);
    signal tmp_2315[3] <== [tmp_2314[0] + tmp_907[0], tmp_2314[1] + tmp_907[1], tmp_2314[2] + tmp_907[2]];
    signal tmp_908[3] <== GLCMul()(tmp_2064, [0x11e2ca94,0,0]);
    signal tmp_2316[3] <== [tmp_2315[0] + tmp_908[0], tmp_2315[1] + tmp_908[1], tmp_2315[2] + tmp_908[2]];
    signal tmp_909[3] <== GLCMul()(tmp_2068, [0x132c94,0,0]);
    signal tmp_2317[3] <== [tmp_2316[0] + tmp_909[0], tmp_2316[1] + tmp_909[1], tmp_2316[2] + tmp_909[2]];
    signal tmp_910[3] <== GLCMul()(tmp_2072, [0x182c,0,0]);
    signal tmp_2318[3] <== [tmp_2317[0] + tmp_910[0], tmp_2317[1] + tmp_910[1], tmp_2317[2] + tmp_910[2]];
    signal tmp_911[3] <== GLCMul()(tmp_2036, [0x3e0ee7b7a9fb4601,0,0]);
    signal tmp_2319[3] <== [evals[21][0] + tmp_911[0], evals[21][1] + tmp_911[1], evals[21][2] + tmp_911[2]];
    signal tmp_912[3] <== GLCMul()(tmp_2040, [0xfe2cdf8ee3c25e86,0,0]);
    signal tmp_2320[3] <== [tmp_2319[0] + tmp_912[0], tmp_2319[1] + tmp_912[1], tmp_2319[2] + tmp_912[2]];
    signal tmp_913[3] <== GLCMul()(tmp_2044, [0xf9bd38a67d5f0e86,0,0]);
    signal tmp_2321[3] <== [tmp_2320[0] + tmp_913[0], tmp_2320[1] + tmp_913[1], tmp_2320[2] + tmp_913[2]];
    signal tmp_914[3] <== GLCMul()(tmp_2048, [0xbfe877a21be1690,0,0]);
    signal tmp_2322[3] <== [tmp_2321[0] + tmp_914[0], tmp_2321[1] + tmp_914[1], tmp_2321[2] + tmp_914[2]];
    signal tmp_915[3] <== GLCMul()(tmp_2052, [0xd1b77326dcb90,0,0]);
    signal tmp_2323[3] <== [tmp_2322[0] + tmp_915[0], tmp_2322[1] + tmp_915[1], tmp_2322[2] + tmp_915[2]];
    signal tmp_916[3] <== GLCMul()(tmp_2056, [0xe5574743b10,0,0]);
    signal tmp_2324[3] <== [tmp_2323[0] + tmp_916[0], tmp_2323[1] + tmp_916[1], tmp_2323[2] + tmp_916[2]];
    signal tmp_917[3] <== GLCMul()(tmp_2060, [0xfa0236f50,0,0]);
    signal tmp_2325[3] <== [tmp_2324[0] + tmp_917[0], tmp_2324[1] + tmp_917[1], tmp_2324[2] + tmp_917[2]];
    signal tmp_918[3] <== GLCMul()(tmp_2064, [0x110a29f0,0,0]);
    signal tmp_2326[3] <== [tmp_2325[0] + tmp_918[0], tmp_2325[1] + tmp_918[1], tmp_2325[2] + tmp_918[2]];
    signal tmp_919[3] <== GLCMul()(tmp_2068, [0x134fc0,0,0]);
    signal tmp_2327[3] <== [tmp_2326[0] + tmp_919[0], tmp_2326[1] + tmp_919[1], tmp_2326[2] + tmp_919[2]];
    signal tmp_920[3] <== GLCMul()(tmp_2072, [0x1368,0,0]);
    signal tmp_2328[3] <== [tmp_2327[0] + tmp_920[0], tmp_2327[1] + tmp_920[1], tmp_2327[2] + tmp_920[2]];
    signal tmp_921[3] <== GLCMul()(tmp_2036, [0xa74e888922085ed7,0,0]);
    signal tmp_2329[3] <== [evals[22][0] + tmp_921[0], evals[22][1] + tmp_921[1], evals[22][2] + tmp_921[2]];
    signal tmp_922[3] <== GLCMul()(tmp_2040, [0x61b3915ad7274b20,0,0]);
    signal tmp_2330[3] <== [tmp_2329[0] + tmp_922[0], tmp_2329[1] + tmp_922[1], tmp_2329[2] + tmp_922[2]];
    signal tmp_923[3] <== GLCMul()(tmp_2044, [0xfa65539de65492d8,0,0]);
    signal tmp_2331[3] <== [tmp_2330[0] + tmp_923[0], tmp_2330[1] + tmp_923[1], tmp_2330[2] + tmp_923[2]];
    signal tmp_924[3] <== GLCMul()(tmp_2048, [0xae790559b0ded81,0,0]);
    signal tmp_2332[3] <== [tmp_2331[0] + tmp_924[0], tmp_2331[1] + tmp_924[1], tmp_2331[2] + tmp_924[2]];
    signal tmp_925[3] <== GLCMul()(tmp_2052, [0xbeb0ccc145421,0,0]);
    signal tmp_2333[3] <== [tmp_2332[0] + tmp_925[0], tmp_2332[1] + tmp_925[1], tmp_2332[2] + tmp_925[2]];
    signal tmp_926[3] <== GLCMul()(tmp_2056, [0xd05709f42c1,0,0]);
    signal tmp_2334[3] <== [tmp_2333[0] + tmp_926[0], tmp_2333[1] + tmp_926[1], tmp_2333[2] + tmp_926[2]];
    signal tmp_927[3] <== GLCMul()(tmp_2060, [0xe3af13ee1,0,0]);
    signal tmp_2335[3] <== [tmp_2334[0] + tmp_927[0], tmp_2334[1] + tmp_927[1], tmp_2334[2] + tmp_927[2]];
    signal tmp_928[3] <== GLCMul()(tmp_2064, [0xfa9f5c1,0,0]);
    signal tmp_2336[3] <== [tmp_2335[0] + tmp_928[0], tmp_2335[1] + tmp_928[1], tmp_2335[2] + tmp_928[2]];
    signal tmp_929[3] <== GLCMul()(tmp_2068, [0x10a091,0,0]);
    signal tmp_2337[3] <== [tmp_2336[0] + tmp_929[0], tmp_2336[1] + tmp_929[1], tmp_2336[2] + tmp_929[2]];
    signal tmp_930[3] <== GLCMul()(tmp_2072, [0xf31,0,0]);
    signal tmp_2338[3] <== [tmp_2337[0] + tmp_930[0], tmp_2337[1] + tmp_930[1], tmp_2337[2] + tmp_930[2]];
    signal tmp_931[3] <== GLCMul()(tmp_2036, [0xe80a7cde3d4ac526,0,0]);
    signal tmp_2339[3] <== [evals[23][0] + tmp_931[0], evals[23][1] + tmp_931[1], evals[23][2] + tmp_931[2]];
    signal tmp_932[3] <== GLCMul()(tmp_2040, [0xeab75ca7c918e4ef,0,0]);
    signal tmp_2340[3] <== [tmp_2339[0] + tmp_932[0], tmp_2339[1] + tmp_932[1], tmp_2339[2] + tmp_932[2]];
    signal tmp_933[3] <== GLCMul()(tmp_2044, [0xf0dfcbe7653ff787,0,0]);
    signal tmp_2341[3] <== [tmp_2340[0] + tmp_933[0], tmp_2340[1] + tmp_933[1], tmp_2340[2] + tmp_933[2]];
    signal tmp_934[3] <== GLCMul()(tmp_2048, [0xbf50db2f8d6ce31,0,0]);
    signal tmp_2342[3] <== [tmp_2341[0] + tmp_934[0], tmp_2341[1] + tmp_934[1], tmp_2341[2] + tmp_934[2]];
    signal tmp_935[3] <== GLCMul()(tmp_2052, [0xd10e5b22b11d1,0,0]);
    signal tmp_2343[3] <== [tmp_2342[0] + tmp_935[0], tmp_2342[1] + tmp_935[1], tmp_2342[2] + tmp_935[2]];
    signal tmp_936[3] <== GLCMul()(tmp_2056, [0xe4690c96af1,0,0]);
    signal tmp_2344[3] <== [tmp_2343[0] + tmp_936[0], tmp_2343[1] + tmp_936[1], tmp_2343[2] + tmp_936[2]];
    signal tmp_937[3] <== GLCMul()(tmp_2060, [0xfa460f6d1,0,0]);
    signal tmp_2345[3] <== [tmp_2344[0] + tmp_937[0], tmp_2344[1] + tmp_937[1], tmp_2344[2] + tmp_937[2]];
    signal tmp_938[3] <== GLCMul()(tmp_2064, [0x10f625d1,0,0]);
    signal tmp_2346[3] <== [tmp_2345[0] + tmp_938[0], tmp_2345[1] + tmp_938[1], tmp_2345[2] + tmp_938[2]];
    signal tmp_939[3] <== GLCMul()(tmp_2068, [0x128961,0,0]);
    signal tmp_2347[3] <== [tmp_2346[0] + tmp_939[0], tmp_2346[1] + tmp_939[1], tmp_2346[2] + tmp_939[2]];
    signal tmp_940[3] <== GLCMul()(tmp_2072, [0x15c9,0,0]);
    signal tmp_2348[3] <== [tmp_2347[0] + tmp_940[0], tmp_2347[1] + tmp_940[1], tmp_2347[2] + tmp_940[2]];
    signal tmp_941[3] <== GLCMul()([0x19, 0, 0], tmp_2076);
    signal tmp_942[3] <== GLCMul()([0x3abeb80def61cc85, 0, 0], tmp_2248);
    signal tmp_943[3] <== [tmp_941[0] + tmp_942[0], tmp_941[1] + tmp_942[1], tmp_941[2] + tmp_942[2]];
    signal tmp_944[3] <== GLCMul()([0x9d19c9dd4eac4133, 0, 0], tmp_2258);
    signal tmp_945[3] <== [tmp_943[0] + tmp_944[0], tmp_943[1] + tmp_944[1], tmp_943[2] + tmp_944[2]];
    signal tmp_946[3] <== GLCMul()([0x75a652d9641a985, 0, 0], tmp_2268);
    signal tmp_947[3] <== [tmp_945[0] + tmp_946[0], tmp_945[1] + tmp_946[1], tmp_945[2] + tmp_946[2]];
    signal tmp_948[3] <== GLCMul()([0x9daf69ae1b67e667, 0, 0], tmp_2278);
    signal tmp_949[3] <== [tmp_947[0] + tmp_948[0], tmp_947[1] + tmp_948[1], tmp_947[2] + tmp_948[2]];
    signal tmp_950[3] <== GLCMul()([0x364f71da77920a18, 0, 0], tmp_2288);
    signal tmp_951[3] <== [tmp_949[0] + tmp_950[0], tmp_949[1] + tmp_950[1], tmp_949[2] + tmp_950[2]];
    signal tmp_952[3] <== GLCMul()([0x50bd769f745c95b1, 0, 0], tmp_2298);
    signal tmp_953[3] <== [tmp_951[0] + tmp_952[0], tmp_951[1] + tmp_952[1], tmp_951[2] + tmp_952[2]];
    signal tmp_954[3] <== GLCMul()([0xf223d1180dbbf3fc, 0, 0], tmp_2308);
    signal tmp_955[3] <== [tmp_953[0] + tmp_954[0], tmp_953[1] + tmp_954[1], tmp_953[2] + tmp_954[2]];
    signal tmp_956[3] <== GLCMul()([0x2f885e584e04aa99, 0, 0], tmp_2318);
    signal tmp_957[3] <== [tmp_955[0] + tmp_956[0], tmp_955[1] + tmp_956[1], tmp_955[2] + tmp_956[2]];
    signal tmp_958[3] <== GLCMul()([0xb69a0fa70aea684a, 0, 0], tmp_2328);
    signal tmp_959[3] <== [tmp_957[0] + tmp_958[0], tmp_957[1] + tmp_958[1], tmp_957[2] + tmp_958[2]];
    signal tmp_960[3] <== GLCMul()([0x9584acaa6e062a0, 0, 0], tmp_2338);
    signal tmp_961[3] <== [tmp_959[0] + tmp_960[0], tmp_959[1] + tmp_960[1], tmp_959[2] + tmp_960[2]];
    signal tmp_962[3] <== GLCMul()([0xbc051640145b19b, 0, 0], tmp_2348);
    signal tmp_2349[3] <== [tmp_961[0] + tmp_962[0], tmp_961[1] + tmp_962[1], tmp_961[2] + tmp_962[2]];
    signal tmp_963[3] <== [evals[40][0] - tmp_2349[0] + p, evals[40][1] - tmp_2349[1] + p, evals[40][2] - tmp_2349[2] + p];
    signal tmp_964[3] <== GLCMul()(evals[55], tmp_963);
    signal tmp_2350[3] <== [tmp_964[0] - 0 + p, tmp_964[1], tmp_964[2]];
    signal tmp_965[3] <== GLCMul()(tmp_2076, [0x14,0,0]);
    signal tmp_2351[3] <== [tmp_2248[0] + tmp_965[0], tmp_2248[1] + tmp_965[1], tmp_2248[2] + tmp_965[2]];
    signal tmp_966[3] <== [evals[42][0] - tmp_2351[0] + p, evals[42][1] - tmp_2351[1] + p, evals[42][2] - tmp_2351[2] + p];
    signal tmp_967[3] <== GLCMul()(evals[55], tmp_966);
    signal tmp_2352[3] <== [tmp_967[0] - 0 + p, tmp_967[1], tmp_967[2]];
    signal tmp_968[3] <== GLCMul()(tmp_2076, [0x22,0,0]);
    signal tmp_2353[3] <== [tmp_2258[0] + tmp_968[0], tmp_2258[1] + tmp_968[1], tmp_2258[2] + tmp_968[2]];
    signal tmp_969[3] <== [evals[43][0] - tmp_2353[0] + p, evals[43][1] - tmp_2353[1] + p, evals[43][2] - tmp_2353[2] + p];
    signal tmp_970[3] <== GLCMul()(evals[55], tmp_969);
    signal tmp_2354[3] <== [tmp_970[0] - 0 + p, tmp_970[1], tmp_970[2]];
    signal tmp_971[3] <== GLCMul()(tmp_2076, [0x12,0,0]);
    signal tmp_2355[3] <== [tmp_2268[0] + tmp_971[0], tmp_2268[1] + tmp_971[1], tmp_2268[2] + tmp_971[2]];
    signal tmp_972[3] <== [evals[44][0] - tmp_2355[0] + p, evals[44][1] - tmp_2355[1] + p, evals[44][2] - tmp_2355[2] + p];
    signal tmp_973[3] <== GLCMul()(evals[55], tmp_972);
    signal tmp_2356[3] <== [tmp_973[0] - 0 + p, tmp_973[1], tmp_973[2]];
    signal tmp_974[3] <== GLCMul()(tmp_2076, [0x27,0,0]);
    signal tmp_2357[3] <== [tmp_2278[0] + tmp_974[0], tmp_2278[1] + tmp_974[1], tmp_2278[2] + tmp_974[2]];
    signal tmp_975[3] <== [evals[45][0] - tmp_2357[0] + p, evals[45][1] - tmp_2357[1] + p, evals[45][2] - tmp_2357[2] + p];
    signal tmp_976[3] <== GLCMul()(evals[55], tmp_975);
    signal tmp_2358[3] <== [tmp_976[0] - 0 + p, tmp_976[1], tmp_976[2]];
    signal tmp_977[3] <== GLCMul()(tmp_2076, [0xd,0,0]);
    signal tmp_2359[3] <== [tmp_2288[0] + tmp_977[0], tmp_2288[1] + tmp_977[1], tmp_2288[2] + tmp_977[2]];
    signal tmp_978[3] <== [evals[46][0] - tmp_2359[0] + p, evals[46][1] - tmp_2359[1] + p, evals[46][2] - tmp_2359[2] + p];
    signal tmp_979[3] <== GLCMul()(evals[55], tmp_978);
    signal tmp_2360[3] <== [tmp_979[0] - 0 + p, tmp_979[1], tmp_979[2]];
    signal tmp_980[3] <== GLCMul()(tmp_2076, [0xd,0,0]);
    signal tmp_2361[3] <== [tmp_2298[0] + tmp_980[0], tmp_2298[1] + tmp_980[1], tmp_2298[2] + tmp_980[2]];
    signal tmp_981[3] <== [evals[47][0] - tmp_2361[0] + p, evals[47][1] - tmp_2361[1] + p, evals[47][2] - tmp_2361[2] + p];
    signal tmp_982[3] <== GLCMul()(evals[55], tmp_981);
    signal tmp_2362[3] <== [tmp_982[0] - 0 + p, tmp_982[1], tmp_982[2]];
    signal tmp_983[3] <== GLCMul()(tmp_2076, [0x1c,0,0]);
    signal tmp_2363[3] <== [tmp_2308[0] + tmp_983[0], tmp_2308[1] + tmp_983[1], tmp_2308[2] + tmp_983[2]];
    signal tmp_984[3] <== [evals[48][0] - tmp_2363[0] + p, evals[48][1] - tmp_2363[1] + p, evals[48][2] - tmp_2363[2] + p];
    signal tmp_985[3] <== GLCMul()(evals[55], tmp_984);
    signal tmp_2364[3] <== [tmp_985[0] - 0 + p, tmp_985[1], tmp_985[2]];
    signal tmp_986[3] <== GLCMul()(tmp_2076, [0x2,0,0]);
    signal tmp_2365[3] <== [tmp_2318[0] + tmp_986[0], tmp_2318[1] + tmp_986[1], tmp_2318[2] + tmp_986[2]];
    signal tmp_987[3] <== [evals[49][0] - tmp_2365[0] + p, evals[49][1] - tmp_2365[1] + p, evals[49][2] - tmp_2365[2] + p];
    signal tmp_988[3] <== GLCMul()(evals[55], tmp_987);
    signal tmp_2366[3] <== [tmp_988[0] - 0 + p, tmp_988[1], tmp_988[2]];
    signal tmp_989[3] <== GLCMul()(tmp_2076, [0x10,0,0]);
    signal tmp_2367[3] <== [tmp_2328[0] + tmp_989[0], tmp_2328[1] + tmp_989[1], tmp_2328[2] + tmp_989[2]];
    signal tmp_990[3] <== [evals[50][0] - tmp_2367[0] + p, evals[50][1] - tmp_2367[1] + p, evals[50][2] - tmp_2367[2] + p];
    signal tmp_991[3] <== GLCMul()(evals[55], tmp_990);
    signal tmp_2368[3] <== [tmp_991[0] - 0 + p, tmp_991[1], tmp_991[2]];
    signal tmp_992[3] <== GLCMul()(tmp_2076, [0x29,0,0]);
    signal tmp_2369[3] <== [tmp_2338[0] + tmp_992[0], tmp_2338[1] + tmp_992[1], tmp_2338[2] + tmp_992[2]];
    signal tmp_993[3] <== [evals[51][0] - tmp_2369[0] + p, evals[51][1] - tmp_2369[1] + p, evals[51][2] - tmp_2369[2] + p];
    signal tmp_994[3] <== GLCMul()(evals[55], tmp_993);
    signal tmp_2370[3] <== [tmp_994[0] - 0 + p, tmp_994[1], tmp_994[2]];
    signal tmp_995[3] <== GLCMul()(tmp_2076, [0xf,0,0]);
    signal tmp_2371[3] <== [tmp_2348[0] + tmp_995[0], tmp_2348[1] + tmp_995[1], tmp_2348[2] + tmp_995[2]];
    signal tmp_996[3] <== [evals[52][0] - tmp_2371[0] + p, evals[52][1] - tmp_2371[1] + p, evals[52][2] - tmp_2371[2] + p];
    signal tmp_997[3] <== GLCMul()(evals[55], tmp_996);
    signal tmp_2372[3] <== [tmp_997[0] - 0 + p, tmp_997[1], tmp_997[2]];
    signal tmp_998[3] <== [evals[11][0] + evals[12][0], evals[11][1] + evals[12][1], evals[11][2] + evals[12][2]];
    signal tmp_999[3] <== [evals[14][0] + evals[19][0], evals[14][1] + evals[19][1], evals[14][2] + evals[19][2]];
    signal tmp_2373[3] <== GLCMul()(tmp_998, tmp_999);
    signal tmp_2374[3] <== GLCMul()(evals[10], evals[13]);
    signal tmp_2375[3] <== GLCMul()(evals[11], evals[14]);
    signal tmp_2376[3] <== GLCMul()(evals[12], evals[19]);
    signal tmp_1000[3] <== [tmp_2373[0] + tmp_2374[0], tmp_2373[1] + tmp_2374[1], tmp_2373[2] + tmp_2374[2]];
    signal tmp_1001[3] <== [tmp_1000[0] - tmp_2375[0] + p, tmp_1000[1] - tmp_2375[1] + p, tmp_1000[2] - tmp_2375[2] + p];
    signal tmp_1002[3] <== [tmp_1001[0] - tmp_2376[0] + p, tmp_1001[1] - tmp_2376[1] + p, tmp_1001[2] - tmp_2376[2] + p];
    signal tmp_1003[3] <== [evals[21][0] - tmp_1002[0] + p, evals[21][1] - tmp_1002[1] + p, evals[21][2] - tmp_1002[2] + p];
    signal tmp_1004[3] <== GLCMul()(evals[56], tmp_1003);
    signal tmp_2377[3] <== [tmp_1004[0] - 0 + p, tmp_1004[1], tmp_1004[2]];
    signal tmp_1005[3] <== [evals[10][0] + evals[11][0], evals[10][1] + evals[11][1], evals[10][2] + evals[11][2]];
    signal tmp_1006[3] <== [evals[13][0] + evals[14][0], evals[13][1] + evals[14][1], evals[13][2] + evals[14][2]];
    signal tmp_2378[3] <== GLCMul()(tmp_1005, tmp_1006);
    signal tmp_1007[3] <== [tmp_2378[0] + tmp_2373[0], tmp_2378[1] + tmp_2373[1], tmp_2378[2] + tmp_2373[2]];
    signal tmp_1008[3] <== GLCMul()([2, 0, 0], tmp_2375);
    signal tmp_1009[3] <== [tmp_1007[0] - tmp_1008[0] + p, tmp_1007[1] - tmp_1008[1] + p, tmp_1007[2] - tmp_1008[2] + p];
    signal tmp_1010[3] <== [tmp_1009[0] - tmp_2374[0] + p, tmp_1009[1] - tmp_2374[1] + p, tmp_1009[2] - tmp_2374[2] + p];
    signal tmp_1011[3] <== [evals[22][0] - tmp_1010[0] + p, evals[22][1] - tmp_1010[1] + p, evals[22][2] - tmp_1010[2] + p];
    signal tmp_1012[3] <== GLCMul()(evals[56], tmp_1011);
    signal tmp_2379[3] <== [tmp_1012[0] - 0 + p, tmp_1012[1], tmp_1012[2]];
    signal tmp_1013[3] <== [evals[10][0] + evals[12][0], evals[10][1] + evals[12][1], evals[10][2] + evals[12][2]];
    signal tmp_1014[3] <== [evals[13][0] + evals[19][0], evals[13][1] + evals[19][1], evals[13][2] + evals[19][2]];
    signal tmp_2380[3] <== GLCMul()(tmp_1013, tmp_1014);
    signal tmp_1015[3] <== [tmp_2380[0] - tmp_2374[0] + p, tmp_2380[1] - tmp_2374[1] + p, tmp_2380[2] - tmp_2374[2] + p];
    signal tmp_1016[3] <== [tmp_1015[0] + tmp_2375[0], tmp_1015[1] + tmp_2375[1], tmp_1015[2] + tmp_2375[2]];
    signal tmp_1017[3] <== [evals[23][0] - tmp_1016[0] + p, evals[23][1] - tmp_1016[1] + p, evals[23][2] - tmp_1016[2] + p];
    signal tmp_1018[3] <== GLCMul()(evals[56], tmp_1017);
    signal tmp_2381[3] <== [tmp_1018[0] - 0 + p, tmp_1018[1], tmp_1018[2]];
    signal tmp_1019[3] <== GLCMul()(tmp_2019, evals[56]);
    signal tmp_2382[3] <== [tmp_1019[0] - 0 + p, tmp_1019[1], tmp_1019[2]];
    signal tmp_1020[3] <== GLCMul()(evals[4], evals[0]);
    signal tmp_1021[3] <== GLCMul()(evals[5], evals[10]);
    signal tmp_1022[3] <== [tmp_1020[0] + tmp_1021[0], tmp_1020[1] + tmp_1021[1], tmp_1020[2] + tmp_1021[2]];
    signal tmp_1023[3] <== GLCMul()(evals[6], evals[13]);
    signal tmp_1024[3] <== [tmp_1022[0] + tmp_1023[0], tmp_1022[1] + tmp_1023[1], tmp_1022[2] + tmp_1023[2]];
    signal tmp_1025[3] <== GLCMul()(evals[7], evals[21]);
    signal tmp_1026[3] <== [tmp_1024[0] + tmp_1025[0], tmp_1024[1] + tmp_1025[1], tmp_1024[2] + tmp_1025[2]];
    signal tmp_1027[3] <== GLCMul()(evals[15], evals[0]);
    signal tmp_1028[3] <== [tmp_1026[0] + tmp_1027[0], tmp_1026[1] + tmp_1027[1], tmp_1026[2] + tmp_1027[2]];
    signal tmp_1029[3] <== GLCMul()(evals[16], evals[10]);
    signal tmp_2383[3] <== [tmp_1028[0] + tmp_1029[0], tmp_1028[1] + tmp_1029[1], tmp_1028[2] + tmp_1029[2]];
    signal tmp_1030[3] <== [evals[40][0] - tmp_2383[0] + p, evals[40][1] - tmp_2383[1] + p, evals[40][2] - tmp_2383[2] + p];
    signal tmp_1031[3] <== GLCMul()(evals[57], tmp_1030);
    signal tmp_2384[3] <== [tmp_1031[0] - 0 + p, tmp_1031[1], tmp_1031[2]];
    signal tmp_1032[3] <== GLCMul()(evals[4], evals[2]);
    signal tmp_1033[3] <== GLCMul()(evals[5], evals[11]);
    signal tmp_1034[3] <== [tmp_1032[0] + tmp_1033[0], tmp_1032[1] + tmp_1033[1], tmp_1032[2] + tmp_1033[2]];
    signal tmp_1035[3] <== GLCMul()(evals[6], evals[14]);
    signal tmp_1036[3] <== [tmp_1034[0] + tmp_1035[0], tmp_1034[1] + tmp_1035[1], tmp_1034[2] + tmp_1035[2]];
    signal tmp_1037[3] <== GLCMul()(evals[7], evals[22]);
    signal tmp_1038[3] <== [tmp_1036[0] + tmp_1037[0], tmp_1036[1] + tmp_1037[1], tmp_1036[2] + tmp_1037[2]];
    signal tmp_1039[3] <== GLCMul()(evals[15], evals[2]);
    signal tmp_1040[3] <== [tmp_1038[0] + tmp_1039[0], tmp_1038[1] + tmp_1039[1], tmp_1038[2] + tmp_1039[2]];
    signal tmp_1041[3] <== GLCMul()(evals[16], evals[11]);
    signal tmp_2385[3] <== [tmp_1040[0] + tmp_1041[0], tmp_1040[1] + tmp_1041[1], tmp_1040[2] + tmp_1041[2]];
    signal tmp_1042[3] <== [evals[42][0] - tmp_2385[0] + p, evals[42][1] - tmp_2385[1] + p, evals[42][2] - tmp_2385[2] + p];
    signal tmp_1043[3] <== GLCMul()(evals[57], tmp_1042);
    signal tmp_2386[3] <== [tmp_1043[0] - 0 + p, tmp_1043[1], tmp_1043[2]];
    signal tmp_1044[3] <== GLCMul()(evals[4], evals[3]);
    signal tmp_1045[3] <== GLCMul()(evals[5], evals[12]);
    signal tmp_1046[3] <== [tmp_1044[0] + tmp_1045[0], tmp_1044[1] + tmp_1045[1], tmp_1044[2] + tmp_1045[2]];
    signal tmp_1047[3] <== GLCMul()(evals[6], evals[19]);
    signal tmp_1048[3] <== [tmp_1046[0] + tmp_1047[0], tmp_1046[1] + tmp_1047[1], tmp_1046[2] + tmp_1047[2]];
    signal tmp_1049[3] <== GLCMul()(evals[7], evals[23]);
    signal tmp_1050[3] <== [tmp_1048[0] + tmp_1049[0], tmp_1048[1] + tmp_1049[1], tmp_1048[2] + tmp_1049[2]];
    signal tmp_1051[3] <== GLCMul()(evals[15], evals[3]);
    signal tmp_1052[3] <== [tmp_1050[0] + tmp_1051[0], tmp_1050[1] + tmp_1051[1], tmp_1050[2] + tmp_1051[2]];
    signal tmp_1053[3] <== GLCMul()(evals[16], evals[12]);
    signal tmp_2387[3] <== [tmp_1052[0] + tmp_1053[0], tmp_1052[1] + tmp_1053[1], tmp_1052[2] + tmp_1053[2]];
    signal tmp_1054[3] <== [evals[43][0] - tmp_2387[0] + p, evals[43][1] - tmp_2387[1] + p, evals[43][2] - tmp_2387[2] + p];
    signal tmp_1055[3] <== GLCMul()(evals[57], tmp_1054);
    signal tmp_2388[3] <== [tmp_1055[0] - 0 + p, tmp_1055[1], tmp_1055[2]];
    signal tmp_1056[3] <== GLCMul()(evals[4], evals[0]);
    signal tmp_1057[3] <== GLCMul()(evals[5], evals[10]);
    signal tmp_1058[3] <== [tmp_1056[0] - tmp_1057[0] + p, tmp_1056[1] - tmp_1057[1] + p, tmp_1056[2] - tmp_1057[2] + p];
    signal tmp_1059[3] <== GLCMul()(evals[8], evals[13]);
    signal tmp_1060[3] <== [tmp_1058[0] + tmp_1059[0], tmp_1058[1] + tmp_1059[1], tmp_1058[2] + tmp_1059[2]];
    signal tmp_1061[3] <== GLCMul()(evals[32], evals[21]);
    signal tmp_1062[3] <== [tmp_1060[0] - tmp_1061[0] + p, tmp_1060[1] - tmp_1061[1] + p, tmp_1060[2] - tmp_1061[2] + p];
    signal tmp_1063[3] <== GLCMul()(evals[15], evals[0]);
    signal tmp_1064[3] <== [tmp_1062[0] + tmp_1063[0], tmp_1062[1] + tmp_1063[1], tmp_1062[2] + tmp_1063[2]];
    signal tmp_1065[3] <== GLCMul()(evals[16], evals[10]);
    signal tmp_2389[3] <== [tmp_1064[0] - tmp_1065[0] + p, tmp_1064[1] - tmp_1065[1] + p, tmp_1064[2] - tmp_1065[2] + p];
    signal tmp_1066[3] <== [evals[44][0] - tmp_2389[0] + p, evals[44][1] - tmp_2389[1] + p, evals[44][2] - tmp_2389[2] + p];
    signal tmp_1067[3] <== GLCMul()(evals[57], tmp_1066);
    signal tmp_2390[3] <== [tmp_1067[0] - 0 + p, tmp_1067[1], tmp_1067[2]];
    signal tmp_1068[3] <== GLCMul()(evals[4], evals[2]);
    signal tmp_1069[3] <== GLCMul()(evals[5], evals[11]);
    signal tmp_1070[3] <== [tmp_1068[0] - tmp_1069[0] + p, tmp_1068[1] - tmp_1069[1] + p, tmp_1068[2] - tmp_1069[2] + p];
    signal tmp_1071[3] <== GLCMul()(evals[8], evals[14]);
    signal tmp_1072[3] <== [tmp_1070[0] + tmp_1071[0], tmp_1070[1] + tmp_1071[1], tmp_1070[2] + tmp_1071[2]];
    signal tmp_1073[3] <== GLCMul()(evals[32], evals[22]);
    signal tmp_1074[3] <== [tmp_1072[0] - tmp_1073[0] + p, tmp_1072[1] - tmp_1073[1] + p, tmp_1072[2] - tmp_1073[2] + p];
    signal tmp_1075[3] <== GLCMul()(evals[15], evals[2]);
    signal tmp_1076[3] <== [tmp_1074[0] + tmp_1075[0], tmp_1074[1] + tmp_1075[1], tmp_1074[2] + tmp_1075[2]];
    signal tmp_1077[3] <== GLCMul()(evals[16], evals[11]);
    signal tmp_2391[3] <== [tmp_1076[0] - tmp_1077[0] + p, tmp_1076[1] - tmp_1077[1] + p, tmp_1076[2] - tmp_1077[2] + p];
    signal tmp_1078[3] <== [evals[45][0] - tmp_2391[0] + p, evals[45][1] - tmp_2391[1] + p, evals[45][2] - tmp_2391[2] + p];
    signal tmp_1079[3] <== GLCMul()(evals[57], tmp_1078);
    signal tmp_2392[3] <== [tmp_1079[0] - 0 + p, tmp_1079[1], tmp_1079[2]];
    signal tmp_1080[3] <== GLCMul()(evals[4], evals[3]);
    signal tmp_1081[3] <== GLCMul()(evals[5], evals[12]);
    signal tmp_1082[3] <== [tmp_1080[0] - tmp_1081[0] + p, tmp_1080[1] - tmp_1081[1] + p, tmp_1080[2] - tmp_1081[2] + p];
    signal tmp_1083[3] <== GLCMul()(evals[8], evals[19]);
    signal tmp_1084[3] <== [tmp_1082[0] + tmp_1083[0], tmp_1082[1] + tmp_1083[1], tmp_1082[2] + tmp_1083[2]];
    signal tmp_1085[3] <== GLCMul()(evals[32], evals[23]);
    signal tmp_1086[3] <== [tmp_1084[0] - tmp_1085[0] + p, tmp_1084[1] - tmp_1085[1] + p, tmp_1084[2] - tmp_1085[2] + p];
    signal tmp_1087[3] <== GLCMul()(evals[15], evals[3]);
    signal tmp_1088[3] <== [tmp_1086[0] + tmp_1087[0], tmp_1086[1] + tmp_1087[1], tmp_1086[2] + tmp_1087[2]];
    signal tmp_1089[3] <== GLCMul()(evals[16], evals[12]);
    signal tmp_2393[3] <== [tmp_1088[0] - tmp_1089[0] + p, tmp_1088[1] - tmp_1089[1] + p, tmp_1088[2] - tmp_1089[2] + p];
    signal tmp_1090[3] <== [evals[46][0] - tmp_2393[0] + p, evals[46][1] - tmp_2393[1] + p, evals[46][2] - tmp_2393[2] + p];
    signal tmp_1091[3] <== GLCMul()(evals[57], tmp_1090);
    signal tmp_2394[3] <== [tmp_1091[0] - 0 + p, tmp_1091[1], tmp_1091[2]];
    signal tmp_1092[3] <== GLCMul()(evals[4], evals[0]);
    signal tmp_1093[3] <== GLCMul()(evals[5], evals[10]);
    signal tmp_1094[3] <== [tmp_1092[0] + tmp_1093[0], tmp_1092[1] + tmp_1093[1], tmp_1092[2] + tmp_1093[2]];
    signal tmp_1095[3] <== GLCMul()(evals[6], evals[13]);
    signal tmp_1096[3] <== [tmp_1094[0] - tmp_1095[0] + p, tmp_1094[1] - tmp_1095[1] + p, tmp_1094[2] - tmp_1095[2] + p];
    signal tmp_1097[3] <== GLCMul()(evals[7], evals[21]);
    signal tmp_1098[3] <== [tmp_1096[0] - tmp_1097[0] + p, tmp_1096[1] - tmp_1097[1] + p, tmp_1096[2] - tmp_1097[2] + p];
    signal tmp_1099[3] <== GLCMul()(evals[15], evals[13]);
    signal tmp_1100[3] <== [tmp_1098[0] + tmp_1099[0], tmp_1098[1] + tmp_1099[1], tmp_1098[2] + tmp_1099[2]];
    signal tmp_1101[3] <== GLCMul()(evals[17], evals[21]);
    signal tmp_2395[3] <== [tmp_1100[0] + tmp_1101[0], tmp_1100[1] + tmp_1101[1], tmp_1100[2] + tmp_1101[2]];
    signal tmp_1102[3] <== [evals[47][0] - tmp_2395[0] + p, evals[47][1] - tmp_2395[1] + p, evals[47][2] - tmp_2395[2] + p];
    signal tmp_1103[3] <== GLCMul()(evals[57], tmp_1102);
    signal tmp_2396[3] <== [tmp_1103[0] - 0 + p, tmp_1103[1], tmp_1103[2]];
    signal tmp_1104[3] <== GLCMul()(evals[4], evals[2]);
    signal tmp_1105[3] <== GLCMul()(evals[5], evals[11]);
    signal tmp_1106[3] <== [tmp_1104[0] + tmp_1105[0], tmp_1104[1] + tmp_1105[1], tmp_1104[2] + tmp_1105[2]];
    signal tmp_1107[3] <== GLCMul()(evals[6], evals[14]);
    signal tmp_1108[3] <== [tmp_1106[0] - tmp_1107[0] + p, tmp_1106[1] - tmp_1107[1] + p, tmp_1106[2] - tmp_1107[2] + p];
    signal tmp_1109[3] <== GLCMul()(evals[7], evals[22]);
    signal tmp_1110[3] <== [tmp_1108[0] - tmp_1109[0] + p, tmp_1108[1] - tmp_1109[1] + p, tmp_1108[2] - tmp_1109[2] + p];
    signal tmp_1111[3] <== GLCMul()(evals[15], evals[14]);
    signal tmp_1112[3] <== [tmp_1110[0] + tmp_1111[0], tmp_1110[1] + tmp_1111[1], tmp_1110[2] + tmp_1111[2]];
    signal tmp_1113[3] <== GLCMul()(evals[17], evals[22]);
    signal tmp_2397[3] <== [tmp_1112[0] + tmp_1113[0], tmp_1112[1] + tmp_1113[1], tmp_1112[2] + tmp_1113[2]];
    signal tmp_1114[3] <== [evals[48][0] - tmp_2397[0] + p, evals[48][1] - tmp_2397[1] + p, evals[48][2] - tmp_2397[2] + p];
    signal tmp_1115[3] <== GLCMul()(evals[57], tmp_1114);
    signal tmp_2398[3] <== [tmp_1115[0] - 0 + p, tmp_1115[1], tmp_1115[2]];
    signal tmp_1116[3] <== GLCMul()(evals[4], evals[3]);
    signal tmp_1117[3] <== GLCMul()(evals[5], evals[12]);
    signal tmp_1118[3] <== [tmp_1116[0] + tmp_1117[0], tmp_1116[1] + tmp_1117[1], tmp_1116[2] + tmp_1117[2]];
    signal tmp_1119[3] <== GLCMul()(evals[6], evals[19]);
    signal tmp_1120[3] <== [tmp_1118[0] - tmp_1119[0] + p, tmp_1118[1] - tmp_1119[1] + p, tmp_1118[2] - tmp_1119[2] + p];
    signal tmp_1121[3] <== GLCMul()(evals[7], evals[23]);
    signal tmp_1122[3] <== [tmp_1120[0] - tmp_1121[0] + p, tmp_1120[1] - tmp_1121[1] + p, tmp_1120[2] - tmp_1121[2] + p];
    signal tmp_1123[3] <== GLCMul()(evals[15], evals[19]);
    signal tmp_1124[3] <== [tmp_1122[0] + tmp_1123[0], tmp_1122[1] + tmp_1123[1], tmp_1122[2] + tmp_1123[2]];
    signal tmp_1125[3] <== GLCMul()(evals[17], evals[23]);
    signal tmp_2399[3] <== [tmp_1124[0] + tmp_1125[0], tmp_1124[1] + tmp_1125[1], tmp_1124[2] + tmp_1125[2]];
    signal tmp_1126[3] <== [evals[49][0] - tmp_2399[0] + p, evals[49][1] - tmp_2399[1] + p, evals[49][2] - tmp_2399[2] + p];
    signal tmp_1127[3] <== GLCMul()(evals[57], tmp_1126);
    signal tmp_2400[3] <== [tmp_1127[0] - 0 + p, tmp_1127[1], tmp_1127[2]];
    signal tmp_1128[3] <== GLCMul()(evals[4], evals[0]);
    signal tmp_1129[3] <== GLCMul()(evals[5], evals[10]);
    signal tmp_1130[3] <== [tmp_1128[0] - tmp_1129[0] + p, tmp_1128[1] - tmp_1129[1] + p, tmp_1128[2] - tmp_1129[2] + p];
    signal tmp_1131[3] <== GLCMul()(evals[8], evals[13]);
    signal tmp_1132[3] <== [tmp_1130[0] - tmp_1131[0] + p, tmp_1130[1] - tmp_1131[1] + p, tmp_1130[2] - tmp_1131[2] + p];
    signal tmp_1133[3] <== GLCMul()(evals[32], evals[21]);
    signal tmp_1134[3] <== [tmp_1132[0] + tmp_1133[0], tmp_1132[1] + tmp_1133[1], tmp_1132[2] + tmp_1133[2]];
    signal tmp_1135[3] <== GLCMul()(evals[15], evals[13]);
    signal tmp_1136[3] <== [tmp_1134[0] + tmp_1135[0], tmp_1134[1] + tmp_1135[1], tmp_1134[2] + tmp_1135[2]];
    signal tmp_1137[3] <== GLCMul()(evals[17], evals[21]);
    signal tmp_2401[3] <== [tmp_1136[0] - tmp_1137[0] + p, tmp_1136[1] - tmp_1137[1] + p, tmp_1136[2] - tmp_1137[2] + p];
    signal tmp_1138[3] <== [evals[50][0] - tmp_2401[0] + p, evals[50][1] - tmp_2401[1] + p, evals[50][2] - tmp_2401[2] + p];
    signal tmp_1139[3] <== GLCMul()(evals[57], tmp_1138);
    signal tmp_2402[3] <== [tmp_1139[0] - 0 + p, tmp_1139[1], tmp_1139[2]];
    signal tmp_1140[3] <== GLCMul()(evals[4], evals[2]);
    signal tmp_1141[3] <== GLCMul()(evals[5], evals[11]);
    signal tmp_1142[3] <== [tmp_1140[0] - tmp_1141[0] + p, tmp_1140[1] - tmp_1141[1] + p, tmp_1140[2] - tmp_1141[2] + p];
    signal tmp_1143[3] <== GLCMul()(evals[8], evals[14]);
    signal tmp_1144[3] <== [tmp_1142[0] - tmp_1143[0] + p, tmp_1142[1] - tmp_1143[1] + p, tmp_1142[2] - tmp_1143[2] + p];
    signal tmp_1145[3] <== GLCMul()(evals[32], evals[22]);
    signal tmp_1146[3] <== [tmp_1144[0] + tmp_1145[0], tmp_1144[1] + tmp_1145[1], tmp_1144[2] + tmp_1145[2]];
    signal tmp_1147[3] <== GLCMul()(evals[15], evals[14]);
    signal tmp_1148[3] <== [tmp_1146[0] + tmp_1147[0], tmp_1146[1] + tmp_1147[1], tmp_1146[2] + tmp_1147[2]];
    signal tmp_1149[3] <== GLCMul()(evals[17], evals[22]);
    signal tmp_2403[3] <== [tmp_1148[0] - tmp_1149[0] + p, tmp_1148[1] - tmp_1149[1] + p, tmp_1148[2] - tmp_1149[2] + p];
    signal tmp_1150[3] <== [evals[51][0] - tmp_2403[0] + p, evals[51][1] - tmp_2403[1] + p, evals[51][2] - tmp_2403[2] + p];
    signal tmp_1151[3] <== GLCMul()(evals[57], tmp_1150);
    signal tmp_2404[3] <== [tmp_1151[0] - 0 + p, tmp_1151[1], tmp_1151[2]];
    signal tmp_1152[3] <== GLCMul()(evals[4], evals[3]);
    signal tmp_1153[3] <== GLCMul()(evals[5], evals[12]);
    signal tmp_1154[3] <== [tmp_1152[0] - tmp_1153[0] + p, tmp_1152[1] - tmp_1153[1] + p, tmp_1152[2] - tmp_1153[2] + p];
    signal tmp_1155[3] <== GLCMul()(evals[8], evals[19]);
    signal tmp_1156[3] <== [tmp_1154[0] - tmp_1155[0] + p, tmp_1154[1] - tmp_1155[1] + p, tmp_1154[2] - tmp_1155[2] + p];
    signal tmp_1157[3] <== GLCMul()(evals[32], evals[23]);
    signal tmp_1158[3] <== [tmp_1156[0] + tmp_1157[0], tmp_1156[1] + tmp_1157[1], tmp_1156[2] + tmp_1157[2]];
    signal tmp_1159[3] <== GLCMul()(evals[15], evals[19]);
    signal tmp_1160[3] <== [tmp_1158[0] + tmp_1159[0], tmp_1158[1] + tmp_1159[1], tmp_1158[2] + tmp_1159[2]];
    signal tmp_1161[3] <== GLCMul()(evals[17], evals[23]);
    signal tmp_2405[3] <== [tmp_1160[0] - tmp_1161[0] + p, tmp_1160[1] - tmp_1161[1] + p, tmp_1160[2] - tmp_1161[2] + p];
    signal tmp_1162[3] <== [evals[52][0] - tmp_2405[0] + p, evals[52][1] - tmp_2405[1] + p, evals[52][2] - tmp_2405[2] + p];
    signal tmp_1163[3] <== GLCMul()(evals[57], tmp_1162);
    signal tmp_2406[3] <== [tmp_1163[0] - 0 + p, tmp_1163[1], tmp_1163[2]];
    signal tmp_1164[3] <== [evals[44][0] + evals[45][0], evals[44][1] + evals[45][1], evals[44][2] + evals[45][2]];
    signal tmp_1165[3] <== [evals[47][0] + evals[48][0], evals[47][1] + evals[48][1], evals[47][2] + evals[48][2]];
    signal tmp_2407[3] <== GLCMul()(tmp_1164, tmp_1165);
    signal tmp_1166[3] <== [evals[45][0] + evals[46][0], evals[45][1] + evals[46][1], evals[45][2] + evals[46][2]];
    signal tmp_1167[3] <== [evals[48][0] + evals[49][0], evals[48][1] + evals[49][1], evals[48][2] + evals[49][2]];
    signal tmp_2408[3] <== GLCMul()(tmp_1166, tmp_1167);
    signal tmp_2409[3] <== GLCMul()(evals[45], evals[48]);
    signal tmp_2410[3] <== GLCMul()(evals[44], evals[47]);
    signal tmp_1168[3] <== [tmp_2407[0] + tmp_2408[0], tmp_2407[1] + tmp_2408[1], tmp_2407[2] + tmp_2408[2]];
    signal tmp_1169[3] <== GLCMul()([2, 0, 0], tmp_2409);
    signal tmp_1170[3] <== [tmp_1168[0] - tmp_1169[0] + p, tmp_1168[1] - tmp_1169[1] + p, tmp_1168[2] - tmp_1169[2] + p];
    signal tmp_1171[3] <== [tmp_1170[0] - tmp_2410[0] + p, tmp_1170[1] - tmp_2410[1] + p, tmp_1170[2] - tmp_2410[2] + p];
    signal tmp_2411[3] <== [tmp_1171[0] + evals[42][0], tmp_1171[1] + evals[42][1], tmp_1171[2] + evals[42][2]];
    signal tmp_1172[3] <== [evals[44][0] + evals[46][0], evals[44][1] + evals[46][1], evals[44][2] + evals[46][2]];
    signal tmp_1173[3] <== [evals[47][0] + evals[49][0], evals[47][1] + evals[49][1], evals[47][2] + evals[49][2]];
    signal tmp_2412[3] <== GLCMul()(tmp_1172, tmp_1173);
    signal tmp_1174[3] <== [tmp_2412[0] - tmp_2410[0] + p, tmp_2412[1] - tmp_2410[1] + p, tmp_2412[2] - tmp_2410[2] + p];
    signal tmp_1175[3] <== [tmp_1174[0] + tmp_2409[0], tmp_1174[1] + tmp_2409[1], tmp_1174[2] + tmp_2409[2]];
    signal tmp_2413[3] <== [tmp_1175[0] + evals[43][0], tmp_1175[1] + evals[43][1], tmp_1175[2] + evals[43][2]];
    signal tmp_1176[3] <== [tmp_2411[0] + tmp_2413[0], tmp_2411[1] + tmp_2413[1], tmp_2411[2] + tmp_2413[2]];
    signal tmp_1177[3] <== [evals[48][0] + evals[49][0], evals[48][1] + evals[49][1], evals[48][2] + evals[49][2]];
    signal tmp_2414[3] <== GLCMul()(tmp_1176, tmp_1177);
    signal tmp_2415[3] <== GLCMul()(evals[46], evals[49]);
    signal tmp_1178[3] <== [tmp_2408[0] + tmp_2410[0], tmp_2408[1] + tmp_2410[1], tmp_2408[2] + tmp_2410[2]];
    signal tmp_1179[3] <== [tmp_1178[0] - tmp_2409[0] + p, tmp_1178[1] - tmp_2409[1] + p, tmp_1178[2] - tmp_2409[2] + p];
    signal tmp_1180[3] <== [tmp_1179[0] - tmp_2415[0] + p, tmp_1179[1] - tmp_2415[1] + p, tmp_1179[2] - tmp_2415[2] + p];
    signal tmp_2416[3] <== [tmp_1180[0] + evals[40][0], tmp_1180[1] + evals[40][1], tmp_1180[2] + evals[40][2]];
    signal tmp_2417[3] <== GLCMul()(tmp_2416, evals[47]);
    signal tmp_2418[3] <== GLCMul()(tmp_2411, evals[48]);
    signal tmp_2419[3] <== GLCMul()(tmp_2413, evals[49]);
    signal tmp_1181[3] <== [tmp_2414[0] + tmp_2417[0], tmp_2414[1] + tmp_2417[1], tmp_2414[2] + tmp_2417[2]];
    signal tmp_1182[3] <== [tmp_1181[0] - tmp_2418[0] + p, tmp_1181[1] - tmp_2418[1] + p, tmp_1181[2] - tmp_2418[2] + p];
    signal tmp_1183[3] <== [tmp_1182[0] - tmp_2419[0] + p, tmp_1182[1] - tmp_2419[1] + p, tmp_1182[2] - tmp_2419[2] + p];
    signal tmp_2420[3] <== [tmp_1183[0] + evals[21][0], tmp_1183[1] + evals[21][1], tmp_1183[2] + evals[21][2]];
    signal tmp_1184[3] <== [tmp_2416[0] + tmp_2411[0], tmp_2416[1] + tmp_2411[1], tmp_2416[2] + tmp_2411[2]];
    signal tmp_1185[3] <== [evals[47][0] + evals[48][0], evals[47][1] + evals[48][1], evals[47][2] + evals[48][2]];
    signal tmp_2421[3] <== GLCMul()(tmp_1184, tmp_1185);
    signal tmp_1186[3] <== [tmp_2421[0] + tmp_2414[0], tmp_2421[1] + tmp_2414[1], tmp_2421[2] + tmp_2414[2]];
    signal tmp_1187[3] <== GLCMul()([2, 0, 0], tmp_2418);
    signal tmp_1188[3] <== [tmp_1186[0] - tmp_1187[0] + p, tmp_1186[1] - tmp_1187[1] + p, tmp_1186[2] - tmp_1187[2] + p];
    signal tmp_1189[3] <== [tmp_1188[0] - tmp_2417[0] + p, tmp_1188[1] - tmp_2417[1] + p, tmp_1188[2] - tmp_2417[2] + p];
    signal tmp_2422[3] <== [tmp_1189[0] + evals[22][0], tmp_1189[1] + evals[22][1], tmp_1189[2] + evals[22][2]];
    signal tmp_1190[3] <== [tmp_2420[0] + tmp_2422[0], tmp_2420[1] + tmp_2422[1], tmp_2420[2] + tmp_2422[2]];
    signal tmp_1191[3] <== [evals[47][0] + evals[48][0], evals[47][1] + evals[48][1], evals[47][2] + evals[48][2]];
    signal tmp_2423[3] <== GLCMul()(tmp_1190, tmp_1191);
    signal tmp_1192[3] <== [tmp_2416[0] + tmp_2413[0], tmp_2416[1] + tmp_2413[1], tmp_2416[2] + tmp_2413[2]];
    signal tmp_1193[3] <== [evals[47][0] + evals[49][0], evals[47][1] + evals[49][1], evals[47][2] + evals[49][2]];
    signal tmp_2424[3] <== GLCMul()(tmp_1192, tmp_1193);
    signal tmp_1194[3] <== [tmp_2424[0] - tmp_2417[0] + p, tmp_2424[1] - tmp_2417[1] + p, tmp_2424[2] - tmp_2417[2] + p];
    signal tmp_1195[3] <== [tmp_1194[0] + tmp_2418[0], tmp_1194[1] + tmp_2418[1], tmp_1194[2] + tmp_2418[2]];
    signal tmp_2425[3] <== [tmp_1195[0] + evals[23][0], tmp_1195[1] + evals[23][1], tmp_1195[2] + evals[23][2]];
    signal tmp_1196[3] <== [tmp_2422[0] + tmp_2425[0], tmp_2422[1] + tmp_2425[1], tmp_2422[2] + tmp_2425[2]];
    signal tmp_1197[3] <== [evals[48][0] + evals[49][0], evals[48][1] + evals[49][1], evals[48][2] + evals[49][2]];
    signal tmp_2426[3] <== GLCMul()(tmp_1196, tmp_1197);
    signal tmp_2427[3] <== GLCMul()(tmp_2422, evals[48]);
    signal tmp_2428[3] <== GLCMul()(tmp_2420, evals[47]);
    signal tmp_1198[3] <== [tmp_2423[0] + tmp_2426[0], tmp_2423[1] + tmp_2426[1], tmp_2423[2] + tmp_2426[2]];
    signal tmp_1199[3] <== GLCMul()([2, 0, 0], tmp_2427);
    signal tmp_1200[3] <== [tmp_1198[0] - tmp_1199[0] + p, tmp_1198[1] - tmp_1199[1] + p, tmp_1198[2] - tmp_1199[2] + p];
    signal tmp_1201[3] <== [tmp_1200[0] - tmp_2428[0] + p, tmp_1200[1] - tmp_2428[1] + p, tmp_1200[2] - tmp_2428[2] + p];
    signal tmp_2429[3] <== [tmp_1201[0] + evals[14][0], tmp_1201[1] + evals[14][1], tmp_1201[2] + evals[14][2]];
    signal tmp_1202[3] <== [tmp_2420[0] + tmp_2425[0], tmp_2420[1] + tmp_2425[1], tmp_2420[2] + tmp_2425[2]];
    signal tmp_1203[3] <== [evals[47][0] + evals[49][0], evals[47][1] + evals[49][1], evals[47][2] + evals[49][2]];
    signal tmp_2430[3] <== GLCMul()(tmp_1202, tmp_1203);
    signal tmp_1204[3] <== [tmp_2430[0] - tmp_2428[0] + p, tmp_2430[1] - tmp_2428[1] + p, tmp_2430[2] - tmp_2428[2] + p];
    signal tmp_1205[3] <== [tmp_1204[0] + tmp_2427[0], tmp_1204[1] + tmp_2427[1], tmp_1204[2] + tmp_2427[2]];
    signal tmp_2431[3] <== [tmp_1205[0] + evals[19][0], tmp_1205[1] + evals[19][1], tmp_1205[2] + evals[19][2]];
    signal tmp_1206[3] <== [tmp_2429[0] + tmp_2431[0], tmp_2429[1] + tmp_2431[1], tmp_2429[2] + tmp_2431[2]];
    signal tmp_1207[3] <== [evals[48][0] + evals[49][0], evals[48][1] + evals[49][1], evals[48][2] + evals[49][2]];
    signal tmp_2432[3] <== GLCMul()(tmp_1206, tmp_1207);
    signal tmp_2433[3] <== GLCMul()(tmp_2425, evals[49]);
    signal tmp_1208[3] <== [tmp_2426[0] + tmp_2428[0], tmp_2426[1] + tmp_2428[1], tmp_2426[2] + tmp_2428[2]];
    signal tmp_1209[3] <== [tmp_1208[0] - tmp_2427[0] + p, tmp_1208[1] - tmp_2427[1] + p, tmp_1208[2] - tmp_2427[2] + p];
    signal tmp_1210[3] <== [tmp_1209[0] - tmp_2433[0] + p, tmp_1209[1] - tmp_2433[1] + p, tmp_1209[2] - tmp_2433[2] + p];
    signal tmp_2434[3] <== [tmp_1210[0] + evals[13][0], tmp_1210[1] + evals[13][1], tmp_1210[2] + evals[13][2]];
    signal tmp_2435[3] <== GLCMul()(tmp_2434, evals[47]);
    signal tmp_2436[3] <== GLCMul()(tmp_2429, evals[48]);
    signal tmp_2437[3] <== GLCMul()(tmp_2431, evals[49]);
    signal tmp_1211[3] <== [tmp_2432[0] + tmp_2435[0], tmp_2432[1] + tmp_2435[1], tmp_2432[2] + tmp_2435[2]];
    signal tmp_1212[3] <== [tmp_1211[0] - tmp_2436[0] + p, tmp_1211[1] - tmp_2436[1] + p, tmp_1211[2] - tmp_2436[2] + p];
    signal tmp_1213[3] <== [tmp_1212[0] - tmp_2437[0] + p, tmp_1212[1] - tmp_2437[1] + p, tmp_1212[2] - tmp_2437[2] + p];
    signal tmp_2438[3] <== [tmp_1213[0] + evals[10][0], tmp_1213[1] + evals[10][1], tmp_1213[2] + evals[10][2]];
    signal tmp_1214[3] <== [evals[50][0] - tmp_2438[0] + p, evals[50][1] - tmp_2438[1] + p, evals[50][2] - tmp_2438[2] + p];
    signal tmp_1215[3] <== GLCMul()(evals[58], tmp_1214);
    signal tmp_2439[3] <== [tmp_1215[0] - 0 + p, tmp_1215[1], tmp_1215[2]];
    signal tmp_1216[3] <== [tmp_2434[0] + tmp_2429[0], tmp_2434[1] + tmp_2429[1], tmp_2434[2] + tmp_2429[2]];
    signal tmp_1217[3] <== [evals[47][0] + evals[48][0], evals[47][1] + evals[48][1], evals[47][2] + evals[48][2]];
    signal tmp_2440[3] <== GLCMul()(tmp_1216, tmp_1217);
    signal tmp_1218[3] <== [tmp_2440[0] + tmp_2432[0], tmp_2440[1] + tmp_2432[1], tmp_2440[2] + tmp_2432[2]];
    signal tmp_1219[3] <== GLCMul()([2, 0, 0], tmp_2436);
    signal tmp_1220[3] <== [tmp_1218[0] - tmp_1219[0] + p, tmp_1218[1] - tmp_1219[1] + p, tmp_1218[2] - tmp_1219[2] + p];
    signal tmp_1221[3] <== [tmp_1220[0] - tmp_2435[0] + p, tmp_1220[1] - tmp_2435[1] + p, tmp_1220[2] - tmp_2435[2] + p];
    signal tmp_2441[3] <== [tmp_1221[0] + evals[11][0], tmp_1221[1] + evals[11][1], tmp_1221[2] + evals[11][2]];
    signal tmp_1222[3] <== [evals[51][0] - tmp_2441[0] + p, evals[51][1] - tmp_2441[1] + p, evals[51][2] - tmp_2441[2] + p];
    signal tmp_1223[3] <== GLCMul()(evals[58], tmp_1222);
    signal tmp_2442[3] <== [tmp_1223[0] - 0 + p, tmp_1223[1], tmp_1223[2]];
    signal tmp_1224[3] <== [tmp_2434[0] + tmp_2431[0], tmp_2434[1] + tmp_2431[1], tmp_2434[2] + tmp_2431[2]];
    signal tmp_1225[3] <== [evals[47][0] + evals[49][0], evals[47][1] + evals[49][1], evals[47][2] + evals[49][2]];
    signal tmp_2443[3] <== GLCMul()(tmp_1224, tmp_1225);
    signal tmp_1226[3] <== [tmp_2443[0] - tmp_2435[0] + p, tmp_2443[1] - tmp_2435[1] + p, tmp_2443[2] - tmp_2435[2] + p];
    signal tmp_1227[3] <== [tmp_1226[0] + tmp_2436[0], tmp_1226[1] + tmp_2436[1], tmp_1226[2] + tmp_2436[2]];
    signal tmp_2444[3] <== [tmp_1227[0] + evals[12][0], tmp_1227[1] + evals[12][1], tmp_1227[2] + evals[12][2]];
    signal tmp_1228[3] <== [evals[52][0] - tmp_2444[0] + p, evals[52][1] - tmp_2444[1] + p, evals[52][2] - tmp_2444[2] + p];
    signal tmp_1229[3] <== GLCMul()(evals[58], tmp_1228);
    signal tmp_2445[3] <== [tmp_1229[0] - 0 + p, tmp_1229[1], tmp_1229[2]];
    signal tmp_1230[3] <== GLCMul()(tmp_2019, evals[58]);
    signal tmp_2446[3] <== [tmp_1230[0] - 0 + p, tmp_1230[1], tmp_1230[2]];
    signal tmp_1231[3] <== [1 - evals[47][0] + p, -evals[47][1] + p, -evals[47][2] + p];
    signal tmp_1232[3] <== [1 - evals[48][0] + p, -evals[48][1] + p, -evals[48][2] + p];
    signal tmp_2447[3] <== GLCMul()(tmp_1231, tmp_1232);
    signal tmp_1233[3] <== [evals[13][0] - evals[49][0] + p, evals[13][1] - evals[49][1] + p, evals[13][2] - evals[49][2] + p];
    signal tmp_2448[3] <== GLCMul()(tmp_2447, tmp_1233);
    signal tmp_1234[3] <== GLCMul()(evals[59], tmp_2448);
    signal tmp_2449[3] <== [tmp_1234[0] - 0 + p, tmp_1234[1], tmp_1234[2]];
    signal tmp_1235[3] <== [evals[14][0] - evals[50][0] + p, evals[14][1] - evals[50][1] + p, evals[14][2] - evals[50][2] + p];
    signal tmp_2450[3] <== GLCMul()(tmp_2447, tmp_1235);
    signal tmp_1236[3] <== GLCMul()(evals[59], tmp_2450);
    signal tmp_2451[3] <== [tmp_1236[0] - 0 + p, tmp_1236[1], tmp_1236[2]];
    signal tmp_1237[3] <== [evals[19][0] - evals[51][0] + p, evals[19][1] - evals[51][1] + p, evals[19][2] - evals[51][2] + p];
    signal tmp_2452[3] <== GLCMul()(tmp_2447, tmp_1237);
    signal tmp_1238[3] <== GLCMul()(evals[59], tmp_2452);
    signal tmp_2453[3] <== [tmp_1238[0] - 0 + p, tmp_1238[1], tmp_1238[2]];
    signal tmp_1239[3] <== [1 - evals[48][0] + p, -evals[48][1] + p, -evals[48][2] + p];
    signal tmp_2454[3] <== GLCMul()(evals[47], tmp_1239);
    signal tmp_1240[3] <== [evals[21][0] - evals[49][0] + p, evals[21][1] - evals[49][1] + p, evals[21][2] - evals[49][2] + p];
    signal tmp_2455[3] <== GLCMul()(tmp_2454, tmp_1240);
    signal tmp_1241[3] <== GLCMul()(evals[59], tmp_2455);
    signal tmp_2456[3] <== [tmp_1241[0] - 0 + p, tmp_1241[1], tmp_1241[2]];
    signal tmp_1242[3] <== [evals[22][0] - evals[50][0] + p, evals[22][1] - evals[50][1] + p, evals[22][2] - evals[50][2] + p];
    signal tmp_2457[3] <== GLCMul()(tmp_2454, tmp_1242);
    signal tmp_1243[3] <== GLCMul()(evals[59], tmp_2457);
    signal tmp_2458[3] <== [tmp_1243[0] - 0 + p, tmp_1243[1], tmp_1243[2]];
    signal tmp_1244[3] <== [evals[23][0] - evals[51][0] + p, evals[23][1] - evals[51][1] + p, evals[23][2] - evals[51][2] + p];
    signal tmp_2459[3] <== GLCMul()(tmp_2454, tmp_1244);
    signal tmp_1245[3] <== GLCMul()(evals[59], tmp_2459);
    signal tmp_2460[3] <== [tmp_1245[0] - 0 + p, tmp_1245[1], tmp_1245[2]];
    signal tmp_1246[3] <== [1 - evals[47][0] + p, -evals[47][1] + p, -evals[47][2] + p];
    signal tmp_2461[3] <== GLCMul()(tmp_1246, evals[48]);
    signal tmp_1247[3] <== [evals[40][0] - evals[49][0] + p, evals[40][1] - evals[49][1] + p, evals[40][2] - evals[49][2] + p];
    signal tmp_2462[3] <== GLCMul()(tmp_2461, tmp_1247);
    signal tmp_1248[3] <== GLCMul()(evals[59], tmp_2462);
    signal tmp_2463[3] <== [tmp_1248[0] - 0 + p, tmp_1248[1], tmp_1248[2]];
    signal tmp_1249[3] <== [evals[42][0] - evals[50][0] + p, evals[42][1] - evals[50][1] + p, evals[42][2] - evals[50][2] + p];
    signal tmp_2464[3] <== GLCMul()(tmp_2461, tmp_1249);
    signal tmp_1250[3] <== GLCMul()(evals[59], tmp_2464);
    signal tmp_2465[3] <== [tmp_1250[0] - 0 + p, tmp_1250[1], tmp_1250[2]];
    signal tmp_1251[3] <== [evals[43][0] - evals[51][0] + p, evals[43][1] - evals[51][1] + p, evals[43][2] - evals[51][2] + p];
    signal tmp_2466[3] <== GLCMul()(tmp_2461, tmp_1251);
    signal tmp_1252[3] <== GLCMul()(evals[59], tmp_2466);
    signal tmp_2467[3] <== [tmp_1252[0] - 0 + p, tmp_1252[1], tmp_1252[2]];
    signal tmp_2468[3] <== GLCMul()(evals[47], evals[48]);
    signal tmp_1253[3] <== [evals[44][0] - evals[49][0] + p, evals[44][1] - evals[49][1] + p, evals[44][2] - evals[49][2] + p];
    signal tmp_2469[3] <== GLCMul()(tmp_2468, tmp_1253);
    signal tmp_1254[3] <== GLCMul()(evals[59], tmp_2469);
    signal tmp_2470[3] <== [tmp_1254[0] - 0 + p, tmp_1254[1], tmp_1254[2]];
    signal tmp_1255[3] <== [evals[45][0] - evals[50][0] + p, evals[45][1] - evals[50][1] + p, evals[45][2] - evals[50][2] + p];
    signal tmp_2471[3] <== GLCMul()(tmp_2468, tmp_1255);
    signal tmp_1256[3] <== GLCMul()(evals[59], tmp_2471);
    signal tmp_2472[3] <== [tmp_1256[0] - 0 + p, tmp_1256[1], tmp_1256[2]];
    signal tmp_1257[3] <== [evals[46][0] - evals[51][0] + p, evals[46][1] - evals[51][1] + p, evals[46][2] - evals[51][2] + p];
    signal tmp_2473[3] <== GLCMul()(tmp_2468, tmp_1257);
    signal tmp_1258[3] <== GLCMul()(evals[59], tmp_2473);
    signal tmp_2474[3] <== [tmp_1258[0] - 0 + p, tmp_1258[1], tmp_1258[2]];
    signal tmp_1259[3] <== GLCMul()(tmp_2019, evals[59]);
    signal tmp_2475[3] <== [tmp_1259[0] - 0 + p, tmp_1259[1], tmp_1259[2]];
    signal tmp_1260[3] <== GLCMul()(tmp_2022, evals[59]);
    signal tmp_2476[3] <== [tmp_1260[0] - 0 + p, tmp_1260[1], tmp_1260[2]];
    signal tmp_1261[3] <== [1 - evals[47][0] + p, -evals[47][1] + p, -evals[47][2] + p];
    signal tmp_2477[3] <== GLCMul()(evals[47], tmp_1261);
    signal tmp_1262[3] <== GLCMul()(evals[59], tmp_2477);
    signal tmp_2478[3] <== [tmp_1262[0] - 0 + p, tmp_1262[1], tmp_1262[2]];
    signal tmp_1263[3] <== [1 - evals[48][0] + p, -evals[48][1] + p, -evals[48][2] + p];
    signal tmp_2479[3] <== GLCMul()(evals[48], tmp_1263);
    signal tmp_1264[3] <== GLCMul()(evals[59], tmp_2479);
    signal tmp_2480[3] <== [tmp_1264[0] - 0 + p, tmp_1264[1], tmp_1264[2]];
    signal tmp_1265[3] <== [evals[60][0] - 1 + p, evals[60][1], evals[60][2]];
    signal tmp_2481[3] <== GLCMul()(evals[1], tmp_1265);
    signal tmp_2482[3] <== evals[19];
    signal tmp_2483[3] <== evals[61];
    signal tmp_1266[3] <== GLCMul()(challenges3, tmp_2483);
    signal tmp_1267[3] <== [tmp_2482[0] + tmp_1266[0], tmp_2482[1] + tmp_1266[1], tmp_2482[2] + tmp_1266[2]];
    signal tmp_1268[3] <== [tmp_1267[0] + challenges2[0], tmp_1267[1] + challenges2[1], tmp_1267[2] + challenges2[2]];
    signal tmp_2484[3] <== GLCMul()(evals[62], tmp_1268);
    signal tmp_2485[3] <== evals[21];
    signal tmp_2486[3] <== evals[63];
    signal tmp_1269[3] <== GLCMul()(challenges3, tmp_2486);
    signal tmp_1270[3] <== [tmp_2485[0] + tmp_1269[0], tmp_2485[1] + tmp_1269[1], tmp_2485[2] + tmp_1269[2]];
    signal tmp_1271[3] <== [tmp_1270[0] + challenges2[0], tmp_1270[1] + challenges2[1], tmp_1270[2] + challenges2[2]];
    signal tmp_2487[3] <== GLCMul()(tmp_2484, tmp_1271);
    signal tmp_2488[3] <== evals[22];
    signal tmp_2489[3] <== evals[64];
    signal tmp_1272[3] <== GLCMul()(challenges3, tmp_2489);
    signal tmp_1273[3] <== [tmp_2488[0] + tmp_1272[0], tmp_2488[1] + tmp_1272[1], tmp_2488[2] + tmp_1272[2]];
    signal tmp_1274[3] <== [tmp_1273[0] + challenges2[0], tmp_1273[1] + challenges2[1], tmp_1273[2] + challenges2[2]];
    signal tmp_2490[3] <== GLCMul()(tmp_2487, tmp_1274);
    signal tmp_2491[3] <== evals[23];
    signal tmp_2492[3] <== evals[65];
    signal tmp_1275[3] <== GLCMul()(challenges3, tmp_2492);
    signal tmp_1276[3] <== [tmp_2491[0] + tmp_1275[0], tmp_2491[1] + tmp_1275[1], tmp_2491[2] + tmp_1275[2]];
    signal tmp_1277[3] <== [tmp_1276[0] + challenges2[0], tmp_1276[1] + challenges2[1], tmp_1276[2] + challenges2[2]];
    signal tmp_2493[3] <== GLCMul()(tmp_2490, tmp_1277);
    signal tmp_1278[3] <== GLCMul()(challenges3, [3688660304411827445,0,0]);
    signal tmp_1279[3] <== GLCMul()(tmp_1278, challenges7);
    signal tmp_1280[3] <== [tmp_2482[0] + tmp_1279[0], tmp_2482[1] + tmp_1279[1], tmp_2482[2] + tmp_1279[2]];
    signal tmp_1281[3] <== [tmp_1280[0] + challenges2[0], tmp_1280[1] + challenges2[1], tmp_1280[2] + challenges2[2]];
    signal tmp_2494[3] <== GLCMul()(evals[66], tmp_1281);
    signal tmp_1282[3] <== GLCMul()(challenges3, [16725109960945739746,0,0]);
    signal tmp_1283[3] <== GLCMul()(tmp_1282, challenges7);
    signal tmp_1284[3] <== [tmp_2485[0] + tmp_1283[0], tmp_2485[1] + tmp_1283[1], tmp_2485[2] + tmp_1283[2]];
    signal tmp_1285[3] <== [tmp_1284[0] + challenges2[0], tmp_1284[1] + challenges2[1], tmp_1284[2] + challenges2[2]];
    signal tmp_2495[3] <== GLCMul()(tmp_2494, tmp_1285);
    signal tmp_1286[3] <== GLCMul()(challenges3, [16538725463549498621,0,0]);
    signal tmp_1287[3] <== GLCMul()(tmp_1286, challenges7);
    signal tmp_1288[3] <== [tmp_2488[0] + tmp_1287[0], tmp_2488[1] + tmp_1287[1], tmp_2488[2] + tmp_1287[2]];
    signal tmp_1289[3] <== [tmp_1288[0] + challenges2[0], tmp_1288[1] + challenges2[1], tmp_1288[2] + challenges2[2]];
    signal tmp_2496[3] <== GLCMul()(tmp_2495, tmp_1289);
    signal tmp_1290[3] <== GLCMul()(challenges3, [12756200801261202346,0,0]);
    signal tmp_1291[3] <== GLCMul()(tmp_1290, challenges7);
    signal tmp_1292[3] <== [tmp_2491[0] + tmp_1291[0], tmp_2491[1] + tmp_1291[1], tmp_2491[2] + tmp_1291[2]];
    signal tmp_1293[3] <== [tmp_1292[0] + challenges2[0], tmp_1292[1] + challenges2[1], tmp_1292[2] + challenges2[2]];
    signal tmp_2497[3] <== GLCMul()(tmp_2496, tmp_1293);
    signal tmp_1294[3] <== GLCMul()(evals[67], tmp_2493);
    signal tmp_1295[3] <== GLCMul()(evals[60], tmp_2497);
    signal tmp_2498[3] <== [tmp_1294[0] - tmp_1295[0] + p, tmp_1294[1] - tmp_1295[1] + p, tmp_1294[2] - tmp_1295[2] + p];
    signal tmp_1296[3] <== GLCMul()([0x19, 0, 0], tmp_2036);
    signal tmp_1297[3] <== GLCMul()([0x3d999c961b7c63b0, 0, 0], evals[2]);
    signal tmp_1298[3] <== [tmp_1296[0] + tmp_1297[0], tmp_1296[1] + tmp_1297[1], tmp_1296[2] + tmp_1297[2]];
    signal tmp_1299[3] <== GLCMul()([0x814e82efcd172529, 0, 0], evals[3]);
    signal tmp_1300[3] <== [tmp_1298[0] + tmp_1299[0], tmp_1298[1] + tmp_1299[1], tmp_1298[2] + tmp_1299[2]];
    signal tmp_1301[3] <== GLCMul()([0x2421e5d236704588, 0, 0], evals[10]);
    signal tmp_1302[3] <== [tmp_1300[0] + tmp_1301[0], tmp_1300[1] + tmp_1301[1], tmp_1300[2] + tmp_1301[2]];
    signal tmp_1303[3] <== GLCMul()([0x887af7d4dd482328, 0, 0], evals[11]);
    signal tmp_1304[3] <== [tmp_1302[0] + tmp_1303[0], tmp_1302[1] + tmp_1303[1], tmp_1302[2] + tmp_1303[2]];
    signal tmp_1305[3] <== GLCMul()([0xa5e9c291f6119b27, 0, 0], evals[12]);
    signal tmp_1306[3] <== [tmp_1304[0] + tmp_1305[0], tmp_1304[1] + tmp_1305[1], tmp_1304[2] + tmp_1305[2]];
    signal tmp_1307[3] <== GLCMul()([0xbdc52b2676a4b4aa, 0, 0], evals[13]);
    signal tmp_1308[3] <== [tmp_1306[0] + tmp_1307[0], tmp_1306[1] + tmp_1307[1], tmp_1306[2] + tmp_1307[2]];
    signal tmp_1309[3] <== GLCMul()([0x64832009d29bcf57, 0, 0], evals[14]);
    signal tmp_1310[3] <== [tmp_1308[0] + tmp_1309[0], tmp_1308[1] + tmp_1309[1], tmp_1308[2] + tmp_1309[2]];
    signal tmp_1311[3] <== GLCMul()([0x9c4155174a552cc, 0, 0], evals[19]);
    signal tmp_1312[3] <== [tmp_1310[0] + tmp_1311[0], tmp_1310[1] + tmp_1311[1], tmp_1310[2] + tmp_1311[2]];
    signal tmp_1313[3] <== GLCMul()([0x463f9ee03d290810, 0, 0], evals[21]);
    signal tmp_1314[3] <== [tmp_1312[0] + tmp_1313[0], tmp_1312[1] + tmp_1313[1], tmp_1312[2] + tmp_1313[2]];
    signal tmp_1315[3] <== GLCMul()([0xc810936e64982542, 0, 0], evals[22]);
    signal tmp_1316[3] <== [tmp_1314[0] + tmp_1315[0], tmp_1314[1] + tmp_1315[1], tmp_1314[2] + tmp_1315[2]];
    signal tmp_1317[3] <== GLCMul()([0x43b1c289f7bc3ac, 0, 0], evals[23]);
    signal tmp_2499[3] <== [tmp_1316[0] + tmp_1317[0], tmp_1316[1] + tmp_1317[1], tmp_1316[2] + tmp_1317[2]];
    signal tmp_1318[3] <== GLCMul()([0x19, 0, 0], tmp_2036);
    signal tmp_1319[3] <== GLCMul()([0x16b9774801ac44a0, 0, 0], evals[2]);
    signal tmp_1320[3] <== [tmp_1318[0] + tmp_1319[0], tmp_1318[1] + tmp_1319[1], tmp_1318[2] + tmp_1319[2]];
    signal tmp_1321[3] <== GLCMul()([0x3cb8411e786d3c8e, 0, 0], evals[3]);
    signal tmp_1322[3] <== [tmp_1320[0] + tmp_1321[0], tmp_1320[1] + tmp_1321[1], tmp_1320[2] + tmp_1321[2]];
    signal tmp_1323[3] <== GLCMul()([0xa86e9cf505072491, 0, 0], evals[10]);
    signal tmp_1324[3] <== [tmp_1322[0] + tmp_1323[0], tmp_1322[1] + tmp_1323[1], tmp_1322[2] + tmp_1323[2]];
    signal tmp_1325[3] <== GLCMul()([0x178928152e109ae, 0, 0], evals[11]);
    signal tmp_1326[3] <== [tmp_1324[0] + tmp_1325[0], tmp_1324[1] + tmp_1325[1], tmp_1324[2] + tmp_1325[2]];
    signal tmp_1327[3] <== GLCMul()([0x5317b905a6e1ab7b, 0, 0], evals[12]);
    signal tmp_1328[3] <== [tmp_1326[0] + tmp_1327[0], tmp_1326[1] + tmp_1327[1], tmp_1326[2] + tmp_1327[2]];
    signal tmp_1329[3] <== GLCMul()([0xda20b3be7f53d59f, 0, 0], evals[13]);
    signal tmp_1330[3] <== [tmp_1328[0] + tmp_1329[0], tmp_1328[1] + tmp_1329[1], tmp_1328[2] + tmp_1329[2]];
    signal tmp_1331[3] <== GLCMul()([0xcb97dedecebee9ad, 0, 0], evals[14]);
    signal tmp_1332[3] <== [tmp_1330[0] + tmp_1331[0], tmp_1330[1] + tmp_1331[1], tmp_1330[2] + tmp_1331[2]];
    signal tmp_1333[3] <== GLCMul()([0x4bd545218c59f58d, 0, 0], evals[19]);
    signal tmp_1334[3] <== [tmp_1332[0] + tmp_1333[0], tmp_1332[1] + tmp_1333[1], tmp_1332[2] + tmp_1333[2]];
    signal tmp_1335[3] <== GLCMul()([0x77dc8d856c05a44a, 0, 0], evals[21]);
    signal tmp_1336[3] <== [tmp_1334[0] + tmp_1335[0], tmp_1334[1] + tmp_1335[1], tmp_1334[2] + tmp_1335[2]];
    signal tmp_1337[3] <== GLCMul()([0x87948589e4f243fd, 0, 0], evals[22]);
    signal tmp_1338[3] <== [tmp_1336[0] + tmp_1337[0], tmp_1336[1] + tmp_1337[1], tmp_1336[2] + tmp_1337[2]];
    signal tmp_1339[3] <== GLCMul()([0x7e5217af969952c2, 0, 0], evals[23]);
    signal tmp_2500[3] <== [tmp_1338[0] + tmp_1339[0], tmp_1338[1] + tmp_1339[1], tmp_1338[2] + tmp_1339[2]];
    signal tmp_1340[3] <== [evals[2][0] - evals[12][0] + p, evals[2][1] - evals[12][1] + p, evals[2][2] - evals[12][2] + p];
    signal tmp_1341[3] <== GLCMul()(evals[19], tmp_1340);
    signal tmp_2501[3] <== [tmp_1341[0] + evals[12][0], tmp_1341[1] + evals[12][1], tmp_1341[2] + evals[12][2]];
    signal tmp_1342[3] <== [tmp_2501[0] - evals[2][0] + p, tmp_2501[1] - evals[2][1] + p, tmp_2501[2] - evals[2][2] + p];
    signal tmp_1343[3] <== GLCMul()(evals[24], tmp_1342);
    signal tmp_1344[3] <== [tmp_1343[0] + evals[2][0], tmp_1343[1] + evals[2][1], tmp_1343[2] + evals[2][2]];
    signal tmp_1345[3] <== [evals[26][0] + evals[24][0], evals[26][1] + evals[24][1], evals[26][2] + evals[24][2]];
    signal tmp_1346[3] <== GLCMul()(tmp_1345, [0x7746a55f43921ad7,0,0]);
    signal tmp_2502[3] <== [tmp_1344[0] + tmp_1346[0], tmp_1344[1] + tmp_1346[1], tmp_1344[2] + tmp_1346[2]];
    signal tmp_1347[3] <== GLCMul()([0x19, 0, 0], tmp_2040);
    signal tmp_1348[3] <== GLCMul()([0x673655aae8be5a8b, 0, 0], tmp_2105);
    signal tmp_1349[3] <== [tmp_1347[0] + tmp_1348[0], tmp_1347[1] + tmp_1348[1], tmp_1347[2] + tmp_1348[2]];
    signal tmp_1350[3] <== GLCMul()([0xd510fe714f39fa10, 0, 0], tmp_2115);
    signal tmp_1351[3] <== [tmp_1349[0] + tmp_1350[0], tmp_1349[1] + tmp_1350[1], tmp_1349[2] + tmp_1350[2]];
    signal tmp_1352[3] <== GLCMul()([0x2c68a099b51c9e73, 0, 0], tmp_2125);
    signal tmp_1353[3] <== [tmp_1351[0] + tmp_1352[0], tmp_1351[1] + tmp_1352[1], tmp_1351[2] + tmp_1352[2]];
    signal tmp_1354[3] <== GLCMul()([0xa667bfa9aa96999d, 0, 0], tmp_2135);
    signal tmp_1355[3] <== [tmp_1353[0] + tmp_1354[0], tmp_1353[1] + tmp_1354[1], tmp_1353[2] + tmp_1354[2]];
    signal tmp_1356[3] <== GLCMul()([0x4d67e72f063e2108, 0, 0], tmp_2145);
    signal tmp_1357[3] <== [tmp_1355[0] + tmp_1356[0], tmp_1355[1] + tmp_1356[1], tmp_1355[2] + tmp_1356[2]];
    signal tmp_1358[3] <== GLCMul()([0xf84dde3e6acda179, 0, 0], tmp_2155);
    signal tmp_1359[3] <== [tmp_1357[0] + tmp_1358[0], tmp_1357[1] + tmp_1358[1], tmp_1357[2] + tmp_1358[2]];
    signal tmp_1360[3] <== GLCMul()([0x40f9cc8c08f80981, 0, 0], tmp_2165);
    signal tmp_1361[3] <== [tmp_1359[0] + tmp_1360[0], tmp_1359[1] + tmp_1360[1], tmp_1359[2] + tmp_1360[2]];
    signal tmp_1362[3] <== GLCMul()([0x5ead032050097142, 0, 0], tmp_2175);
    signal tmp_1363[3] <== [tmp_1361[0] + tmp_1362[0], tmp_1361[1] + tmp_1362[1], tmp_1361[2] + tmp_1362[2]];
    signal tmp_1364[3] <== GLCMul()([0x6591b02092d671bb, 0, 0], tmp_2185);
    signal tmp_1365[3] <== [tmp_1363[0] + tmp_1364[0], tmp_1363[1] + tmp_1364[1], tmp_1363[2] + tmp_1364[2]];
    signal tmp_1366[3] <== GLCMul()([0xe18c71963dd1b7, 0, 0], tmp_2195);
    signal tmp_1367[3] <== [tmp_1365[0] + tmp_1366[0], tmp_1365[1] + tmp_1366[1], tmp_1365[2] + tmp_1366[2]];
    signal tmp_1368[3] <== GLCMul()([0x8a21bcd24a14218a, 0, 0], tmp_2205);
    signal tmp_2503[3] <== [tmp_1367[0] + tmp_1368[0], tmp_1367[1] + tmp_1368[1], tmp_1367[2] + tmp_1368[2]];
    signal tmp_1369[3] <== GLCMul()([0x19, 0, 0], tmp_2040);
    signal tmp_1370[3] <== GLCMul()([0xbc58987d06a84e4d, 0, 0], tmp_2239);
    signal tmp_1371[3] <== [tmp_1369[0] + tmp_1370[0], tmp_1369[1] + tmp_1370[1], tmp_1369[2] + tmp_1370[2]];
    signal tmp_1372[3] <== GLCMul()([0xb5d420244c9cae3, 0, 0], tmp_2249);
    signal tmp_1373[3] <== [tmp_1371[0] + tmp_1372[0], tmp_1371[1] + tmp_1372[1], tmp_1371[2] + tmp_1372[2]];
    signal tmp_1374[3] <== GLCMul()([0xa3c4711b938c02c0, 0, 0], tmp_2259);
    signal tmp_1375[3] <== [tmp_1373[0] + tmp_1374[0], tmp_1373[1] + tmp_1374[1], tmp_1373[2] + tmp_1374[2]];
    signal tmp_1376[3] <== GLCMul()([0x3aace640a3e03990, 0, 0], tmp_2269);
    signal tmp_1377[3] <== [tmp_1375[0] + tmp_1376[0], tmp_1375[1] + tmp_1376[1], tmp_1375[2] + tmp_1376[2]];
    signal tmp_1378[3] <== GLCMul()([0x865a0f3249aacd8a, 0, 0], tmp_2279);
    signal tmp_1379[3] <== [tmp_1377[0] + tmp_1378[0], tmp_1377[1] + tmp_1378[1], tmp_1377[2] + tmp_1378[2]];
    signal tmp_1380[3] <== GLCMul()([0x8d00b2a7dbed06c7, 0, 0], tmp_2289);
    signal tmp_1381[3] <== [tmp_1379[0] + tmp_1380[0], tmp_1379[1] + tmp_1380[1], tmp_1379[2] + tmp_1380[2]];
    signal tmp_1382[3] <== GLCMul()([0x6eacb905beb7e2f8, 0, 0], tmp_2299);
    signal tmp_1383[3] <== [tmp_1381[0] + tmp_1382[0], tmp_1381[1] + tmp_1382[1], tmp_1381[2] + tmp_1382[2]];
    signal tmp_1384[3] <== GLCMul()([0x45322b216ec3ec7, 0, 0], tmp_2309);
    signal tmp_1385[3] <== [tmp_1383[0] + tmp_1384[0], tmp_1383[1] + tmp_1384[1], tmp_1383[2] + tmp_1384[2]];
    signal tmp_1386[3] <== GLCMul()([0xeb9de00d594828e6, 0, 0], tmp_2319);
    signal tmp_1387[3] <== [tmp_1385[0] + tmp_1386[0], tmp_1385[1] + tmp_1386[1], tmp_1385[2] + tmp_1386[2]];
    signal tmp_1388[3] <== GLCMul()([0x88c5f20df9e5c26, 0, 0], tmp_2329);
    signal tmp_1389[3] <== [tmp_1387[0] + tmp_1388[0], tmp_1387[1] + tmp_1388[1], tmp_1387[2] + tmp_1388[2]];
    signal tmp_1390[3] <== GLCMul()([0xf555f4112b19781f, 0, 0], tmp_2339);
    signal tmp_2504[3] <== [tmp_1389[0] + tmp_1390[0], tmp_1389[1] + tmp_1390[1], tmp_1389[2] + tmp_1390[2]];
    signal tmp_1391[3] <== [evals[3][0] - evals[13][0] + p, evals[3][1] - evals[13][1] + p, evals[3][2] - evals[13][2] + p];
    signal tmp_1392[3] <== GLCMul()(evals[19], tmp_1391);
    signal tmp_2505[3] <== [tmp_1392[0] + evals[13][0], tmp_1392[1] + evals[13][1], tmp_1392[2] + evals[13][2]];
    signal tmp_1393[3] <== [tmp_2505[0] - evals[3][0] + p, tmp_2505[1] - evals[3][1] + p, tmp_2505[2] - evals[3][2] + p];
    signal tmp_1394[3] <== GLCMul()(evals[24], tmp_1393);
    signal tmp_1395[3] <== [tmp_1394[0] + evals[3][0], tmp_1394[1] + evals[3][1], tmp_1394[2] + evals[3][2]];
    signal tmp_1396[3] <== [evals[26][0] + evals[24][0], evals[26][1] + evals[24][1], evals[26][2] + evals[24][2]];
    signal tmp_1397[3] <== GLCMul()(tmp_1396, [0xb2fb0d31cee799b4,0,0]);
    signal tmp_2506[3] <== [tmp_1395[0] + tmp_1397[0], tmp_1395[1] + tmp_1397[1], tmp_1395[2] + tmp_1397[2]];
    signal tmp_1398[3] <== GLCMul()([0x19, 0, 0], tmp_2044);
    signal tmp_1399[3] <== GLCMul()([0x202800f4addbdc87, 0, 0], tmp_2106);
    signal tmp_1400[3] <== [tmp_1398[0] + tmp_1399[0], tmp_1398[1] + tmp_1399[1], tmp_1398[2] + tmp_1399[2]];
    signal tmp_1401[3] <== GLCMul()([0xe4b5bdb1cc3504ff, 0, 0], tmp_2116);
    signal tmp_1402[3] <== [tmp_1400[0] + tmp_1401[0], tmp_1400[1] + tmp_1401[1], tmp_1400[2] + tmp_1401[2]];
    signal tmp_1403[3] <== GLCMul()([0xbe32b32a825596e7, 0, 0], tmp_2126);
    signal tmp_1404[3] <== [tmp_1402[0] + tmp_1403[0], tmp_1402[1] + tmp_1403[1], tmp_1402[2] + tmp_1403[2]];
    signal tmp_1405[3] <== GLCMul()([0x8e0f68c5dc223b9a, 0, 0], tmp_2136);
    signal tmp_1406[3] <== [tmp_1404[0] + tmp_1405[0], tmp_1404[1] + tmp_1405[1], tmp_1404[2] + tmp_1405[2]];
    signal tmp_1407[3] <== GLCMul()([0x58022d9e1c256ce3, 0, 0], tmp_2146);
    signal tmp_1408[3] <== [tmp_1406[0] + tmp_1407[0], tmp_1406[1] + tmp_1407[1], tmp_1406[2] + tmp_1407[2]];
    signal tmp_1409[3] <== GLCMul()([0x584d29227aa073ac, 0, 0], tmp_2156);
    signal tmp_1410[3] <== [tmp_1408[0] + tmp_1409[0], tmp_1408[1] + tmp_1409[1], tmp_1408[2] + tmp_1409[2]];
    signal tmp_1411[3] <== GLCMul()([0x8b9352ad04bef9e7, 0, 0], tmp_2166);
    signal tmp_1412[3] <== [tmp_1410[0] + tmp_1411[0], tmp_1410[1] + tmp_1411[1], tmp_1410[2] + tmp_1411[2]];
    signal tmp_1413[3] <== GLCMul()([0xaead42a3f445ecbf, 0, 0], tmp_2176);
    signal tmp_1414[3] <== [tmp_1412[0] + tmp_1413[0], tmp_1412[1] + tmp_1413[1], tmp_1412[2] + tmp_1413[2]];
    signal tmp_1415[3] <== GLCMul()([0x3c667a1d833a3cca, 0, 0], tmp_2186);
    signal tmp_1416[3] <== [tmp_1414[0] + tmp_1415[0], tmp_1414[1] + tmp_1415[1], tmp_1414[2] + tmp_1415[2]];
    signal tmp_1417[3] <== GLCMul()([0xda6f61838efa1ffe, 0, 0], tmp_2196);
    signal tmp_1418[3] <== [tmp_1416[0] + tmp_1417[0], tmp_1416[1] + tmp_1417[1], tmp_1416[2] + tmp_1417[2]];
    signal tmp_1419[3] <== GLCMul()([0xe8f749470bd7c446, 0, 0], tmp_2206);
    signal tmp_2507[3] <== [tmp_1418[0] + tmp_1419[0], tmp_1418[1] + tmp_1419[1], tmp_1418[2] + tmp_1419[2]];
    signal tmp_1420[3] <== GLCMul()([0x19, 0, 0], tmp_2044);
    signal tmp_1421[3] <== GLCMul()([0xa8cedbff1813d3a7, 0, 0], tmp_2240);
    signal tmp_1422[3] <== [tmp_1420[0] + tmp_1421[0], tmp_1420[1] + tmp_1421[1], tmp_1420[2] + tmp_1421[2]];
    signal tmp_1423[3] <== GLCMul()([0x50dcaee0fd27d164, 0, 0], tmp_2250);
    signal tmp_1424[3] <== [tmp_1422[0] + tmp_1423[0], tmp_1422[1] + tmp_1423[1], tmp_1422[2] + tmp_1423[2]];
    signal tmp_1425[3] <== GLCMul()([0xf1cb02417e23bd82, 0, 0], tmp_2260);
    signal tmp_1426[3] <== [tmp_1424[0] + tmp_1425[0], tmp_1424[1] + tmp_1425[1], tmp_1424[2] + tmp_1425[2]];
    signal tmp_1427[3] <== GLCMul()([0xfaf322786e2abe8b, 0, 0], tmp_2270);
    signal tmp_1428[3] <== [tmp_1426[0] + tmp_1427[0], tmp_1426[1] + tmp_1427[1], tmp_1426[2] + tmp_1427[2]];
    signal tmp_1429[3] <== GLCMul()([0x937a4315beb5d9b6, 0, 0], tmp_2280);
    signal tmp_1430[3] <== [tmp_1428[0] + tmp_1429[0], tmp_1428[1] + tmp_1429[1], tmp_1428[2] + tmp_1429[2]];
    signal tmp_1431[3] <== GLCMul()([0x1b18992921a11d85, 0, 0], tmp_2290);
    signal tmp_1432[3] <== [tmp_1430[0] + tmp_1431[0], tmp_1430[1] + tmp_1431[1], tmp_1430[2] + tmp_1431[2]];
    signal tmp_1433[3] <== GLCMul()([0x7d66c4368b3c497b, 0, 0], tmp_2300);
    signal tmp_1434[3] <== [tmp_1432[0] + tmp_1433[0], tmp_1432[1] + tmp_1433[1], tmp_1432[2] + tmp_1433[2]];
    signal tmp_1435[3] <== GLCMul()([0xe7946317a6b4e99, 0, 0], tmp_2310);
    signal tmp_1436[3] <== [tmp_1434[0] + tmp_1435[0], tmp_1434[1] + tmp_1435[1], tmp_1434[2] + tmp_1435[2]];
    signal tmp_1437[3] <== GLCMul()([0xbe4430134182978b, 0, 0], tmp_2320);
    signal tmp_1438[3] <== [tmp_1436[0] + tmp_1437[0], tmp_1436[1] + tmp_1437[1], tmp_1436[2] + tmp_1437[2]];
    signal tmp_1439[3] <== GLCMul()([0x3771e82493ab262d, 0, 0], tmp_2330);
    signal tmp_1440[3] <== [tmp_1438[0] + tmp_1439[0], tmp_1438[1] + tmp_1439[1], tmp_1438[2] + tmp_1439[2]];
    signal tmp_1441[3] <== GLCMul()([0xa671690d8095ce82, 0, 0], tmp_2340);
    signal tmp_2508[3] <== [tmp_1440[0] + tmp_1441[0], tmp_1440[1] + tmp_1441[1], tmp_1440[2] + tmp_1441[2]];
    signal tmp_1442[3] <== [evals[10][0] - evals[14][0] + p, evals[10][1] - evals[14][1] + p, evals[10][2] - evals[14][2] + p];
    signal tmp_1443[3] <== GLCMul()(evals[19], tmp_1442);
    signal tmp_2509[3] <== [tmp_1443[0] + evals[14][0], tmp_1443[1] + evals[14][1], tmp_1443[2] + evals[14][2]];
    signal tmp_1444[3] <== [tmp_2509[0] - evals[10][0] + p, tmp_2509[1] - evals[10][1] + p, tmp_2509[2] - evals[10][2] + p];
    signal tmp_1445[3] <== GLCMul()(evals[24], tmp_1444);
    signal tmp_1446[3] <== [tmp_1445[0] + evals[10][0], tmp_1445[1] + evals[10][1], tmp_1445[2] + evals[10][2]];
    signal tmp_1447[3] <== [evals[26][0] + evals[24][0], evals[26][1] + evals[24][1], evals[26][2] + evals[24][2]];
    signal tmp_1448[3] <== GLCMul()(tmp_1447, [0xf6760a4803427d7,0,0]);
    signal tmp_2510[3] <== [tmp_1446[0] + tmp_1448[0], tmp_1446[1] + tmp_1448[1], tmp_1446[2] + tmp_1448[2]];
    signal tmp_1449[3] <== GLCMul()([0x19, 0, 0], tmp_2048);
    signal tmp_1450[3] <== GLCMul()([0xc5b85bab9e5b3869, 0, 0], tmp_2107);
    signal tmp_1451[3] <== [tmp_1449[0] + tmp_1450[0], tmp_1449[1] + tmp_1450[1], tmp_1449[2] + tmp_1450[2]];
    signal tmp_1452[3] <== GLCMul()([0x45245258aec51cf7, 0, 0], tmp_2117);
    signal tmp_1453[3] <== [tmp_1451[0] + tmp_1452[0], tmp_1451[1] + tmp_1452[1], tmp_1451[2] + tmp_1452[2]];
    signal tmp_1454[3] <== GLCMul()([0x16e6b8e68b931830, 0, 0], tmp_2127);
    signal tmp_1455[3] <== [tmp_1453[0] + tmp_1454[0], tmp_1453[1] + tmp_1454[1], tmp_1453[2] + tmp_1454[2]];
    signal tmp_1456[3] <== GLCMul()([0xe2ae0f051418112c, 0, 0], tmp_2137);
    signal tmp_1457[3] <== [tmp_1455[0] + tmp_1456[0], tmp_1455[1] + tmp_1456[1], tmp_1455[2] + tmp_1456[2]];
    signal tmp_1458[3] <== GLCMul()([0x470e26a0093a65b, 0, 0], tmp_2147);
    signal tmp_1459[3] <== [tmp_1457[0] + tmp_1458[0], tmp_1457[1] + tmp_1458[1], tmp_1457[2] + tmp_1458[2]];
    signal tmp_1460[3] <== GLCMul()([0x6bef71973a8146ed, 0, 0], tmp_2157);
    signal tmp_1461[3] <== [tmp_1459[0] + tmp_1460[0], tmp_1459[1] + tmp_1460[1], tmp_1459[2] + tmp_1460[2]];
    signal tmp_1462[3] <== GLCMul()([0x119265be51812daf, 0, 0], tmp_2167);
    signal tmp_1463[3] <== [tmp_1461[0] + tmp_1462[0], tmp_1461[1] + tmp_1462[1], tmp_1461[2] + tmp_1462[2]];
    signal tmp_1464[3] <== GLCMul()([0xb0be7356254bea2e, 0, 0], tmp_2177);
    signal tmp_1465[3] <== [tmp_1463[0] + tmp_1464[0], tmp_1463[1] + tmp_1464[1], tmp_1463[2] + tmp_1464[2]];
    signal tmp_1466[3] <== GLCMul()([0x8584defff7589bd7, 0, 0], tmp_2187);
    signal tmp_1467[3] <== [tmp_1465[0] + tmp_1466[0], tmp_1465[1] + tmp_1466[1], tmp_1465[2] + tmp_1466[2]];
    signal tmp_1468[3] <== GLCMul()([0x3c5fe4aeb1fb52ba, 0, 0], tmp_2197);
    signal tmp_1469[3] <== [tmp_1467[0] + tmp_1468[0], tmp_1467[1] + tmp_1468[1], tmp_1467[2] + tmp_1468[2]];
    signal tmp_1470[3] <== GLCMul()([0x9e7cd88acf543a5e, 0, 0], tmp_2207);
    signal tmp_2511[3] <== [tmp_1469[0] + tmp_1470[0], tmp_1469[1] + tmp_1470[1], tmp_1469[2] + tmp_1470[2]];
    signal tmp_1471[3] <== GLCMul()([0x19, 0, 0], tmp_2048);
    signal tmp_1472[3] <== GLCMul()([0xb035585f6e929d9d, 0, 0], tmp_2241);
    signal tmp_1473[3] <== [tmp_1471[0] + tmp_1472[0], tmp_1471[1] + tmp_1472[1], tmp_1471[2] + tmp_1472[2]];
    signal tmp_1474[3] <== GLCMul()([0xba1579c7e219b954, 0, 0], tmp_2251);
    signal tmp_1475[3] <== [tmp_1473[0] + tmp_1474[0], tmp_1473[1] + tmp_1474[1], tmp_1473[2] + tmp_1474[2]];
    signal tmp_1476[3] <== GLCMul()([0xcb201cf846db4ba3, 0, 0], tmp_2261);
    signal tmp_1477[3] <== [tmp_1475[0] + tmp_1476[0], tmp_1475[1] + tmp_1476[1], tmp_1475[2] + tmp_1476[2]];
    signal tmp_1478[3] <== GLCMul()([0x287bf9177372cf45, 0, 0], tmp_2271);
    signal tmp_1479[3] <== [tmp_1477[0] + tmp_1478[0], tmp_1477[1] + tmp_1478[1], tmp_1477[2] + tmp_1478[2]];
    signal tmp_1480[3] <== GLCMul()([0xa350e4f61147d0a6, 0, 0], tmp_2281);
    signal tmp_1481[3] <== [tmp_1479[0] + tmp_1480[0], tmp_1479[1] + tmp_1480[1], tmp_1479[2] + tmp_1480[2]];
    signal tmp_1482[3] <== GLCMul()([0xd5d0ecfb50bcff99, 0, 0], tmp_2291);
    signal tmp_1483[3] <== [tmp_1481[0] + tmp_1482[0], tmp_1481[1] + tmp_1482[1], tmp_1481[2] + tmp_1482[2]];
    signal tmp_1484[3] <== GLCMul()([0x2e166aa6c776ed21, 0, 0], tmp_2301);
    signal tmp_1485[3] <== [tmp_1483[0] + tmp_1484[0], tmp_1483[1] + tmp_1484[1], tmp_1483[2] + tmp_1484[2]];
    signal tmp_1486[3] <== GLCMul()([0xe1e66c991990e282, 0, 0], tmp_2311);
    signal tmp_1487[3] <== [tmp_1485[0] + tmp_1486[0], tmp_1485[1] + tmp_1486[1], tmp_1485[2] + tmp_1486[2]];
    signal tmp_1488[3] <== GLCMul()([0x662b329b01e7bb38, 0, 0], tmp_2321);
    signal tmp_1489[3] <== [tmp_1487[0] + tmp_1488[0], tmp_1487[1] + tmp_1488[1], tmp_1487[2] + tmp_1488[2]];
    signal tmp_1490[3] <== GLCMul()([0x8aa674b36144d9a9, 0, 0], tmp_2331);
    signal tmp_1491[3] <== [tmp_1489[0] + tmp_1490[0], tmp_1489[1] + tmp_1490[1], tmp_1489[2] + tmp_1490[2]];
    signal tmp_1492[3] <== GLCMul()([0xcbabf78f97f95e65, 0, 0], tmp_2341);
    signal tmp_2512[3] <== [tmp_1491[0] + tmp_1492[0], tmp_1491[1] + tmp_1492[1], tmp_1491[2] + tmp_1492[2]];
    signal tmp_1493[3] <== [evals[11][0] - evals[0][0] + p, evals[11][1] - evals[0][1] + p, evals[11][2] - evals[0][2] + p];
    signal tmp_1494[3] <== GLCMul()(evals[19], tmp_1493);
    signal tmp_2513[3] <== [tmp_1494[0] + evals[0][0], tmp_1494[1] + evals[0][1], tmp_1494[2] + evals[0][2]];
    signal tmp_1495[3] <== [tmp_2513[0] - evals[11][0] + p, tmp_2513[1] - evals[11][1] + p, tmp_2513[2] - evals[11][2] + p];
    signal tmp_1496[3] <== GLCMul()(evals[24], tmp_1495);
    signal tmp_1497[3] <== [tmp_1496[0] + evals[11][0], tmp_1496[1] + evals[11][1], tmp_1496[2] + evals[11][2]];
    signal tmp_1498[3] <== [evals[26][0] + evals[24][0], evals[26][1] + evals[24][1], evals[26][2] + evals[24][2]];
    signal tmp_1499[3] <== GLCMul()(tmp_1498, [0xe10d666650f4e012,0,0]);
    signal tmp_2514[3] <== [tmp_1497[0] + tmp_1499[0], tmp_1497[1] + tmp_1499[1], tmp_1497[2] + tmp_1499[2]];
    signal tmp_1500[3] <== GLCMul()([0x19, 0, 0], tmp_2052);
    signal tmp_1501[3] <== GLCMul()([0x179be4bba87f0a8c, 0, 0], tmp_2108);
    signal tmp_1502[3] <== [tmp_1500[0] + tmp_1501[0], tmp_1500[1] + tmp_1501[1], tmp_1500[2] + tmp_1501[2]];
    signal tmp_1503[3] <== GLCMul()([0xacf63d95d8887355, 0, 0], tmp_2118);
    signal tmp_1504[3] <== [tmp_1502[0] + tmp_1503[0], tmp_1502[1] + tmp_1503[1], tmp_1502[2] + tmp_1503[2]];
    signal tmp_1505[3] <== GLCMul()([0x6696670196b0074f, 0, 0], tmp_2128);
    signal tmp_1506[3] <== [tmp_1504[0] + tmp_1505[0], tmp_1504[1] + tmp_1505[1], tmp_1504[2] + tmp_1505[2]];
    signal tmp_1507[3] <== GLCMul()([0xd99ddf1fe75085f9, 0, 0], tmp_2138);
    signal tmp_1508[3] <== [tmp_1506[0] + tmp_1507[0], tmp_1506[1] + tmp_1507[1], tmp_1506[2] + tmp_1507[2]];
    signal tmp_1509[3] <== GLCMul()([0xc2597881fef0283b, 0, 0], tmp_2148);
    signal tmp_1510[3] <== [tmp_1508[0] + tmp_1509[0], tmp_1508[1] + tmp_1509[1], tmp_1508[2] + tmp_1509[2]];
    signal tmp_1511[3] <== GLCMul()([0xcf48395ee6c54f14, 0, 0], tmp_2158);
    signal tmp_1512[3] <== [tmp_1510[0] + tmp_1511[0], tmp_1510[1] + tmp_1511[1], tmp_1510[2] + tmp_1511[2]];
    signal tmp_1513[3] <== GLCMul()([0x15226a8e4cd8d3b6, 0, 0], tmp_2168);
    signal tmp_1514[3] <== [tmp_1512[0] + tmp_1513[0], tmp_1512[1] + tmp_1513[1], tmp_1512[2] + tmp_1513[2]];
    signal tmp_1515[3] <== GLCMul()([0xc053297389af5d3b, 0, 0], tmp_2178);
    signal tmp_1516[3] <== [tmp_1514[0] + tmp_1515[0], tmp_1514[1] + tmp_1515[1], tmp_1514[2] + tmp_1515[2]];
    signal tmp_1517[3] <== GLCMul()([0x2c08893f0d1580e2, 0, 0], tmp_2188);
    signal tmp_1518[3] <== [tmp_1516[0] + tmp_1517[0], tmp_1516[1] + tmp_1517[1], tmp_1516[2] + tmp_1517[2]];
    signal tmp_1519[3] <== GLCMul()([0xed3cbcff6fcc5ba, 0, 0], tmp_2198);
    signal tmp_1520[3] <== [tmp_1518[0] + tmp_1519[0], tmp_1518[1] + tmp_1519[1], tmp_1518[2] + tmp_1519[2]];
    signal tmp_1521[3] <== GLCMul()([0xc82f510ecf81f6d0, 0, 0], tmp_2208);
    signal tmp_2515[3] <== [tmp_1520[0] + tmp_1521[0], tmp_1520[1] + tmp_1521[1], tmp_1520[2] + tmp_1521[2]];
    signal tmp_1522[3] <== GLCMul()([0x19, 0, 0], tmp_2052);
    signal tmp_1523[3] <== GLCMul()([0xeec24b15a06b53fe, 0, 0], tmp_2242);
    signal tmp_1524[3] <== [tmp_1522[0] + tmp_1523[0], tmp_1522[1] + tmp_1523[1], tmp_1522[2] + tmp_1523[2]];
    signal tmp_1525[3] <== GLCMul()([0xc8a7aa07c5633533, 0, 0], tmp_2252);
    signal tmp_1526[3] <== [tmp_1524[0] + tmp_1525[0], tmp_1524[1] + tmp_1525[1], tmp_1524[2] + tmp_1525[2]];
    signal tmp_1527[3] <== GLCMul()([0xefe9c6fa4311ad51, 0, 0], tmp_2262);
    signal tmp_1528[3] <== [tmp_1526[0] + tmp_1527[0], tmp_1526[1] + tmp_1527[1], tmp_1526[2] + tmp_1527[2]];
    signal tmp_1529[3] <== GLCMul()([0xb9173f13977109a1, 0, 0], tmp_2272);
    signal tmp_1530[3] <== [tmp_1528[0] + tmp_1529[0], tmp_1528[1] + tmp_1529[1], tmp_1528[2] + tmp_1529[2]];
    signal tmp_1531[3] <== GLCMul()([0x69ce43c9cc94aedc, 0, 0], tmp_2282);
    signal tmp_1532[3] <== [tmp_1530[0] + tmp_1531[0], tmp_1530[1] + tmp_1531[1], tmp_1530[2] + tmp_1531[2]];
    signal tmp_1533[3] <== GLCMul()([0xecf623c9cd118815, 0, 0], tmp_2292);
    signal tmp_1534[3] <== [tmp_1532[0] + tmp_1533[0], tmp_1532[1] + tmp_1533[1], tmp_1532[2] + tmp_1533[2]];
    signal tmp_1535[3] <== GLCMul()([0x28625def198c33c7, 0, 0], tmp_2302);
    signal tmp_1536[3] <== [tmp_1534[0] + tmp_1535[0], tmp_1534[1] + tmp_1535[1], tmp_1534[2] + tmp_1535[2]];
    signal tmp_1537[3] <== GLCMul()([0xccfc5f7de5c3636a, 0, 0], tmp_2312);
    signal tmp_1538[3] <== [tmp_1536[0] + tmp_1537[0], tmp_1536[1] + tmp_1537[1], tmp_1536[2] + tmp_1537[2]];
    signal tmp_1539[3] <== GLCMul()([0xf5e6c40f1621c299, 0, 0], tmp_2322);
    signal tmp_1540[3] <== [tmp_1538[0] + tmp_1539[0], tmp_1538[1] + tmp_1539[1], tmp_1538[2] + tmp_1539[2]];
    signal tmp_1541[3] <== GLCMul()([0xcec0e58c34cb64b1, 0, 0], tmp_2332);
    signal tmp_1542[3] <== [tmp_1540[0] + tmp_1541[0], tmp_1540[1] + tmp_1541[1], tmp_1540[2] + tmp_1541[2]];
    signal tmp_1543[3] <== GLCMul()([0xa868ea113387939f, 0, 0], tmp_2342);
    signal tmp_2516[3] <== [tmp_1542[0] + tmp_1543[0], tmp_1542[1] + tmp_1543[1], tmp_1542[2] + tmp_1543[2]];
    signal tmp_1544[3] <== [evals[12][0] - evals[2][0] + p, evals[12][1] - evals[2][1] + p, evals[12][2] - evals[2][2] + p];
    signal tmp_1545[3] <== GLCMul()(evals[19], tmp_1544);
    signal tmp_2517[3] <== [tmp_1545[0] + evals[2][0], tmp_1545[1] + evals[2][1], tmp_1545[2] + evals[2][2]];
    signal tmp_1546[3] <== [tmp_2517[0] - evals[12][0] + p, tmp_2517[1] - evals[12][1] + p, tmp_2517[2] - evals[12][2] + p];
    signal tmp_1547[3] <== GLCMul()(evals[24], tmp_1546);
    signal tmp_1548[3] <== [tmp_1547[0] + evals[12][0], tmp_1547[1] + evals[12][1], tmp_1547[2] + evals[12][2]];
    signal tmp_1549[3] <== [evals[26][0] + evals[24][0], evals[26][1] + evals[24][1], evals[26][2] + evals[24][2]];
    signal tmp_1550[3] <== GLCMul()(tmp_1549, [0x8cae14cb07d09bf1,0,0]);
    signal tmp_2518[3] <== [tmp_1548[0] + tmp_1550[0], tmp_1548[1] + tmp_1550[1], tmp_1548[2] + tmp_1550[2]];
    signal tmp_1551[3] <== GLCMul()([0x19, 0, 0], tmp_2056);
    signal tmp_1552[3] <== GLCMul()([0x94b06183acb715cc, 0, 0], tmp_2109);
    signal tmp_1553[3] <== [tmp_1551[0] + tmp_1552[0], tmp_1551[1] + tmp_1552[1], tmp_1551[2] + tmp_1552[2]];
    signal tmp_1554[3] <== GLCMul()([0x500392ed0d431137, 0, 0], tmp_2119);
    signal tmp_1555[3] <== [tmp_1553[0] + tmp_1554[0], tmp_1553[1] + tmp_1554[1], tmp_1553[2] + tmp_1554[2]];
    signal tmp_1556[3] <== GLCMul()([0x861cc95ad5c86323, 0, 0], tmp_2129);
    signal tmp_1557[3] <== [tmp_1555[0] + tmp_1556[0], tmp_1555[1] + tmp_1556[1], tmp_1555[2] + tmp_1556[2]];
    signal tmp_1558[3] <== GLCMul()([0x5830a443f86c4ac, 0, 0], tmp_2139);
    signal tmp_1559[3] <== [tmp_1557[0] + tmp_1558[0], tmp_1557[1] + tmp_1558[1], tmp_1557[2] + tmp_1558[2]];
    signal tmp_1560[3] <== GLCMul()([0x3b68225874a20a7c, 0, 0], tmp_2149);
    signal tmp_1561[3] <== [tmp_1559[0] + tmp_1560[0], tmp_1559[1] + tmp_1560[1], tmp_1559[2] + tmp_1560[2]];
    signal tmp_1562[3] <== GLCMul()([0x10b3309838e236fb, 0, 0], tmp_2159);
    signal tmp_1563[3] <== [tmp_1561[0] + tmp_1562[0], tmp_1561[1] + tmp_1562[1], tmp_1561[2] + tmp_1562[2]];
    signal tmp_1564[3] <== GLCMul()([0x9b77fc8bcd559e2c, 0, 0], tmp_2169);
    signal tmp_1565[3] <== [tmp_1563[0] + tmp_1564[0], tmp_1563[1] + tmp_1564[1], tmp_1563[2] + tmp_1564[2]];
    signal tmp_1566[3] <== GLCMul()([0xbdecf5e0cb9cb213, 0, 0], tmp_2179);
    signal tmp_1567[3] <== [tmp_1565[0] + tmp_1566[0], tmp_1565[1] + tmp_1566[1], tmp_1565[2] + tmp_1566[2]];
    signal tmp_1568[3] <== GLCMul()([0x30276f1221ace5fa, 0, 0], tmp_2189);
    signal tmp_1569[3] <== [tmp_1567[0] + tmp_1568[0], tmp_1567[1] + tmp_1568[1], tmp_1567[2] + tmp_1568[2]];
    signal tmp_1570[3] <== GLCMul()([0x7935dd342764a144, 0, 0], tmp_2199);
    signal tmp_1571[3] <== [tmp_1569[0] + tmp_1570[0], tmp_1569[1] + tmp_1570[1], tmp_1569[2] + tmp_1570[2]];
    signal tmp_1572[3] <== GLCMul()([0xeac6db520bb03708, 0, 0], tmp_2209);
    signal tmp_2519[3] <== [tmp_1571[0] + tmp_1572[0], tmp_1571[1] + tmp_1572[1], tmp_1571[2] + tmp_1572[2]];
    signal tmp_1573[3] <== GLCMul()([0x19, 0, 0], tmp_2056);
    signal tmp_1574[3] <== GLCMul()([0xd8dddbdc5ce4ef45, 0, 0], tmp_2243);
    signal tmp_1575[3] <== [tmp_1573[0] + tmp_1574[0], tmp_1573[1] + tmp_1574[1], tmp_1573[2] + tmp_1574[2]];
    signal tmp_1576[3] <== GLCMul()([0xacfc51de8131458c, 0, 0], tmp_2253);
    signal tmp_1577[3] <== [tmp_1575[0] + tmp_1576[0], tmp_1575[1] + tmp_1576[1], tmp_1575[2] + tmp_1576[2]];
    signal tmp_1578[3] <== GLCMul()([0x146bb3c0fe499ac0, 0, 0], tmp_2263);
    signal tmp_1579[3] <== [tmp_1577[0] + tmp_1578[0], tmp_1577[1] + tmp_1578[1], tmp_1577[2] + tmp_1578[2]];
    signal tmp_1580[3] <== GLCMul()([0x9e65309f15943903, 0, 0], tmp_2273);
    signal tmp_1581[3] <== [tmp_1579[0] + tmp_1580[0], tmp_1579[1] + tmp_1580[1], tmp_1579[2] + tmp_1580[2]];
    signal tmp_1582[3] <== GLCMul()([0x80d0ad980773aa70, 0, 0], tmp_2283);
    signal tmp_1583[3] <== [tmp_1581[0] + tmp_1582[0], tmp_1581[1] + tmp_1582[1], tmp_1581[2] + tmp_1582[2]];
    signal tmp_1584[3] <== GLCMul()([0xf97817d4ddbf0607, 0, 0], tmp_2293);
    signal tmp_1585[3] <== [tmp_1583[0] + tmp_1584[0], tmp_1583[1] + tmp_1584[1], tmp_1583[2] + tmp_1584[2]];
    signal tmp_1586[3] <== GLCMul()([0xe4626620a75ba276, 0, 0], tmp_2303);
    signal tmp_1587[3] <== [tmp_1585[0] + tmp_1586[0], tmp_1585[1] + tmp_1586[1], tmp_1585[2] + tmp_1586[2]];
    signal tmp_1588[3] <== GLCMul()([0xdfdc7fd6fc74f66, 0, 0], tmp_2313);
    signal tmp_1589[3] <== [tmp_1587[0] + tmp_1588[0], tmp_1587[1] + tmp_1588[1], tmp_1587[2] + tmp_1588[2]];
    signal tmp_1590[3] <== GLCMul()([0xf464864ad6f2bb93, 0, 0], tmp_2323);
    signal tmp_1591[3] <== [tmp_1589[0] + tmp_1590[0], tmp_1589[1] + tmp_1590[1], tmp_1589[2] + tmp_1590[2]];
    signal tmp_1592[3] <== GLCMul()([0x2d55e52a5d44414, 0, 0], tmp_2333);
    signal tmp_1593[3] <== [tmp_1591[0] + tmp_1592[0], tmp_1591[1] + tmp_1592[1], tmp_1591[2] + tmp_1592[2]];
    signal tmp_1594[3] <== GLCMul()([0xdd8de62487c40925, 0, 0], tmp_2343);
    signal tmp_2520[3] <== [tmp_1593[0] + tmp_1594[0], tmp_1593[1] + tmp_1594[1], tmp_1593[2] + tmp_1594[2]];
    signal tmp_1595[3] <== [evals[13][0] - evals[3][0] + p, evals[13][1] - evals[3][1] + p, evals[13][2] - evals[3][2] + p];
    signal tmp_1596[3] <== GLCMul()(evals[19], tmp_1595);
    signal tmp_2521[3] <== [tmp_1596[0] + evals[3][0], tmp_1596[1] + evals[3][1], tmp_1596[2] + evals[3][2]];
    signal tmp_1597[3] <== [tmp_2521[0] - evals[13][0] + p, tmp_2521[1] - evals[13][1] + p, tmp_2521[2] - evals[13][2] + p];
    signal tmp_1598[3] <== GLCMul()(evals[24], tmp_1597);
    signal tmp_1599[3] <== [tmp_1598[0] + evals[13][0], tmp_1598[1] + evals[13][1], tmp_1598[2] + evals[13][2]];
    signal tmp_1600[3] <== [evals[26][0] + evals[24][0], evals[26][1] + evals[24][1], evals[26][2] + evals[24][2]];
    signal tmp_1601[3] <== GLCMul()(tmp_1600, [0xd438539c95f63e9f,0,0]);
    signal tmp_2522[3] <== [tmp_1599[0] + tmp_1601[0], tmp_1599[1] + tmp_1601[1], tmp_1599[2] + tmp_1601[2]];
    signal tmp_1602[3] <== GLCMul()([0x19, 0, 0], tmp_2060);
    signal tmp_1603[3] <== GLCMul()([0x7186a80551025f8f, 0, 0], tmp_2110);
    signal tmp_1604[3] <== [tmp_1602[0] + tmp_1603[0], tmp_1602[1] + tmp_1603[1], tmp_1602[2] + tmp_1603[2]];
    signal tmp_1605[3] <== GLCMul()([0x622247557e9b5371, 0, 0], tmp_2120);
    signal tmp_1606[3] <== [tmp_1604[0] + tmp_1605[0], tmp_1604[1] + tmp_1605[1], tmp_1604[2] + tmp_1605[2]];
    signal tmp_1607[3] <== GLCMul()([0xc4cbe326d1ad9742, 0, 0], tmp_2130);
    signal tmp_1608[3] <== [tmp_1606[0] + tmp_1607[0], tmp_1606[1] + tmp_1607[1], tmp_1606[2] + tmp_1607[2]];
    signal tmp_1609[3] <== GLCMul()([0x55f1523ac6a23ea2, 0, 0], tmp_2140);
    signal tmp_1610[3] <== [tmp_1608[0] + tmp_1609[0], tmp_1608[1] + tmp_1609[1], tmp_1608[2] + tmp_1609[2]];
    signal tmp_1611[3] <== GLCMul()([0xa13dfe77a3d52f53, 0, 0], tmp_2150);
    signal tmp_1612[3] <== [tmp_1610[0] + tmp_1611[0], tmp_1610[1] + tmp_1611[1], tmp_1610[2] + tmp_1611[2]];
    signal tmp_1613[3] <== GLCMul()([0xe30750b6301c0452, 0, 0], tmp_2160);
    signal tmp_1614[3] <== [tmp_1612[0] + tmp_1613[0], tmp_1612[1] + tmp_1613[1], tmp_1612[2] + tmp_1613[2]];
    signal tmp_1615[3] <== GLCMul()([0x8bd488070a3a32b, 0, 0], tmp_2170);
    signal tmp_1616[3] <== [tmp_1614[0] + tmp_1615[0], tmp_1614[1] + tmp_1615[1], tmp_1614[2] + tmp_1615[2]];
    signal tmp_1617[3] <== GLCMul()([0xcd800caef5b72ae3, 0, 0], tmp_2180);
    signal tmp_1618[3] <== [tmp_1616[0] + tmp_1617[0], tmp_1616[1] + tmp_1617[1], tmp_1616[2] + tmp_1617[2]];
    signal tmp_1619[3] <== GLCMul()([0x83329c90f04233ce, 0, 0], tmp_2190);
    signal tmp_1620[3] <== [tmp_1618[0] + tmp_1619[0], tmp_1618[1] + tmp_1619[1], tmp_1618[2] + tmp_1619[2]];
    signal tmp_1621[3] <== GLCMul()([0xb5b99e6664a0a3ee, 0, 0], tmp_2200);
    signal tmp_1622[3] <== [tmp_1620[0] + tmp_1621[0], tmp_1620[1] + tmp_1621[1], tmp_1620[2] + tmp_1621[2]];
    signal tmp_1623[3] <== GLCMul()([0x6b0731849e200a7f, 0, 0], tmp_2210);
    signal tmp_2523[3] <== [tmp_1622[0] + tmp_1623[0], tmp_1622[1] + tmp_1623[1], tmp_1622[2] + tmp_1623[2]];
    signal tmp_1624[3] <== GLCMul()([0x19, 0, 0], tmp_2060);
    signal tmp_1625[3] <== GLCMul()([0xc15acf44759545a3, 0, 0], tmp_2244);
    signal tmp_1626[3] <== [tmp_1624[0] + tmp_1625[0], tmp_1624[1] + tmp_1625[1], tmp_1624[2] + tmp_1625[2]];
    signal tmp_1627[3] <== GLCMul()([0xcbfdcf39869719d4, 0, 0], tmp_2254);
    signal tmp_1628[3] <== [tmp_1626[0] + tmp_1627[0], tmp_1626[1] + tmp_1627[1], tmp_1626[2] + tmp_1627[2]];
    signal tmp_1629[3] <== GLCMul()([0x33f62042e2f80225, 0, 0], tmp_2264);
    signal tmp_1630[3] <== [tmp_1628[0] + tmp_1629[0], tmp_1628[1] + tmp_1629[1], tmp_1628[2] + tmp_1629[2]];
    signal tmp_1631[3] <== GLCMul()([0x2599c5ead81d8fa3, 0, 0], tmp_2274);
    signal tmp_1632[3] <== [tmp_1630[0] + tmp_1631[0], tmp_1630[1] + tmp_1631[1], tmp_1630[2] + tmp_1631[2]];
    signal tmp_1633[3] <== GLCMul()([0xb306cb6c1d7c8d0, 0, 0], tmp_2284);
    signal tmp_1634[3] <== [tmp_1632[0] + tmp_1633[0], tmp_1632[1] + tmp_1633[1], tmp_1632[2] + tmp_1633[2]];
    signal tmp_1635[3] <== GLCMul()([0x658c80d3df3729b1, 0, 0], tmp_2294);
    signal tmp_1636[3] <== [tmp_1634[0] + tmp_1635[0], tmp_1634[1] + tmp_1635[1], tmp_1634[2] + tmp_1635[2]];
    signal tmp_1637[3] <== GLCMul()([0xe8d1b2b21b41429c, 0, 0], tmp_2304);
    signal tmp_1638[3] <== [tmp_1636[0] + tmp_1637[0], tmp_1636[1] + tmp_1637[1], tmp_1636[2] + tmp_1637[2]];
    signal tmp_1639[3] <== GLCMul()([0xa1b67f09d4b3ccb8, 0, 0], tmp_2314);
    signal tmp_1640[3] <== [tmp_1638[0] + tmp_1639[0], tmp_1638[1] + tmp_1639[1], tmp_1638[2] + tmp_1639[2]];
    signal tmp_1641[3] <== GLCMul()([0xe1adf8b84437180, 0, 0], tmp_2324);
    signal tmp_1642[3] <== [tmp_1640[0] + tmp_1641[0], tmp_1640[1] + tmp_1641[1], tmp_1640[2] + tmp_1641[2]];
    signal tmp_1643[3] <== GLCMul()([0xd593a5e584af47b, 0, 0], tmp_2334);
    signal tmp_1644[3] <== [tmp_1642[0] + tmp_1643[0], tmp_1642[1] + tmp_1643[1], tmp_1642[2] + tmp_1643[2]];
    signal tmp_1645[3] <== GLCMul()([0xa023d94c56e151c7, 0, 0], tmp_2344);
    signal tmp_2524[3] <== [tmp_1644[0] + tmp_1645[0], tmp_1644[1] + tmp_1645[1], tmp_1644[2] + tmp_1645[2]];
    signal tmp_1646[3] <== [evals[14][0] - evals[10][0] + p, evals[14][1] - evals[10][1] + p, evals[14][2] - evals[10][2] + p];
    signal tmp_1647[3] <== GLCMul()(evals[19], tmp_1646);
    signal tmp_2525[3] <== [tmp_1647[0] + evals[10][0], tmp_1647[1] + evals[10][1], tmp_1647[2] + evals[10][2]];
    signal tmp_1648[3] <== [tmp_2525[0] - evals[14][0] + p, tmp_2525[1] - evals[14][1] + p, tmp_2525[2] - evals[14][2] + p];
    signal tmp_1649[3] <== GLCMul()(evals[24], tmp_1648);
    signal tmp_1650[3] <== [tmp_1649[0] + evals[14][0], tmp_1649[1] + evals[14][1], tmp_1649[2] + evals[14][2]];
    signal tmp_1651[3] <== [evals[26][0] + evals[24][0], evals[26][1] + evals[24][1], evals[26][2] + evals[24][2]];
    signal tmp_1652[3] <== GLCMul()(tmp_1651, [0xef781c7ce35b4c3d,0,0]);
    signal tmp_2526[3] <== [tmp_1650[0] + tmp_1652[0], tmp_1650[1] + tmp_1652[1], tmp_1650[2] + tmp_1652[2]];
    signal tmp_1653[3] <== GLCMul()([0x19, 0, 0], tmp_2064);
    signal tmp_1654[3] <== GLCMul()([0xec3fabc192b01799, 0, 0], tmp_2111);
    signal tmp_1655[3] <== [tmp_1653[0] + tmp_1654[0], tmp_1653[1] + tmp_1654[1], tmp_1653[2] + tmp_1654[2]];
    signal tmp_1656[3] <== GLCMul()([0x382b38cee8ee5375, 0, 0], tmp_2121);
    signal tmp_1657[3] <== [tmp_1655[0] + tmp_1656[0], tmp_1655[1] + tmp_1656[1], tmp_1655[2] + tmp_1656[2]];
    signal tmp_1658[3] <== GLCMul()([0x3bfb6c3f0e616572, 0, 0], tmp_2131);
    signal tmp_1659[3] <== [tmp_1657[0] + tmp_1658[0], tmp_1657[1] + tmp_1658[1], tmp_1657[2] + tmp_1658[2]];
    signal tmp_1660[3] <== GLCMul()([0x514abd0cf6c7bc86, 0, 0], tmp_2141);
    signal tmp_1661[3] <== [tmp_1659[0] + tmp_1660[0], tmp_1659[1] + tmp_1660[1], tmp_1659[2] + tmp_1660[2]];
    signal tmp_1662[3] <== GLCMul()([0x47521b1361dcc546, 0, 0], tmp_2151);
    signal tmp_1663[3] <== [tmp_1661[0] + tmp_1662[0], tmp_1661[1] + tmp_1662[1], tmp_1661[2] + tmp_1662[2]];
    signal tmp_1664[3] <== GLCMul()([0x178093843f863d14, 0, 0], tmp_2161);
    signal tmp_1665[3] <== [tmp_1663[0] + tmp_1664[0], tmp_1663[1] + tmp_1664[1], tmp_1663[2] + tmp_1664[2]];
    signal tmp_1666[3] <== GLCMul()([0xad1003c5d28918e7, 0, 0], tmp_2171);
    signal tmp_1667[3] <== [tmp_1665[0] + tmp_1666[0], tmp_1665[1] + tmp_1666[1], tmp_1665[2] + tmp_1666[2]];
    signal tmp_1668[3] <== GLCMul()([0x738450e42495bc81, 0, 0], tmp_2181);
    signal tmp_1669[3] <== [tmp_1667[0] + tmp_1668[0], tmp_1667[1] + tmp_1668[1], tmp_1667[2] + tmp_1668[2]];
    signal tmp_1670[3] <== GLCMul()([0xaf947c59af5e4047, 0, 0], tmp_2191);
    signal tmp_1671[3] <== [tmp_1669[0] + tmp_1670[0], tmp_1669[1] + tmp_1670[1], tmp_1669[2] + tmp_1670[2]];
    signal tmp_1672[3] <== GLCMul()([0x4653fb0685084ef2, 0, 0], tmp_2201);
    signal tmp_1673[3] <== [tmp_1671[0] + tmp_1672[0], tmp_1671[1] + tmp_1672[1], tmp_1671[2] + tmp_1672[2]];
    signal tmp_1674[3] <== GLCMul()([0x57fde2062ae35bf, 0, 0], tmp_2211);
    signal tmp_2527[3] <== [tmp_1673[0] + tmp_1674[0], tmp_1673[1] + tmp_1674[1], tmp_1673[2] + tmp_1674[2]];
    signal tmp_1675[3] <== GLCMul()([0x19, 0, 0], tmp_2064);
    signal tmp_1676[3] <== GLCMul()([0x49026cc3a4afc5a6, 0, 0], tmp_2245);
    signal tmp_1677[3] <== [tmp_1675[0] + tmp_1676[0], tmp_1675[1] + tmp_1676[1], tmp_1675[2] + tmp_1676[2]];
    signal tmp_1678[3] <== GLCMul()([0xe06dff00ab25b91b, 0, 0], tmp_2255);
    signal tmp_1679[3] <== [tmp_1677[0] + tmp_1678[0], tmp_1677[1] + tmp_1678[1], tmp_1677[2] + tmp_1678[2]];
    signal tmp_1680[3] <== GLCMul()([0xab38c561e8850ff, 0, 0], tmp_2265);
    signal tmp_1681[3] <== [tmp_1679[0] + tmp_1680[0], tmp_1679[1] + tmp_1680[1], tmp_1679[2] + tmp_1680[2]];
    signal tmp_1682[3] <== GLCMul()([0x92c3c8275e105eeb, 0, 0], tmp_2275);
    signal tmp_1683[3] <== [tmp_1681[0] + tmp_1682[0], tmp_1681[1] + tmp_1682[1], tmp_1681[2] + tmp_1682[2]];
    signal tmp_1684[3] <== GLCMul()([0xb65256e546889bd0, 0, 0], tmp_2285);
    signal tmp_1685[3] <== [tmp_1683[0] + tmp_1684[0], tmp_1683[1] + tmp_1684[1], tmp_1683[2] + tmp_1684[2]];
    signal tmp_1686[3] <== GLCMul()([0x3c0468236ea142f6, 0, 0], tmp_2295);
    signal tmp_1687[3] <== [tmp_1685[0] + tmp_1686[0], tmp_1685[1] + tmp_1686[1], tmp_1685[2] + tmp_1686[2]];
    signal tmp_1688[3] <== GLCMul()([0xee61766b889e18f2, 0, 0], tmp_2305);
    signal tmp_1689[3] <== [tmp_1687[0] + tmp_1688[0], tmp_1687[1] + tmp_1688[1], tmp_1687[2] + tmp_1688[2]];
    signal tmp_1690[3] <== GLCMul()([0xa206f41b12c30415, 0, 0], tmp_2315);
    signal tmp_1691[3] <== [tmp_1689[0] + tmp_1690[0], tmp_1689[1] + tmp_1690[1], tmp_1689[2] + tmp_1690[2]];
    signal tmp_1692[3] <== GLCMul()([0x2fe9d756c9f12d1, 0, 0], tmp_2325);
    signal tmp_1693[3] <== [tmp_1691[0] + tmp_1692[0], tmp_1691[1] + tmp_1692[1], tmp_1691[2] + tmp_1692[2]];
    signal tmp_1694[3] <== GLCMul()([0xe9633210630cbf12, 0, 0], tmp_2335);
    signal tmp_1695[3] <== [tmp_1693[0] + tmp_1694[0], tmp_1693[1] + tmp_1694[1], tmp_1693[2] + tmp_1694[2]];
    signal tmp_1696[3] <== GLCMul()([0x1ffea9fe85a0b0b1, 0, 0], tmp_2345);
    signal tmp_2528[3] <== [tmp_1695[0] + tmp_1696[0], tmp_1695[1] + tmp_1696[1], tmp_1695[2] + tmp_1696[2]];
    signal tmp_1697[3] <== [0 - evals[19][0] + p, -evals[19][1] + p, -evals[19][2] + p];
    signal tmp_1698[3] <== GLCMul()(evals[24], tmp_1697);
    signal tmp_1699[3] <== [tmp_1698[0] + evals[19][0], tmp_1698[1] + evals[19][1], tmp_1698[2] + evals[19][2]];
    signal tmp_1700[3] <== [evals[26][0] + evals[24][0], evals[26][1] + evals[24][1], evals[26][2] + evals[24][2]];
    signal tmp_1701[3] <== GLCMul()(tmp_1700, [0xcdc4a239b0c44426,0,0]);
    signal tmp_2529[3] <== [tmp_1699[0] + tmp_1701[0], tmp_1699[1] + tmp_1701[1], tmp_1699[2] + tmp_1701[2]];
    signal tmp_1702[3] <== GLCMul()([0x19, 0, 0], tmp_2068);
    signal tmp_1703[3] <== GLCMul()([0xe376678d843ce55e, 0, 0], tmp_2112);
    signal tmp_1704[3] <== [tmp_1702[0] + tmp_1703[0], tmp_1702[1] + tmp_1703[1], tmp_1702[2] + tmp_1703[2]];
    signal tmp_1705[3] <== GLCMul()([0x66f3860d7514e7fc, 0, 0], tmp_2122);
    signal tmp_1706[3] <== [tmp_1704[0] + tmp_1705[0], tmp_1704[1] + tmp_1705[1], tmp_1704[2] + tmp_1705[2]];
    signal tmp_1707[3] <== GLCMul()([0x7817f3dfff8b4ffa, 0, 0], tmp_2132);
    signal tmp_1708[3] <== [tmp_1706[0] + tmp_1707[0], tmp_1706[1] + tmp_1707[1], tmp_1706[2] + tmp_1707[2]];
    signal tmp_1709[3] <== GLCMul()([0x3929624a9def725b, 0, 0], tmp_2142);
    signal tmp_1710[3] <== [tmp_1708[0] + tmp_1709[0], tmp_1708[1] + tmp_1709[1], tmp_1708[2] + tmp_1709[2]];
    signal tmp_1711[3] <== GLCMul()([0x126ca37f215a80a, 0, 0], tmp_2152);
    signal tmp_1712[3] <== [tmp_1710[0] + tmp_1711[0], tmp_1710[1] + tmp_1711[1], tmp_1710[2] + tmp_1711[2]];
    signal tmp_1713[3] <== GLCMul()([0xfce2f5d02762a303, 0, 0], tmp_2162);
    signal tmp_1714[3] <== [tmp_1712[0] + tmp_1713[0], tmp_1712[1] + tmp_1713[1], tmp_1712[2] + tmp_1713[2]];
    signal tmp_1715[3] <== GLCMul()([0x1bc927375febbad7, 0, 0], tmp_2172);
    signal tmp_1716[3] <== [tmp_1714[0] + tmp_1715[0], tmp_1714[1] + tmp_1715[1], tmp_1714[2] + tmp_1715[2]];
    signal tmp_1717[3] <== GLCMul()([0x85b481e5243f60bf, 0, 0], tmp_2182);
    signal tmp_1718[3] <== [tmp_1716[0] + tmp_1717[0], tmp_1716[1] + tmp_1717[1], tmp_1716[2] + tmp_1717[2]];
    signal tmp_1719[3] <== GLCMul()([0x2d3c5f42a39c91a0, 0, 0], tmp_2192);
    signal tmp_1720[3] <== [tmp_1718[0] + tmp_1719[0], tmp_1718[1] + tmp_1719[1], tmp_1718[2] + tmp_1719[2]];
    signal tmp_1721[3] <== GLCMul()([0x811719919351ae8, 0, 0], tmp_2202);
    signal tmp_1722[3] <== [tmp_1720[0] + tmp_1721[0], tmp_1720[1] + tmp_1721[1], tmp_1720[2] + tmp_1721[2]];
    signal tmp_1723[3] <== GLCMul()([0xf669de0add993131, 0, 0], tmp_2212);
    signal tmp_2530[3] <== [tmp_1722[0] + tmp_1723[0], tmp_1722[1] + tmp_1723[1], tmp_1722[2] + tmp_1723[2]];
    signal tmp_1724[3] <== GLCMul()([0x19, 0, 0], tmp_2068);
    signal tmp_1725[3] <== GLCMul()([0x81d1ae8cc50240f3, 0, 0], tmp_2246);
    signal tmp_1726[3] <== [tmp_1724[0] + tmp_1725[0], tmp_1724[1] + tmp_1725[1], tmp_1724[2] + tmp_1725[2]];
    signal tmp_1727[3] <== GLCMul()([0xf4c77a079a4607d7, 0, 0], tmp_2256);
    signal tmp_1728[3] <== [tmp_1726[0] + tmp_1727[0], tmp_1726[1] + tmp_1727[1], tmp_1726[2] + tmp_1727[2]];
    signal tmp_1729[3] <== GLCMul()([0xed446b2315e3efc1, 0, 0], tmp_2266);
    signal tmp_1730[3] <== [tmp_1728[0] + tmp_1729[0], tmp_1728[1] + tmp_1729[1], tmp_1728[2] + tmp_1729[2]];
    signal tmp_1731[3] <== GLCMul()([0xb0a6b70915178c3, 0, 0], tmp_2276);
    signal tmp_1732[3] <== [tmp_1730[0] + tmp_1731[0], tmp_1730[1] + tmp_1731[1], tmp_1730[2] + tmp_1731[2]];
    signal tmp_1733[3] <== GLCMul()([0xb11ff3e089f15d9a, 0, 0], tmp_2286);
    signal tmp_1734[3] <== [tmp_1732[0] + tmp_1733[0], tmp_1732[1] + tmp_1733[1], tmp_1732[2] + tmp_1733[2]];
    signal tmp_1735[3] <== GLCMul()([0x1d4dba0b7ae9cc18, 0, 0], tmp_2296);
    signal tmp_1736[3] <== [tmp_1734[0] + tmp_1735[0], tmp_1734[1] + tmp_1735[1], tmp_1734[2] + tmp_1735[2]];
    signal tmp_1737[3] <== GLCMul()([0x65d74e2f43b48d05, 0, 0], tmp_2306);
    signal tmp_1738[3] <== [tmp_1736[0] + tmp_1737[0], tmp_1736[1] + tmp_1737[1], tmp_1736[2] + tmp_1737[2]];
    signal tmp_1739[3] <== GLCMul()([0xa2df8c6b8ae0804a, 0, 0], tmp_2316);
    signal tmp_1740[3] <== [tmp_1738[0] + tmp_1739[0], tmp_1738[1] + tmp_1739[1], tmp_1738[2] + tmp_1739[2]];
    signal tmp_1741[3] <== GLCMul()([0xa4e6f0a8c33348a6, 0, 0], tmp_2326);
    signal tmp_1742[3] <== [tmp_1740[0] + tmp_1741[0], tmp_1740[1] + tmp_1741[1], tmp_1740[2] + tmp_1741[2]];
    signal tmp_1743[3] <== GLCMul()([0xc0a26efc7be5669b, 0, 0], tmp_2336);
    signal tmp_1744[3] <== [tmp_1742[0] + tmp_1743[0], tmp_1742[1] + tmp_1743[1], tmp_1742[2] + tmp_1743[2]];
    signal tmp_1745[3] <== GLCMul()([0xa6b6582c547d0d60, 0, 0], tmp_2346);
    signal tmp_2531[3] <== [tmp_1744[0] + tmp_1745[0], tmp_1744[1] + tmp_1745[1], tmp_1744[2] + tmp_1745[2]];
    signal tmp_1746[3] <== [0 - evals[21][0] + p, -evals[21][1] + p, -evals[21][2] + p];
    signal tmp_1747[3] <== GLCMul()(evals[24], tmp_1746);
    signal tmp_1748[3] <== [tmp_1747[0] + evals[21][0], tmp_1747[1] + evals[21][1], tmp_1747[2] + evals[21][2]];
    signal tmp_1749[3] <== [evals[26][0] + evals[24][0], evals[26][1] + evals[24][1], evals[26][2] + evals[24][2]];
    signal tmp_1750[3] <== GLCMul()(tmp_1749, [0x277fa208bf337bff,0,0]);
    signal tmp_2532[3] <== [tmp_1748[0] + tmp_1750[0], tmp_1748[1] + tmp_1750[1], tmp_1748[2] + tmp_1750[2]];
    signal tmp_1751[3] <== GLCMul()([0x19, 0, 0], tmp_2072);
    signal tmp_1752[3] <== GLCMul()([0x7de38bae084da92d, 0, 0], tmp_2113);
    signal tmp_1753[3] <== [tmp_1751[0] + tmp_1752[0], tmp_1751[1] + tmp_1752[1], tmp_1751[2] + tmp_1752[2]];
    signal tmp_1754[3] <== GLCMul()([0x5b848442237e8a9b, 0, 0], tmp_2123);
    signal tmp_1755[3] <== [tmp_1753[0] + tmp_1754[0], tmp_1753[1] + tmp_1754[1], tmp_1753[2] + tmp_1754[2]];
    signal tmp_1756[3] <== GLCMul()([0xf6c705da84d57310, 0, 0], tmp_2133);
    signal tmp_1757[3] <== [tmp_1755[0] + tmp_1756[0], tmp_1755[1] + tmp_1756[1], tmp_1755[2] + tmp_1756[2]];
    signal tmp_1758[3] <== GLCMul()([0x31e6a4bdb6a49017, 0, 0], tmp_2143);
    signal tmp_1759[3] <== [tmp_1757[0] + tmp_1758[0], tmp_1757[1] + tmp_1758[1], tmp_1757[2] + tmp_1758[2]];
    signal tmp_1760[3] <== GLCMul()([0x889489706e5c5c0f, 0, 0], tmp_2153);
    signal tmp_1761[3] <== [tmp_1759[0] + tmp_1760[0], tmp_1759[1] + tmp_1760[1], tmp_1759[2] + tmp_1760[2]];
    signal tmp_1762[3] <== GLCMul()([0xe4a205459692a1b, 0, 0], tmp_2163);
    signal tmp_1763[3] <== [tmp_1761[0] + tmp_1762[0], tmp_1761[1] + tmp_1762[1], tmp_1761[2] + tmp_1762[2]];
    signal tmp_1764[3] <== GLCMul()([0xbac3fa75ee26f299, 0, 0], tmp_2173);
    signal tmp_1765[3] <== [tmp_1763[0] + tmp_1764[0], tmp_1763[1] + tmp_1764[1], tmp_1763[2] + tmp_1764[2]];
    signal tmp_1766[3] <== GLCMul()([0x5f5894f4057d755e, 0, 0], tmp_2183);
    signal tmp_1767[3] <== [tmp_1765[0] + tmp_1766[0], tmp_1765[1] + tmp_1766[1], tmp_1765[2] + tmp_1766[2]];
    signal tmp_1768[3] <== GLCMul()([0xb0dc3ecd724bb076, 0, 0], tmp_2193);
    signal tmp_1769[3] <== [tmp_1767[0] + tmp_1768[0], tmp_1767[1] + tmp_1768[1], tmp_1767[2] + tmp_1768[2]];
    signal tmp_1770[3] <== GLCMul()([0x5e34d8554a6452ba, 0, 0], tmp_2203);
    signal tmp_1771[3] <== [tmp_1769[0] + tmp_1770[0], tmp_1769[1] + tmp_1770[1], tmp_1769[2] + tmp_1770[2]];
    signal tmp_1772[3] <== GLCMul()([0x4f78fd8c1fdcc5f, 0, 0], tmp_2213);
    signal tmp_2533[3] <== [tmp_1771[0] + tmp_1772[0], tmp_1771[1] + tmp_1772[1], tmp_1771[2] + tmp_1772[2]];
    signal tmp_1773[3] <== GLCMul()([0x19, 0, 0], tmp_2072);
    signal tmp_1774[3] <== GLCMul()([0x84afc741f1c13213, 0, 0], tmp_2247);
    signal tmp_1775[3] <== [tmp_1773[0] + tmp_1774[0], tmp_1773[1] + tmp_1774[1], tmp_1773[2] + tmp_1774[2]];
    signal tmp_1776[3] <== GLCMul()([0x2f8f43734fc906f3, 0, 0], tmp_2257);
    signal tmp_1777[3] <== [tmp_1775[0] + tmp_1776[0], tmp_1775[1] + tmp_1776[1], tmp_1775[2] + tmp_1776[2]];
    signal tmp_1778[3] <== GLCMul()([0xde682d72da0a02d9, 0, 0], tmp_2267);
    signal tmp_1779[3] <== [tmp_1777[0] + tmp_1778[0], tmp_1777[1] + tmp_1778[1], tmp_1777[2] + tmp_1778[2]];
    signal tmp_1780[3] <== GLCMul()([0xbb005236adb9ef2, 0, 0], tmp_2277);
    signal tmp_1781[3] <== [tmp_1779[0] + tmp_1780[0], tmp_1779[1] + tmp_1780[1], tmp_1779[2] + tmp_1780[2]];
    signal tmp_1782[3] <== GLCMul()([0x5bdf35c10a8b5624, 0, 0], tmp_2287);
    signal tmp_1783[3] <== [tmp_1781[0] + tmp_1782[0], tmp_1781[1] + tmp_1782[1], tmp_1781[2] + tmp_1782[2]];
    signal tmp_1784[3] <== GLCMul()([0x739a8a343950010, 0, 0], tmp_2297);
    signal tmp_1785[3] <== [tmp_1783[0] + tmp_1784[0], tmp_1783[1] + tmp_1784[1], tmp_1783[2] + tmp_1784[2]];
    signal tmp_1786[3] <== GLCMul()([0x52f515f44785cfbc, 0, 0], tmp_2307);
    signal tmp_1787[3] <== [tmp_1785[0] + tmp_1786[0], tmp_1785[1] + tmp_1786[1], tmp_1785[2] + tmp_1786[2]];
    signal tmp_1788[3] <== GLCMul()([0xcbaf4e5d82856c60, 0, 0], tmp_2317);
    signal tmp_1789[3] <== [tmp_1787[0] + tmp_1788[0], tmp_1787[1] + tmp_1788[1], tmp_1787[2] + tmp_1788[2]];
    signal tmp_1790[3] <== GLCMul()([0xac9ea09074e3e150, 0, 0], tmp_2327);
    signal tmp_1791[3] <== [tmp_1789[0] + tmp_1790[0], tmp_1789[1] + tmp_1790[1], tmp_1789[2] + tmp_1790[2]];
    signal tmp_1792[3] <== GLCMul()([0x8f0fa011a2035fb0, 0, 0], tmp_2337);
    signal tmp_1793[3] <== [tmp_1791[0] + tmp_1792[0], tmp_1791[1] + tmp_1792[1], tmp_1791[2] + tmp_1792[2]];
    signal tmp_1794[3] <== GLCMul()([0x1a37905d8450904a, 0, 0], tmp_2347);
    signal tmp_2534[3] <== [tmp_1793[0] + tmp_1794[0], tmp_1793[1] + tmp_1794[1], tmp_1793[2] + tmp_1794[2]];
    signal tmp_1795[3] <== [0 - evals[22][0] + p, -evals[22][1] + p, -evals[22][2] + p];
    signal tmp_1796[3] <== GLCMul()(evals[24], tmp_1795);
    signal tmp_1797[3] <== [tmp_1796[0] + evals[22][0], tmp_1796[1] + evals[22][1], tmp_1796[2] + evals[22][2]];
    signal tmp_1798[3] <== [evals[26][0] + evals[24][0], evals[26][1] + evals[24][1], evals[26][2] + evals[24][2]];
    signal tmp_1799[3] <== GLCMul()(tmp_1798, [0xe17653a29da578a1,0,0]);
    signal tmp_2535[3] <== [tmp_1797[0] + tmp_1799[0], tmp_1797[1] + tmp_1799[1], tmp_1797[2] + tmp_1799[2]];
    signal tmp_2536[3] <== evals[0];
    signal tmp_1800[3] <== GLCMul()(challenges3, challenges7);
    signal tmp_1801[3] <== [tmp_2536[0] + tmp_1800[0], tmp_2536[1] + tmp_1800[1], tmp_2536[2] + tmp_1800[2]];
    signal tmp_2537[3] <== [tmp_1801[0] + challenges2[0], tmp_1801[1] + challenges2[1], tmp_1801[2] + challenges2[2]];
    signal tmp_2538[3] <== evals[2];
    signal tmp_1802[3] <== GLCMul()(challenges3, [12275445934081160404,0,0]);
    signal tmp_1803[3] <== GLCMul()(tmp_1802, challenges7);
    signal tmp_1804[3] <== [tmp_2538[0] + tmp_1803[0], tmp_2538[1] + tmp_1803[1], tmp_2538[2] + tmp_1803[2]];
    signal tmp_1805[3] <== [tmp_1804[0] + challenges2[0], tmp_1804[1] + challenges2[1], tmp_1804[2] + challenges2[2]];
    signal tmp_2539[3] <== GLCMul()(tmp_2537, tmp_1805);
    signal tmp_2540[3] <== evals[3];
    signal tmp_1806[3] <== GLCMul()(challenges3, [4756475762779100925,0,0]);
    signal tmp_1807[3] <== GLCMul()(tmp_1806, challenges7);
    signal tmp_1808[3] <== [tmp_2540[0] + tmp_1807[0], tmp_2540[1] + tmp_1807[1], tmp_2540[2] + tmp_1807[2]];
    signal tmp_1809[3] <== [tmp_1808[0] + challenges2[0], tmp_1808[1] + challenges2[1], tmp_1808[2] + challenges2[2]];
    signal tmp_2541[3] <== GLCMul()(tmp_2539, tmp_1809);
    signal tmp_2542[3] <== evals[10];
    signal tmp_1810[3] <== GLCMul()(challenges3, [1279992132519201448,0,0]);
    signal tmp_1811[3] <== GLCMul()(tmp_1810, challenges7);
    signal tmp_1812[3] <== [tmp_2542[0] + tmp_1811[0], tmp_2542[1] + tmp_1811[1], tmp_2542[2] + tmp_1811[2]];
    signal tmp_1813[3] <== [tmp_1812[0] + challenges2[0], tmp_1812[1] + challenges2[1], tmp_1812[2] + challenges2[2]];
    signal tmp_2543[3] <== GLCMul()(tmp_2541, tmp_1813);
    signal tmp_2544[3] <== evals[11];
    signal tmp_1814[3] <== GLCMul()(challenges3, [8312008622371998338,0,0]);
    signal tmp_1815[3] <== GLCMul()(tmp_1814, challenges7);
    signal tmp_1816[3] <== [tmp_2544[0] + tmp_1815[0], tmp_2544[1] + tmp_1815[1], tmp_2544[2] + tmp_1815[2]];
    signal tmp_1817[3] <== [tmp_1816[0] + challenges2[0], tmp_1816[1] + challenges2[1], tmp_1816[2] + challenges2[2]];
    signal tmp_2545[3] <== GLCMul()(tmp_2543, tmp_1817);
    signal tmp_2546[3] <== evals[12];
    signal tmp_1818[3] <== GLCMul()(challenges3, [7781028390488215464,0,0]);
    signal tmp_1819[3] <== GLCMul()(tmp_1818, challenges7);
    signal tmp_1820[3] <== [tmp_2546[0] + tmp_1819[0], tmp_2546[1] + tmp_1819[1], tmp_2546[2] + tmp_1819[2]];
    signal tmp_1821[3] <== [tmp_1820[0] + challenges2[0], tmp_1820[1] + challenges2[1], tmp_1820[2] + challenges2[2]];
    signal tmp_2547[3] <== GLCMul()(tmp_2545, tmp_1821);
    signal tmp_2548[3] <== evals[13];
    signal tmp_1822[3] <== GLCMul()(challenges3, [11302600489504509467,0,0]);
    signal tmp_1823[3] <== GLCMul()(tmp_1822, challenges7);
    signal tmp_1824[3] <== [tmp_2548[0] + tmp_1823[0], tmp_2548[1] + tmp_1823[1], tmp_2548[2] + tmp_1823[2]];
    signal tmp_1825[3] <== [tmp_1824[0] + challenges2[0], tmp_1824[1] + challenges2[1], tmp_1824[2] + challenges2[2]];
    signal tmp_2549[3] <== GLCMul()(tmp_2547, tmp_1825);
    signal tmp_2550[3] <== evals[14];
    signal tmp_2551[3] <== evals[68];
    signal tmp_1826[3] <== GLCMul()(challenges3, tmp_2551);
    signal tmp_1827[3] <== [tmp_2536[0] + tmp_1826[0], tmp_2536[1] + tmp_1826[1], tmp_2536[2] + tmp_1826[2]];
    signal tmp_2552[3] <== [tmp_1827[0] + challenges2[0], tmp_1827[1] + challenges2[1], tmp_1827[2] + challenges2[2]];
    signal tmp_2553[3] <== evals[69];
    signal tmp_1828[3] <== GLCMul()(challenges3, tmp_2553);
    signal tmp_1829[3] <== [tmp_2538[0] + tmp_1828[0], tmp_2538[1] + tmp_1828[1], tmp_2538[2] + tmp_1828[2]];
    signal tmp_1830[3] <== [tmp_1829[0] + challenges2[0], tmp_1829[1] + challenges2[1], tmp_1829[2] + challenges2[2]];
    signal tmp_2554[3] <== GLCMul()(tmp_2552, tmp_1830);
    signal tmp_2555[3] <== evals[70];
    signal tmp_1831[3] <== GLCMul()(challenges3, tmp_2555);
    signal tmp_1832[3] <== [tmp_2540[0] + tmp_1831[0], tmp_2540[1] + tmp_1831[1], tmp_2540[2] + tmp_1831[2]];
    signal tmp_1833[3] <== [tmp_1832[0] + challenges2[0], tmp_1832[1] + challenges2[1], tmp_1832[2] + challenges2[2]];
    signal tmp_2556[3] <== GLCMul()(tmp_2554, tmp_1833);
    signal tmp_2557[3] <== evals[71];
    signal tmp_1834[3] <== GLCMul()(challenges3, tmp_2557);
    signal tmp_1835[3] <== [tmp_2542[0] + tmp_1834[0], tmp_2542[1] + tmp_1834[1], tmp_2542[2] + tmp_1834[2]];
    signal tmp_1836[3] <== [tmp_1835[0] + challenges2[0], tmp_1835[1] + challenges2[1], tmp_1835[2] + challenges2[2]];
    signal tmp_2558[3] <== GLCMul()(tmp_2556, tmp_1836);
    signal tmp_2559[3] <== evals[72];
    signal tmp_1837[3] <== GLCMul()(challenges3, tmp_2559);
    signal tmp_1838[3] <== [tmp_2544[0] + tmp_1837[0], tmp_2544[1] + tmp_1837[1], tmp_2544[2] + tmp_1837[2]];
    signal tmp_1839[3] <== [tmp_1838[0] + challenges2[0], tmp_1838[1] + challenges2[1], tmp_1838[2] + challenges2[2]];
    signal tmp_2560[3] <== GLCMul()(tmp_2558, tmp_1839);
    signal tmp_2561[3] <== evals[73];
    signal tmp_1840[3] <== GLCMul()(challenges3, tmp_2561);
    signal tmp_1841[3] <== [tmp_2546[0] + tmp_1840[0], tmp_2546[1] + tmp_1840[1], tmp_2546[2] + tmp_1840[2]];
    signal tmp_1842[3] <== [tmp_1841[0] + challenges2[0], tmp_1841[1] + challenges2[1], tmp_1841[2] + challenges2[2]];
    signal tmp_2562[3] <== GLCMul()(tmp_2560, tmp_1842);
    signal tmp_2563[3] <== evals[74];
    signal tmp_1843[3] <== GLCMul()(challenges3, tmp_2563);
    signal tmp_1844[3] <== [tmp_2548[0] + tmp_1843[0], tmp_2548[1] + tmp_1843[1], tmp_2548[2] + tmp_1843[2]];
    signal tmp_1845[3] <== [tmp_1844[0] + challenges2[0], tmp_1844[1] + challenges2[1], tmp_1844[2] + challenges2[2]];
    signal tmp_2564[3] <== GLCMul()(tmp_2562, tmp_1845);
    signal tmp_2565[3] <== evals[75];
    signal tmp_1846[3] <== GLCMulAdd()(challenges4, tmp_2015, tmp_2016);
    signal tmp_1847[3] <== GLCMulAdd()(challenges4, tmp_1846, tmp_2017);
    signal tmp_1848[3] <== GLCMulAdd()(challenges4, tmp_1847, tmp_2020);
    signal tmp_1849[3] <== GLCMulAdd()(challenges4, tmp_1848, tmp_2023);
    signal tmp_1850[3] <== GLCMulAdd()(challenges4, tmp_1849, tmp_2026);
    signal tmp_1851[3] <== GLCMulAdd()(challenges4, tmp_1850, tmp_2029);
    signal tmp_1852[3] <== GLCMulAdd()(challenges4, tmp_1851, tmp_2031);
    signal tmp_1853[3] <== GLCMulAdd()(challenges4, tmp_1852, tmp_2081);
    signal tmp_1854[3] <== GLCMulAdd()(challenges4, tmp_1853, tmp_2082);
    signal tmp_1855[3] <== GLCMulAdd()(challenges4, tmp_1854, tmp_2083);
    signal tmp_1856[3] <== GLCMulAdd()(challenges4, tmp_1855, tmp_2084);
    signal tmp_1857[3] <== GLCMulAdd()(challenges4, tmp_1856, tmp_2085);
    signal tmp_1858[3] <== GLCMulAdd()(challenges4, tmp_1857, tmp_2086);
    signal tmp_1859[3] <== GLCMulAdd()(challenges4, tmp_1858, tmp_2087);
    signal tmp_1860[3] <== GLCMulAdd()(challenges4, tmp_1859, tmp_2088);
    signal tmp_1861[3] <== GLCMulAdd()(challenges4, tmp_1860, tmp_2089);
    signal tmp_1862[3] <== GLCMulAdd()(challenges4, tmp_1861, tmp_2090);
    signal tmp_1863[3] <== GLCMulAdd()(challenges4, tmp_1862, tmp_2091);
    signal tmp_1864[3] <== GLCMulAdd()(challenges4, tmp_1863, tmp_2092);
    signal tmp_1865[3] <== GLCMulAdd()(challenges4, tmp_1864, tmp_2093);
    signal tmp_1866[3] <== GLCMulAdd()(challenges4, tmp_1865, tmp_2094);
    signal tmp_1867[3] <== GLCMulAdd()(challenges4, tmp_1866, tmp_2095);
    signal tmp_1868[3] <== GLCMulAdd()(challenges4, tmp_1867, tmp_2096);
    signal tmp_1869[3] <== GLCMulAdd()(challenges4, tmp_1868, tmp_2097);
    signal tmp_1870[3] <== GLCMulAdd()(challenges4, tmp_1869, tmp_2098);
    signal tmp_1871[3] <== GLCMulAdd()(challenges4, tmp_1870, tmp_2099);
    signal tmp_1872[3] <== GLCMulAdd()(challenges4, tmp_1871, tmp_2100);
    signal tmp_1873[3] <== GLCMulAdd()(challenges4, tmp_1872, tmp_2101);
    signal tmp_1874[3] <== GLCMulAdd()(challenges4, tmp_1873, tmp_2102);
    signal tmp_1875[3] <== GLCMulAdd()(challenges4, tmp_1874, tmp_2103);
    signal tmp_1876[3] <== GLCMulAdd()(challenges4, tmp_1875, tmp_2104);
    signal tmp_1877[3] <== GLCMulAdd()(challenges4, tmp_1876, tmp_2216);
    signal tmp_1878[3] <== GLCMulAdd()(challenges4, tmp_1877, tmp_2218);
    signal tmp_1879[3] <== GLCMulAdd()(challenges4, tmp_1878, tmp_2220);
    signal tmp_1880[3] <== GLCMulAdd()(challenges4, tmp_1879, tmp_2222);
    signal tmp_1881[3] <== GLCMulAdd()(challenges4, tmp_1880, tmp_2224);
    signal tmp_1882[3] <== GLCMulAdd()(challenges4, tmp_1881, tmp_2226);
    signal tmp_1883[3] <== GLCMulAdd()(challenges4, tmp_1882, tmp_2228);
    signal tmp_1884[3] <== GLCMulAdd()(challenges4, tmp_1883, tmp_2230);
    signal tmp_1885[3] <== GLCMulAdd()(challenges4, tmp_1884, tmp_2232);
    signal tmp_1886[3] <== GLCMulAdd()(challenges4, tmp_1885, tmp_2234);
    signal tmp_1887[3] <== GLCMulAdd()(challenges4, tmp_1886, tmp_2236);
    signal tmp_1888[3] <== GLCMulAdd()(challenges4, tmp_1887, tmp_2238);
    signal tmp_1889[3] <== GLCMulAdd()(challenges4, tmp_1888, tmp_2350);
    signal tmp_1890[3] <== GLCMulAdd()(challenges4, tmp_1889, tmp_2352);
    signal tmp_1891[3] <== GLCMulAdd()(challenges4, tmp_1890, tmp_2354);
    signal tmp_1892[3] <== GLCMulAdd()(challenges4, tmp_1891, tmp_2356);
    signal tmp_1893[3] <== GLCMulAdd()(challenges4, tmp_1892, tmp_2358);
    signal tmp_1894[3] <== GLCMulAdd()(challenges4, tmp_1893, tmp_2360);
    signal tmp_1895[3] <== GLCMulAdd()(challenges4, tmp_1894, tmp_2362);
    signal tmp_1896[3] <== GLCMulAdd()(challenges4, tmp_1895, tmp_2364);
    signal tmp_1897[3] <== GLCMulAdd()(challenges4, tmp_1896, tmp_2366);
    signal tmp_1898[3] <== GLCMulAdd()(challenges4, tmp_1897, tmp_2368);
    signal tmp_1899[3] <== GLCMulAdd()(challenges4, tmp_1898, tmp_2370);
    signal tmp_1900[3] <== GLCMulAdd()(challenges4, tmp_1899, tmp_2372);
    signal tmp_1901[3] <== GLCMulAdd()(challenges4, tmp_1900, tmp_2377);
    signal tmp_1902[3] <== GLCMulAdd()(challenges4, tmp_1901, tmp_2379);
    signal tmp_1903[3] <== GLCMulAdd()(challenges4, tmp_1902, tmp_2381);
    signal tmp_1904[3] <== GLCMulAdd()(challenges4, tmp_1903, tmp_2382);
    signal tmp_1905[3] <== GLCMulAdd()(challenges4, tmp_1904, tmp_2384);
    signal tmp_1906[3] <== GLCMulAdd()(challenges4, tmp_1905, tmp_2386);
    signal tmp_1907[3] <== GLCMulAdd()(challenges4, tmp_1906, tmp_2388);
    signal tmp_1908[3] <== GLCMulAdd()(challenges4, tmp_1907, tmp_2390);
    signal tmp_1909[3] <== GLCMulAdd()(challenges4, tmp_1908, tmp_2392);
    signal tmp_1910[3] <== GLCMulAdd()(challenges4, tmp_1909, tmp_2394);
    signal tmp_1911[3] <== GLCMulAdd()(challenges4, tmp_1910, tmp_2396);
    signal tmp_1912[3] <== GLCMulAdd()(challenges4, tmp_1911, tmp_2398);
    signal tmp_1913[3] <== GLCMulAdd()(challenges4, tmp_1912, tmp_2400);
    signal tmp_1914[3] <== GLCMulAdd()(challenges4, tmp_1913, tmp_2402);
    signal tmp_1915[3] <== GLCMulAdd()(challenges4, tmp_1914, tmp_2404);
    signal tmp_1916[3] <== GLCMulAdd()(challenges4, tmp_1915, tmp_2406);
    signal tmp_1917[3] <== GLCMulAdd()(challenges4, tmp_1916, tmp_2439);
    signal tmp_1918[3] <== GLCMulAdd()(challenges4, tmp_1917, tmp_2442);
    signal tmp_1919[3] <== GLCMulAdd()(challenges4, tmp_1918, tmp_2445);
    signal tmp_1920[3] <== GLCMulAdd()(challenges4, tmp_1919, tmp_2446);
    signal tmp_1921[3] <== GLCMulAdd()(challenges4, tmp_1920, tmp_2449);
    signal tmp_1922[3] <== GLCMulAdd()(challenges4, tmp_1921, tmp_2451);
    signal tmp_1923[3] <== GLCMulAdd()(challenges4, tmp_1922, tmp_2453);
    signal tmp_1924[3] <== GLCMulAdd()(challenges4, tmp_1923, tmp_2456);
    signal tmp_1925[3] <== GLCMulAdd()(challenges4, tmp_1924, tmp_2458);
    signal tmp_1926[3] <== GLCMulAdd()(challenges4, tmp_1925, tmp_2460);
    signal tmp_1927[3] <== GLCMulAdd()(challenges4, tmp_1926, tmp_2463);
    signal tmp_1928[3] <== GLCMulAdd()(challenges4, tmp_1927, tmp_2465);
    signal tmp_1929[3] <== GLCMulAdd()(challenges4, tmp_1928, tmp_2467);
    signal tmp_1930[3] <== GLCMulAdd()(challenges4, tmp_1929, tmp_2470);
    signal tmp_1931[3] <== GLCMulAdd()(challenges4, tmp_1930, tmp_2472);
    signal tmp_1932[3] <== GLCMulAdd()(challenges4, tmp_1931, tmp_2474);
    signal tmp_1933[3] <== GLCMulAdd()(challenges4, tmp_1932, tmp_2475);
    signal tmp_1934[3] <== GLCMulAdd()(challenges4, tmp_1933, tmp_2476);
    signal tmp_1935[3] <== GLCMulAdd()(challenges4, tmp_1934, tmp_2478);
    signal tmp_1936[3] <== GLCMulAdd()(challenges4, tmp_1935, tmp_2480);
    signal tmp_1937[3] <== GLCMulAdd()(challenges4, tmp_1936, tmp_2481);
    signal tmp_1938[3] <== GLCMulAdd()(challenges4, tmp_1937, tmp_2498);
    signal tmp_1939[3] <== GLCMul()(tmp_2035, tmp_2035);
    signal tmp_1940[3] <== [tmp_1939[0] - evals[25][0] + p, tmp_1939[1] - evals[25][1] + p, tmp_1939[2] - evals[25][2] + p];
    signal tmp_1941[3] <== GLCMulAdd()(challenges4, tmp_1938, tmp_1940);
    signal tmp_1942[3] <== [evals[53][0] + evals[41][0], evals[53][1] + evals[41][1], evals[53][2] + evals[41][2]];
    signal tmp_1943[3] <== GLCMul()(evals[55], tmp_2500);
    signal tmp_1944[3] <== GLCMulAdd()(evals[54], tmp_2499, tmp_1943);
    signal tmp_1945[3] <== GLCMulAdd()(tmp_1942, tmp_2502, tmp_1944);
    signal tmp_1946[3] <== [tmp_1945[0] - evals[27][0] + p, tmp_1945[1] - evals[27][1] + p, tmp_1945[2] - evals[27][2] + p];
    signal tmp_1947[3] <== GLCMulAdd()(challenges4, tmp_1941, tmp_1946);
    signal tmp_1948[3] <== [evals[53][0] + evals[41][0], evals[53][1] + evals[41][1], evals[53][2] + evals[41][2]];
    signal tmp_1949[3] <== GLCMul()(evals[55], tmp_2504);
    signal tmp_1950[3] <== GLCMulAdd()(evals[54], tmp_2503, tmp_1949);
    signal tmp_1951[3] <== GLCMulAdd()(tmp_1948, tmp_2506, tmp_1950);
    signal tmp_1952[3] <== [tmp_1951[0] - evals[28][0] + p, tmp_1951[1] - evals[28][1] + p, tmp_1951[2] - evals[28][2] + p];
    signal tmp_1953[3] <== GLCMulAdd()(challenges4, tmp_1947, tmp_1952);
    signal tmp_1954[3] <== [evals[53][0] + evals[41][0], evals[53][1] + evals[41][1], evals[53][2] + evals[41][2]];
    signal tmp_1955[3] <== GLCMul()(evals[55], tmp_2508);
    signal tmp_1956[3] <== GLCMulAdd()(evals[54], tmp_2507, tmp_1955);
    signal tmp_1957[3] <== GLCMulAdd()(tmp_1954, tmp_2510, tmp_1956);
    signal tmp_1958[3] <== [tmp_1957[0] - evals[29][0] + p, tmp_1957[1] - evals[29][1] + p, tmp_1957[2] - evals[29][2] + p];
    signal tmp_1959[3] <== GLCMulAdd()(challenges4, tmp_1953, tmp_1958);
    signal tmp_1960[3] <== [evals[53][0] + evals[41][0], evals[53][1] + evals[41][1], evals[53][2] + evals[41][2]];
    signal tmp_1961[3] <== GLCMul()(evals[55], tmp_2512);
    signal tmp_1962[3] <== GLCMulAdd()(evals[54], tmp_2511, tmp_1961);
    signal tmp_1963[3] <== GLCMulAdd()(tmp_1960, tmp_2514, tmp_1962);
    signal tmp_1964[3] <== [tmp_1963[0] - evals[30][0] + p, tmp_1963[1] - evals[30][1] + p, tmp_1963[2] - evals[30][2] + p];
    signal tmp_1965[3] <== GLCMulAdd()(challenges4, tmp_1959, tmp_1964);
    signal tmp_1966[3] <== [evals[53][0] + evals[41][0], evals[53][1] + evals[41][1], evals[53][2] + evals[41][2]];
    signal tmp_1967[3] <== GLCMul()(evals[55], tmp_2516);
    signal tmp_1968[3] <== GLCMulAdd()(evals[54], tmp_2515, tmp_1967);
    signal tmp_1969[3] <== GLCMulAdd()(tmp_1966, tmp_2518, tmp_1968);
    signal tmp_1970[3] <== [tmp_1969[0] - evals[31][0] + p, tmp_1969[1] - evals[31][1] + p, tmp_1969[2] - evals[31][2] + p];
    signal tmp_1971[3] <== GLCMulAdd()(challenges4, tmp_1965, tmp_1970);
    signal tmp_1972[3] <== [evals[53][0] + evals[41][0], evals[53][1] + evals[41][1], evals[53][2] + evals[41][2]];
    signal tmp_1973[3] <== GLCMul()(evals[55], tmp_2520);
    signal tmp_1974[3] <== GLCMulAdd()(evals[54], tmp_2519, tmp_1973);
    signal tmp_1975[3] <== GLCMulAdd()(tmp_1972, tmp_2522, tmp_1974);
    signal tmp_1976[3] <== [tmp_1975[0] - evals[33][0] + p, tmp_1975[1] - evals[33][1] + p, tmp_1975[2] - evals[33][2] + p];
    signal tmp_1977[3] <== GLCMulAdd()(challenges4, tmp_1971, tmp_1976);
    signal tmp_1978[3] <== [evals[53][0] + evals[41][0], evals[53][1] + evals[41][1], evals[53][2] + evals[41][2]];
    signal tmp_1979[3] <== GLCMul()(evals[55], tmp_2524);
    signal tmp_1980[3] <== GLCMulAdd()(evals[54], tmp_2523, tmp_1979);
    signal tmp_1981[3] <== GLCMulAdd()(tmp_1978, tmp_2526, tmp_1980);
    signal tmp_1982[3] <== [tmp_1981[0] - evals[34][0] + p, tmp_1981[1] - evals[34][1] + p, tmp_1981[2] - evals[34][2] + p];
    signal tmp_1983[3] <== GLCMulAdd()(challenges4, tmp_1977, tmp_1982);
    signal tmp_1984[3] <== [evals[53][0] + evals[41][0], evals[53][1] + evals[41][1], evals[53][2] + evals[41][2]];
    signal tmp_1985[3] <== GLCMul()(evals[55], tmp_2528);
    signal tmp_1986[3] <== GLCMulAdd()(evals[54], tmp_2527, tmp_1985);
    signal tmp_1987[3] <== GLCMulAdd()(tmp_1984, tmp_2529, tmp_1986);
    signal tmp_1988[3] <== [tmp_1987[0] - evals[35][0] + p, tmp_1987[1] - evals[35][1] + p, tmp_1987[2] - evals[35][2] + p];
    signal tmp_1989[3] <== GLCMulAdd()(challenges4, tmp_1983, tmp_1988);
    signal tmp_1990[3] <== [evals[53][0] + evals[41][0], evals[53][1] + evals[41][1], evals[53][2] + evals[41][2]];
    signal tmp_1991[3] <== GLCMul()(evals[55], tmp_2531);
    signal tmp_1992[3] <== GLCMulAdd()(evals[54], tmp_2530, tmp_1991);
    signal tmp_1993[3] <== GLCMulAdd()(tmp_1990, tmp_2532, tmp_1992);
    signal tmp_1994[3] <== [tmp_1993[0] - evals[36][0] + p, tmp_1993[1] - evals[36][1] + p, tmp_1993[2] - evals[36][2] + p];
    signal tmp_1995[3] <== GLCMulAdd()(challenges4, tmp_1989, tmp_1994);
    signal tmp_1996[3] <== [evals[53][0] + evals[41][0], evals[53][1] + evals[41][1], evals[53][2] + evals[41][2]];
    signal tmp_1997[3] <== GLCMul()(evals[55], tmp_2534);
    signal tmp_1998[3] <== GLCMulAdd()(evals[54], tmp_2533, tmp_1997);
    signal tmp_1999[3] <== GLCMulAdd()(tmp_1996, tmp_2535, tmp_1998);
    signal tmp_2000[3] <== [tmp_1999[0] - evals[37][0] + p, tmp_1999[1] - evals[37][1] + p, tmp_1999[2] - evals[37][2] + p];
    signal tmp_2001[3] <== GLCMulAdd()(challenges4, tmp_1995, tmp_2000);
    signal tmp_2002[3] <== GLCMul()(tmp_2078, tmp_2078);
    signal tmp_2003[3] <== [tmp_2002[0] - evals[38][0] + p, tmp_2002[1] - evals[38][1] + p, tmp_2002[2] - evals[38][2] + p];
    signal tmp_2004[3] <== GLCMulAdd()(challenges4, tmp_2001, tmp_2003);
    signal tmp_2005[3] <== GLCMul()(challenges3, [4549350404001778198,0,0]);
    signal tmp_2006[3] <== GLCMulAdd()(tmp_2005, challenges7, tmp_2550);
    signal tmp_2007[3] <== [tmp_2006[0] + challenges2[0], tmp_2006[1] + challenges2[1], tmp_2006[2] + challenges2[2]];
    signal tmp_2008[3] <== GLCMul()(tmp_2549, tmp_2007);
    signal tmp_2009[3] <== [tmp_2008[0] - evals[66][0] + p, tmp_2008[1] - evals[66][1] + p, tmp_2008[2] - evals[66][2] + p];
    signal tmp_2010[3] <== GLCMulAdd()(challenges4, tmp_2004, tmp_2009);
    signal tmp_2011[3] <== GLCMulAdd()(challenges3, tmp_2565, tmp_2550);
    signal tmp_2012[3] <== [tmp_2011[0] + challenges2[0], tmp_2011[1] + challenges2[1], tmp_2011[2] + challenges2[2]];
    signal tmp_2013[3] <== GLCMul()(tmp_2564, tmp_2012);
    signal tmp_2014[3] <== [tmp_2013[0] - evals[62][0] + p, tmp_2013[1] - evals[62][1] + p, tmp_2013[2] - evals[62][2] + p];
    signal tmp_2566[3] <== GLCMulAdd()(challenges4, tmp_2010, tmp_2014);

    signal xAcc[7][3]; //Stores, at each step, x^i evaluated at z
    signal qStep[6][3]; // Stores the evaluations of Q_i
    signal qAcc[7][3]; // Stores the accumulate sum of Q_i
    
    // Note: Each Qi has degree < n. qDeg determines the number of polynomials of degree < n needed to define Q
    // Calculate Q(X) = Q1(X) + X^n*Q2(X) + X^(2n)*Q3(X) + ..... X^((qDeg-1)n)*Q(X) evaluated at z 
    for (var i=0; i< 7; i++) {
        if (i==0) {
            xAcc[0] <== [1, 0, 0];
            qAcc[0] <== evals[76+i];
        } else {
            xAcc[i] <== GLCMul()(xAcc[i-1], zMul[12]);
            qStep[i-1] <== GLCMul()(xAcc[i], evals[76+i]);

            qAcc[i][0] <== qAcc[i-1][0] + qStep[i-1][0];
            qAcc[i][1] <== qAcc[i-1][1] + qStep[i-1][1];
            qAcc[i][2] <== qAcc[i-1][2] + qStep[i-1][2];
        }
    }

    signal QZ[3] <== GLCMul()(qAcc[6], Z); // Stores the result of multiplying Q(X) per Zg(X)

    // Final normalization
    signal normC[3] <== GLCNorm()([tmp_2566[0] - QZ[0], tmp_2566[1] - QZ[1],tmp_2566[2] - QZ[2]]);

    // Final Verification. Check that Q(X)*Zg(X) = sum of linear combination of q_i, which is stored at tmp_2566 
    enable * normC[0] === 0;
    enable * normC[1] === 0;
    enable * normC[2] === 0;

}

/* 
    Verify that the initial FRI polynomial, which is the lineal combination of the committed polynomials
    during the STARK phases, is built properly
*/
template parallel VerifyQuery(currStepBits, nextStepBits) {
    var nextStep = currStepBits - nextStepBits;
    signal input ys[17];
    signal input challenges5[3];
    signal input challenges6[3];
    signal input challenges7[3];
    signal input evals[83][3];
    signal input tree1[12];

    signal input tree3[21];
    signal input treeQ[21];
    signal input consts[36];
    signal input s0_vals[1 << nextStep][3];
    signal input enable;

    // Map the s0_vals so that they are converted either into single vars (if they belong to base field) or arrays of 3 elements (if 
    // they belong to the extended field). 
    component mapValues = MapValues();
    mapValues.vals1 <== tree1;
    mapValues.vals3 <== tree3;
    mapValues.valsQ <== treeQ;

    var p = 0xFFFFFFFF00000001;

    signal xacc[16];
    for (var i=1; i<17; i++ ) {
	if(i==1) {
	  xacc[i-1] <== GLMul()(ys[0]*40026531449011790767 + 7, ys[1]*(8167150655112846419 - 1) +1);
	} else {
	  xacc[i-1] <== GLMul()(xacc[i-2],  ys[i]*(roots(17 - i) - 1) +1);
	}
        
    }

    signal X <== xacc[15];

    signal xDivXSubXi[2][3];

    signal den0inv[3] <== GLCInv()([X - challenges7[0] + p, -challenges7[1] + p, -challenges7[2] + p]);
    xDivXSubXi[0] <== GLCMul()([X, 0, 0], den0inv);

    signal roots1[1][3];
    roots1[0] <== GLCMul()([roots(13), 0, 0], challenges7);
    signal den1inv[3] <== GLCInv()([X - roots1[0][0] + p, -roots1[0][1] + p, -roots1[0][2] + p]);
    xDivXSubXi[1] <== GLCMul()([X, 0, 0], den1inv);


    signal tmp_0[3] <== GLCMulAdd()(challenges5, [mapValues.tree1_0,0,0], [mapValues.tree1_1,0,0]);
    signal tmp_1[3] <== GLCMulAdd()(challenges5, tmp_0, [mapValues.tree1_2,0,0]);
    signal tmp_2[3] <== GLCMulAdd()(challenges5, tmp_1, [mapValues.tree1_3,0,0]);
    signal tmp_3[3] <== GLCMulAdd()(challenges5, tmp_2, [mapValues.tree1_4,0,0]);
    signal tmp_4[3] <== GLCMulAdd()(challenges5, tmp_3, [mapValues.tree1_5,0,0]);
    signal tmp_5[3] <== GLCMulAdd()(challenges5, tmp_4, [mapValues.tree1_6,0,0]);
    signal tmp_6[3] <== GLCMulAdd()(challenges5, tmp_5, [mapValues.tree1_7,0,0]);
    signal tmp_7[3] <== GLCMulAdd()(challenges5, tmp_6, [mapValues.tree1_8,0,0]);
    signal tmp_8[3] <== GLCMulAdd()(challenges5, tmp_7, [mapValues.tree1_9,0,0]);
    signal tmp_9[3] <== GLCMulAdd()(challenges5, tmp_8, [mapValues.tree1_10,0,0]);
    signal tmp_10[3] <== GLCMulAdd()(challenges5, tmp_9, [mapValues.tree1_11,0,0]);
    signal tmp_11[3] <== GLCMulAdd()(challenges5, tmp_10, mapValues.tree3_0);
    signal tmp_12[3] <== GLCMulAdd()(challenges5, tmp_11, [mapValues.tree3_1,0,0]);
    signal tmp_13[3] <== GLCMulAdd()(challenges5, tmp_12, [mapValues.tree3_2,0,0]);
    signal tmp_14[3] <== GLCMulAdd()(challenges5, tmp_13, [mapValues.tree3_3,0,0]);
    signal tmp_15[3] <== GLCMulAdd()(challenges5, tmp_14, [mapValues.tree3_4,0,0]);
    signal tmp_16[3] <== GLCMulAdd()(challenges5, tmp_15, [mapValues.tree3_5,0,0]);
    signal tmp_17[3] <== GLCMulAdd()(challenges5, tmp_16, [mapValues.tree3_6,0,0]);
    signal tmp_18[3] <== GLCMulAdd()(challenges5, tmp_17, [mapValues.tree3_7,0,0]);
    signal tmp_19[3] <== GLCMulAdd()(challenges5, tmp_18, [mapValues.tree3_8,0,0]);
    signal tmp_20[3] <== GLCMulAdd()(challenges5, tmp_19, [mapValues.tree3_9,0,0]);
    signal tmp_21[3] <== GLCMulAdd()(challenges5, tmp_20, [mapValues.tree3_10,0,0]);
    signal tmp_22[3] <== GLCMulAdd()(challenges5, tmp_21, [mapValues.tree3_11,0,0]);
    signal tmp_23[3] <== GLCMulAdd()(challenges5, tmp_22, [mapValues.tree3_12,0,0]);
    signal tmp_24[3] <== GLCMulAdd()(challenges5, tmp_23, mapValues.tree3_13);
    signal tmp_25[3] <== GLCMulAdd()(challenges5, tmp_24, mapValues.tree3_14);
    signal tmp_26[3] <== GLCMulAdd()(challenges5, tmp_25, mapValues.treeQ_0);
    signal tmp_27[3] <== GLCMulAdd()(challenges5, tmp_26, mapValues.treeQ_1);
    signal tmp_28[3] <== GLCMulAdd()(challenges5, tmp_27, mapValues.treeQ_2);
    signal tmp_29[3] <== GLCMulAdd()(challenges5, tmp_28, mapValues.treeQ_3);
    signal tmp_30[3] <== GLCMulAdd()(challenges5, tmp_29, mapValues.treeQ_4);
    signal tmp_31[3] <== GLCMulAdd()(challenges5, tmp_30, mapValues.treeQ_5);
    signal tmp_32[3] <== GLCMulAdd()(challenges5, tmp_31, mapValues.treeQ_6);
    signal tmp_33[3] <== [mapValues.tree1_0 - evals[0][0] + p, -evals[0][1] + p, -evals[0][2] + p];
    signal tmp_34[3] <== [consts[0] - evals[1][0] + p, -evals[1][1] + p, -evals[1][2] + p];
    signal tmp_35[3] <== GLCMulAdd()(tmp_33, challenges6, tmp_34);
    signal tmp_36[3] <== [mapValues.tree1_1 - evals[2][0] + p, -evals[2][1] + p, -evals[2][2] + p];
    signal tmp_37[3] <== GLCMulAdd()(tmp_35, challenges6, tmp_36);
    signal tmp_38[3] <== [mapValues.tree1_2 - evals[3][0] + p, -evals[3][1] + p, -evals[3][2] + p];
    signal tmp_39[3] <== GLCMulAdd()(tmp_37, challenges6, tmp_38);
    signal tmp_40[3] <== [consts[13] - evals[4][0] + p, -evals[4][1] + p, -evals[4][2] + p];
    signal tmp_41[3] <== GLCMulAdd()(tmp_39, challenges6, tmp_40);
    signal tmp_42[3] <== [consts[14] - evals[5][0] + p, -evals[5][1] + p, -evals[5][2] + p];
    signal tmp_43[3] <== GLCMulAdd()(tmp_41, challenges6, tmp_42);
    signal tmp_44[3] <== [consts[15] - evals[6][0] + p, -evals[6][1] + p, -evals[6][2] + p];
    signal tmp_45[3] <== GLCMulAdd()(tmp_43, challenges6, tmp_44);
    signal tmp_46[3] <== [consts[16] - evals[7][0] + p, -evals[7][1] + p, -evals[7][2] + p];
    signal tmp_47[3] <== GLCMulAdd()(tmp_45, challenges6, tmp_46);
    signal tmp_48[3] <== [consts[17] - evals[8][0] + p, -evals[8][1] + p, -evals[8][2] + p];
    signal tmp_49[3] <== GLCMulAdd()(tmp_47, challenges6, tmp_48);
    signal tmp_50[3] <== [consts[31] - evals[9][0] + p, -evals[9][1] + p, -evals[9][2] + p];
    signal tmp_51[3] <== GLCMulAdd()(tmp_49, challenges6, tmp_50);
    signal tmp_52[3] <== [mapValues.tree1_3 - evals[10][0] + p, -evals[10][1] + p, -evals[10][2] + p];
    signal tmp_53[3] <== GLCMulAdd()(tmp_51, challenges6, tmp_52);
    signal tmp_54[3] <== [mapValues.tree1_4 - evals[11][0] + p, -evals[11][1] + p, -evals[11][2] + p];
    signal tmp_55[3] <== GLCMulAdd()(tmp_53, challenges6, tmp_54);
    signal tmp_56[3] <== [mapValues.tree1_5 - evals[12][0] + p, -evals[12][1] + p, -evals[12][2] + p];
    signal tmp_57[3] <== GLCMulAdd()(tmp_55, challenges6, tmp_56);
    signal tmp_58[3] <== [mapValues.tree1_6 - evals[13][0] + p, -evals[13][1] + p, -evals[13][2] + p];
    signal tmp_59[3] <== GLCMulAdd()(tmp_57, challenges6, tmp_58);
    signal tmp_60[3] <== [mapValues.tree1_7 - evals[14][0] + p, -evals[14][1] + p, -evals[14][2] + p];
    signal tmp_61[3] <== GLCMulAdd()(tmp_59, challenges6, tmp_60);
    signal tmp_62[3] <== [consts[19] - evals[15][0] + p, -evals[15][1] + p, -evals[15][2] + p];
    signal tmp_63[3] <== GLCMulAdd()(tmp_61, challenges6, tmp_62);
    signal tmp_64[3] <== [consts[20] - evals[16][0] + p, -evals[16][1] + p, -evals[16][2] + p];
    signal tmp_65[3] <== GLCMulAdd()(tmp_63, challenges6, tmp_64);
    signal tmp_66[3] <== [consts[21] - evals[17][0] + p, -evals[17][1] + p, -evals[17][2] + p];
    signal tmp_67[3] <== GLCMulAdd()(tmp_65, challenges6, tmp_66);
    signal tmp_68[3] <== [consts[22] - evals[18][0] + p, -evals[18][1] + p, -evals[18][2] + p];
    signal tmp_69[3] <== GLCMulAdd()(tmp_67, challenges6, tmp_68);
    signal tmp_70[3] <== [mapValues.tree1_8 - evals[19][0] + p, -evals[19][1] + p, -evals[19][2] + p];
    signal tmp_71[3] <== GLCMulAdd()(tmp_69, challenges6, tmp_70);
    signal tmp_72[3] <== [consts[23] - evals[20][0] + p, -evals[20][1] + p, -evals[20][2] + p];
    signal tmp_73[3] <== GLCMulAdd()(tmp_71, challenges6, tmp_72);
    signal tmp_74[3] <== [mapValues.tree1_9 - evals[21][0] + p, -evals[21][1] + p, -evals[21][2] + p];
    signal tmp_75[3] <== GLCMulAdd()(tmp_73, challenges6, tmp_74);
    signal tmp_76[3] <== [mapValues.tree1_10 - evals[22][0] + p, -evals[22][1] + p, -evals[22][2] + p];
    signal tmp_77[3] <== GLCMulAdd()(tmp_75, challenges6, tmp_76);
    signal tmp_78[3] <== [mapValues.tree1_11 - evals[23][0] + p, -evals[23][1] + p, -evals[23][2] + p];
    signal tmp_79[3] <== GLCMulAdd()(tmp_77, challenges6, tmp_78);
    signal tmp_80[3] <== [consts[26] - evals[24][0] + p, -evals[24][1] + p, -evals[24][2] + p];
    signal tmp_81[3] <== GLCMulAdd()(tmp_79, challenges6, tmp_80);
    signal tmp_82[3] <== [mapValues.tree3_1 - evals[25][0] + p, -evals[25][1] + p, -evals[25][2] + p];
    signal tmp_83[3] <== GLCMulAdd()(tmp_81, challenges6, tmp_82);
    signal tmp_84[3] <== [consts[28] - evals[26][0] + p, -evals[26][1] + p, -evals[26][2] + p];
    signal tmp_85[3] <== GLCMulAdd()(tmp_83, challenges6, tmp_84);
    signal tmp_86[3] <== [mapValues.tree3_2 - evals[27][0] + p, -evals[27][1] + p, -evals[27][2] + p];
    signal tmp_87[3] <== GLCMulAdd()(tmp_85, challenges6, tmp_86);
    signal tmp_88[3] <== [mapValues.tree3_3 - evals[28][0] + p, -evals[28][1] + p, -evals[28][2] + p];
    signal tmp_89[3] <== GLCMulAdd()(tmp_87, challenges6, tmp_88);
    signal tmp_90[3] <== [mapValues.tree3_4 - evals[29][0] + p, -evals[29][1] + p, -evals[29][2] + p];
    signal tmp_91[3] <== GLCMulAdd()(tmp_89, challenges6, tmp_90);
    signal tmp_92[3] <== [mapValues.tree3_5 - evals[30][0] + p, -evals[30][1] + p, -evals[30][2] + p];
    signal tmp_93[3] <== GLCMulAdd()(tmp_91, challenges6, tmp_92);
    signal tmp_94[3] <== [mapValues.tree3_6 - evals[31][0] + p, -evals[31][1] + p, -evals[31][2] + p];
    signal tmp_95[3] <== GLCMulAdd()(tmp_93, challenges6, tmp_94);
    signal tmp_96[3] <== [consts[18] - evals[32][0] + p, -evals[32][1] + p, -evals[32][2] + p];
    signal tmp_97[3] <== GLCMulAdd()(tmp_95, challenges6, tmp_96);
    signal tmp_98[3] <== [mapValues.tree3_7 - evals[33][0] + p, -evals[33][1] + p, -evals[33][2] + p];
    signal tmp_99[3] <== GLCMulAdd()(tmp_97, challenges6, tmp_98);
    signal tmp_100[3] <== [mapValues.tree3_8 - evals[34][0] + p, -evals[34][1] + p, -evals[34][2] + p];
    signal tmp_101[3] <== GLCMulAdd()(tmp_99, challenges6, tmp_100);
    signal tmp_102[3] <== [mapValues.tree3_9 - evals[35][0] + p, -evals[35][1] + p, -evals[35][2] + p];
    signal tmp_103[3] <== GLCMulAdd()(tmp_101, challenges6, tmp_102);
    signal tmp_104[3] <== [mapValues.tree3_10 - evals[36][0] + p, -evals[36][1] + p, -evals[36][2] + p];
    signal tmp_105[3] <== GLCMulAdd()(tmp_103, challenges6, tmp_104);
    signal tmp_106[3] <== [mapValues.tree3_11 - evals[37][0] + p, -evals[37][1] + p, -evals[37][2] + p];
    signal tmp_107[3] <== GLCMulAdd()(tmp_105, challenges6, tmp_106);
    signal tmp_108[3] <== [mapValues.tree3_12 - evals[38][0] + p, -evals[38][1] + p, -evals[38][2] + p];
    signal tmp_109[3] <== GLCMulAdd()(tmp_107, challenges6, tmp_108);
    signal tmp_110[3] <== [consts[24] - evals[39][0] + p, -evals[39][1] + p, -evals[39][2] + p];
    signal tmp_111[3] <== GLCMulAdd()(tmp_109, challenges6, tmp_110);
    signal tmp_112[3] <== [consts[27] - evals[41][0] + p, -evals[41][1] + p, -evals[41][2] + p];
    signal tmp_113[3] <== GLCMulAdd()(tmp_111, challenges6, tmp_112);
    signal tmp_114[3] <== [consts[25] - evals[53][0] + p, -evals[53][1] + p, -evals[53][2] + p];
    signal tmp_115[3] <== GLCMulAdd()(tmp_113, challenges6, tmp_114);
    signal tmp_116[3] <== [consts[29] - evals[54][0] + p, -evals[54][1] + p, -evals[54][2] + p];
    signal tmp_117[3] <== GLCMulAdd()(tmp_115, challenges6, tmp_116);
    signal tmp_118[3] <== [consts[30] - evals[55][0] + p, -evals[55][1] + p, -evals[55][2] + p];
    signal tmp_119[3] <== GLCMulAdd()(tmp_117, challenges6, tmp_118);
    signal tmp_120[3] <== [consts[32] - evals[56][0] + p, -evals[56][1] + p, -evals[56][2] + p];
    signal tmp_121[3] <== GLCMulAdd()(tmp_119, challenges6, tmp_120);
    signal tmp_122[3] <== [consts[34] - evals[57][0] + p, -evals[57][1] + p, -evals[57][2] + p];
    signal tmp_123[3] <== GLCMulAdd()(tmp_121, challenges6, tmp_122);
    signal tmp_124[3] <== [consts[33] - evals[58][0] + p, -evals[58][1] + p, -evals[58][2] + p];
    signal tmp_125[3] <== GLCMulAdd()(tmp_123, challenges6, tmp_124);
    signal tmp_126[3] <== [consts[35] - evals[59][0] + p, -evals[59][1] + p, -evals[59][2] + p];
    signal tmp_127[3] <== GLCMulAdd()(tmp_125, challenges6, tmp_126);
    signal tmp_128[3] <== [mapValues.tree3_0[0] - evals[60][0] + p, mapValues.tree3_0[1] - evals[60][1] + p, mapValues.tree3_0[2] - evals[60][2] + p];
    signal tmp_129[3] <== GLCMulAdd()(tmp_127, challenges6, tmp_128);
    signal tmp_130[3] <== [consts[9] - evals[61][0] + p, -evals[61][1] + p, -evals[61][2] + p];
    signal tmp_131[3] <== GLCMulAdd()(tmp_129, challenges6, tmp_130);
    signal tmp_132[3] <== [mapValues.tree3_14[0] - evals[62][0] + p, mapValues.tree3_14[1] - evals[62][1] + p, mapValues.tree3_14[2] - evals[62][2] + p];
    signal tmp_133[3] <== GLCMulAdd()(tmp_131, challenges6, tmp_132);
    signal tmp_134[3] <== [consts[10] - evals[63][0] + p, -evals[63][1] + p, -evals[63][2] + p];
    signal tmp_135[3] <== GLCMulAdd()(tmp_133, challenges6, tmp_134);
    signal tmp_136[3] <== [consts[11] - evals[64][0] + p, -evals[64][1] + p, -evals[64][2] + p];
    signal tmp_137[3] <== GLCMulAdd()(tmp_135, challenges6, tmp_136);
    signal tmp_138[3] <== [consts[12] - evals[65][0] + p, -evals[65][1] + p, -evals[65][2] + p];
    signal tmp_139[3] <== GLCMulAdd()(tmp_137, challenges6, tmp_138);
    signal tmp_140[3] <== [mapValues.tree3_13[0] - evals[66][0] + p, mapValues.tree3_13[1] - evals[66][1] + p, mapValues.tree3_13[2] - evals[66][2] + p];
    signal tmp_141[3] <== GLCMulAdd()(tmp_139, challenges6, tmp_140);
    signal tmp_142[3] <== [consts[1] - evals[68][0] + p, -evals[68][1] + p, -evals[68][2] + p];
    signal tmp_143[3] <== GLCMulAdd()(tmp_141, challenges6, tmp_142);
    signal tmp_144[3] <== [consts[2] - evals[69][0] + p, -evals[69][1] + p, -evals[69][2] + p];
    signal tmp_145[3] <== GLCMulAdd()(tmp_143, challenges6, tmp_144);
    signal tmp_146[3] <== [consts[3] - evals[70][0] + p, -evals[70][1] + p, -evals[70][2] + p];
    signal tmp_147[3] <== GLCMulAdd()(tmp_145, challenges6, tmp_146);
    signal tmp_148[3] <== [consts[4] - evals[71][0] + p, -evals[71][1] + p, -evals[71][2] + p];
    signal tmp_149[3] <== GLCMulAdd()(tmp_147, challenges6, tmp_148);
    signal tmp_150[3] <== [consts[5] - evals[72][0] + p, -evals[72][1] + p, -evals[72][2] + p];
    signal tmp_151[3] <== GLCMulAdd()(tmp_149, challenges6, tmp_150);
    signal tmp_152[3] <== [consts[6] - evals[73][0] + p, -evals[73][1] + p, -evals[73][2] + p];
    signal tmp_153[3] <== GLCMulAdd()(tmp_151, challenges6, tmp_152);
    signal tmp_154[3] <== [consts[7] - evals[74][0] + p, -evals[74][1] + p, -evals[74][2] + p];
    signal tmp_155[3] <== GLCMulAdd()(tmp_153, challenges6, tmp_154);
    signal tmp_156[3] <== [consts[8] - evals[75][0] + p, -evals[75][1] + p, -evals[75][2] + p];
    signal tmp_157[3] <== GLCMulAdd()(tmp_155, challenges6, tmp_156);
    signal tmp_158[3] <== [mapValues.treeQ_0[0] - evals[76][0] + p, mapValues.treeQ_0[1] - evals[76][1] + p, mapValues.treeQ_0[2] - evals[76][2] + p];
    signal tmp_159[3] <== GLCMulAdd()(tmp_157, challenges6, tmp_158);
    signal tmp_160[3] <== [mapValues.treeQ_1[0] - evals[77][0] + p, mapValues.treeQ_1[1] - evals[77][1] + p, mapValues.treeQ_1[2] - evals[77][2] + p];
    signal tmp_161[3] <== GLCMulAdd()(tmp_159, challenges6, tmp_160);
    signal tmp_162[3] <== [mapValues.treeQ_2[0] - evals[78][0] + p, mapValues.treeQ_2[1] - evals[78][1] + p, mapValues.treeQ_2[2] - evals[78][2] + p];
    signal tmp_163[3] <== GLCMulAdd()(tmp_161, challenges6, tmp_162);
    signal tmp_164[3] <== [mapValues.treeQ_3[0] - evals[79][0] + p, mapValues.treeQ_3[1] - evals[79][1] + p, mapValues.treeQ_3[2] - evals[79][2] + p];
    signal tmp_165[3] <== GLCMulAdd()(tmp_163, challenges6, tmp_164);
    signal tmp_166[3] <== [mapValues.treeQ_4[0] - evals[80][0] + p, mapValues.treeQ_4[1] - evals[80][1] + p, mapValues.treeQ_4[2] - evals[80][2] + p];
    signal tmp_167[3] <== GLCMulAdd()(tmp_165, challenges6, tmp_166);
    signal tmp_168[3] <== [mapValues.treeQ_5[0] - evals[81][0] + p, mapValues.treeQ_5[1] - evals[81][1] + p, mapValues.treeQ_5[2] - evals[81][2] + p];
    signal tmp_169[3] <== GLCMulAdd()(tmp_167, challenges6, tmp_168);
    signal tmp_170[3] <== [mapValues.treeQ_6[0] - evals[82][0] + p, mapValues.treeQ_6[1] - evals[82][1] + p, mapValues.treeQ_6[2] - evals[82][2] + p];
    signal tmp_171[3] <== GLCMulAdd()(tmp_169, challenges6, tmp_170);
    signal tmp_172[3] <== GLCMul()(tmp_171, xDivXSubXi[0]);
    signal tmp_173[3] <== GLCMulAdd()(challenges5, tmp_32, tmp_172);
    signal tmp_174[3] <== [mapValues.tree1_0 - evals[40][0] + p, -evals[40][1] + p, -evals[40][2] + p];
    signal tmp_175[3] <== [mapValues.tree1_1 - evals[42][0] + p, -evals[42][1] + p, -evals[42][2] + p];
    signal tmp_176[3] <== GLCMulAdd()(tmp_174, challenges6, tmp_175);
    signal tmp_177[3] <== [mapValues.tree1_2 - evals[43][0] + p, -evals[43][1] + p, -evals[43][2] + p];
    signal tmp_178[3] <== GLCMulAdd()(tmp_176, challenges6, tmp_177);
    signal tmp_179[3] <== [mapValues.tree1_3 - evals[44][0] + p, -evals[44][1] + p, -evals[44][2] + p];
    signal tmp_180[3] <== GLCMulAdd()(tmp_178, challenges6, tmp_179);
    signal tmp_181[3] <== [mapValues.tree1_4 - evals[45][0] + p, -evals[45][1] + p, -evals[45][2] + p];
    signal tmp_182[3] <== GLCMulAdd()(tmp_180, challenges6, tmp_181);
    signal tmp_183[3] <== [mapValues.tree1_5 - evals[46][0] + p, -evals[46][1] + p, -evals[46][2] + p];
    signal tmp_184[3] <== GLCMulAdd()(tmp_182, challenges6, tmp_183);
    signal tmp_185[3] <== [mapValues.tree1_6 - evals[47][0] + p, -evals[47][1] + p, -evals[47][2] + p];
    signal tmp_186[3] <== GLCMulAdd()(tmp_184, challenges6, tmp_185);
    signal tmp_187[3] <== [mapValues.tree1_7 - evals[48][0] + p, -evals[48][1] + p, -evals[48][2] + p];
    signal tmp_188[3] <== GLCMulAdd()(tmp_186, challenges6, tmp_187);
    signal tmp_189[3] <== [mapValues.tree1_8 - evals[49][0] + p, -evals[49][1] + p, -evals[49][2] + p];
    signal tmp_190[3] <== GLCMulAdd()(tmp_188, challenges6, tmp_189);
    signal tmp_191[3] <== [mapValues.tree1_9 - evals[50][0] + p, -evals[50][1] + p, -evals[50][2] + p];
    signal tmp_192[3] <== GLCMulAdd()(tmp_190, challenges6, tmp_191);
    signal tmp_193[3] <== [mapValues.tree1_10 - evals[51][0] + p, -evals[51][1] + p, -evals[51][2] + p];
    signal tmp_194[3] <== GLCMulAdd()(tmp_192, challenges6, tmp_193);
    signal tmp_195[3] <== [mapValues.tree1_11 - evals[52][0] + p, -evals[52][1] + p, -evals[52][2] + p];
    signal tmp_196[3] <== GLCMulAdd()(tmp_194, challenges6, tmp_195);
    signal tmp_197[3] <== [mapValues.tree3_0[0] - evals[67][0] + p, mapValues.tree3_0[1] - evals[67][1] + p, mapValues.tree3_0[2] - evals[67][2] + p];
    signal tmp_198[3] <== GLCMulAdd()(tmp_196, challenges6, tmp_197);
    signal tmp_199[3] <== GLCMul()(tmp_198, xDivXSubXi[1]);
    signal tmp_200[3] <== GLCMulAdd()(challenges5, tmp_173, tmp_199);

    // Final Normalization
    signal queryVals[3] <== GLCNorm()(tmp_200);

    var s0_keys_lowValues[nextStep];
    for(var i = 0; i < nextStep; i++) {
        s0_keys_lowValues[i] = ys[i + nextStepBits];
    } 
   
    signal lowValues[3] <== TreeSelector(nextStep, 3)(s0_vals, s0_keys_lowValues);

    enable * (lowValues[0] - queryVals[0]) === 0;
    enable * (lowValues[1] - queryVals[1]) === 0;
    enable * (lowValues[2] - queryVals[2]) === 0;
}

// Polynomials can either have dimension 1 (if they are defined in the base field) or dimension 3 (if they are defined in the 
// extended field). In general, all initial polynomials (constants and tr) will have dim 1 and the other ones such as Z (grand product),
// Q (quotient) or h_i (plookup) will have dim 3.
// This function processes the values, which are stored in an array vals[n] and splits them in multiple signals of size 1 (vals_i) 
// or 3 (vals_i[3]) depending on its dimension.
template MapValues() {
    signal input vals1[12];
    signal input vals3[21];
    signal input valsQ[21];

    signal output tree1_0;
    signal output tree1_1;
    signal output tree1_2;
    signal output tree1_3;
    signal output tree1_4;
    signal output tree1_5;
    signal output tree1_6;
    signal output tree1_7;
    signal output tree1_8;
    signal output tree1_9;
    signal output tree1_10;
    signal output tree1_11;
    signal output tree3_0[3];
    signal output tree3_1;
    signal output tree3_2;
    signal output tree3_3;
    signal output tree3_4;
    signal output tree3_5;
    signal output tree3_6;
    signal output tree3_7;
    signal output tree3_8;
    signal output tree3_9;
    signal output tree3_10;
    signal output tree3_11;
    signal output tree3_12;
    signal output tree3_13[3];
    signal output tree3_14[3];
    signal output treeQ_0[3];
    signal output treeQ_1[3];
    signal output treeQ_2[3];
    signal output treeQ_3[3];
    signal output treeQ_4[3];
    signal output treeQ_5[3];
    signal output treeQ_6[3];

    tree1_0 <== vals1[0];
    tree1_1 <== vals1[1];
    tree1_2 <== vals1[2];
    tree1_3 <== vals1[3];
    tree1_4 <== vals1[4];
    tree1_5 <== vals1[5];
    tree1_6 <== vals1[6];
    tree1_7 <== vals1[7];
    tree1_8 <== vals1[8];
    tree1_9 <== vals1[9];
    tree1_10 <== vals1[10];
    tree1_11 <== vals1[11];
    tree3_0 <== [vals3[12],vals3[13] , vals3[14]];
    tree3_1 <== vals3[0];
    tree3_2 <== vals3[1];
    tree3_3 <== vals3[2];
    tree3_4 <== vals3[3];
    tree3_5 <== vals3[4];
    tree3_6 <== vals3[5];
    tree3_7 <== vals3[6];
    tree3_8 <== vals3[7];
    tree3_9 <== vals3[8];
    tree3_10 <== vals3[9];
    tree3_11 <== vals3[10];
    tree3_12 <== vals3[11];
    tree3_13 <== [vals3[15],vals3[16] , vals3[17]];
    tree3_14 <== [vals3[18],vals3[19] , vals3[20]];
    treeQ_0 <== [valsQ[0],valsQ[1] , valsQ[2]];
    treeQ_1 <== [valsQ[3],valsQ[4] , valsQ[5]];
    treeQ_2 <== [valsQ[6],valsQ[7] , valsQ[8]];
    treeQ_3 <== [valsQ[9],valsQ[10] , valsQ[11]];
    treeQ_4 <== [valsQ[12],valsQ[13] , valsQ[14]];
    treeQ_5 <== [valsQ[15],valsQ[16] , valsQ[17]];
    treeQ_6 <== [valsQ[18],valsQ[19] , valsQ[20]];
}

template parallel VerifyFinalPol() {
    ///////
    // Check Degree last pol
    ///////
    signal input finalPol[16][3];
    signal input enable;

    // Calculate the IFFT to get the coefficients of finalPol 
    signal lastIFFT[16][3] <== FFT(4, 1)(finalPol);

    // Check that the degree of the final polynomial is bounded by the degree defined in the last step of the folding
    // This means ?????? in terms of IFFT
    for (var k= 1; k< 16; k++) {
        for (var e=0; e<3; e++) {
            enable * lastIFFT[k][e] === 0;
        }
    }

    // The coefficients of lower degree can have any value
    for (var k= 0; k < 1; k++) {
        _ <== lastIFFT[k];
    }
}

template StarkVerifier() {
    signal input publics[3]; // constant polynomials
    signal input root1; // Merkle tree root of the evaluations of all trace polynomials
    signal input root2; // Merkle tree root of the evaluations of polynomials h1 and h2 used for the plookup
    signal input root3; // Merkle tree root of the evaluations of the grand product polynomials (Z) 
    signal input rootQ; // Merkle tree root of the evaluations of the quotient Q1 and Q2 polynomials

    // Notice that root2 and root3 can be zero depending on the STARK being verified 

    signal rootC <== 4996530440829051953383356903338638570209318620783152464040752714611525657817; // Merkle tree root of the evaluations of constant polynomials

    signal input evals[83][3]; // Evaluations of the set polynomials at a challenge value z and gz

    // Leaves values of the merkle tree used to check all the queries
    signal input s0_vals1[32][12];
    signal input s0_vals3[32][21];
    signal input s0_valsQ[32][21];
    signal input s0_valsC[32][36];
    
    // Merkle proofs for each of the evaluations
    signal input s0_siblings1[32][9][4];
    signal input s0_siblings3[32][9][4];
    signal input s0_siblingsQ[32][9][4];
    signal input s0_siblingsC[32][9][4];

    // Contains the root of the original polynomial and all the intermediate FRI polynomials except for the last step
    signal input s1_root;
    signal input s2_root;
    signal input s3_root;
    signal input s4_root;

    // For each intermediate FRI polynomial and the last one, we store at vals the values needed to check the queries.
    // Given a query r,  the verifier needs b points to check it out, being b = 2^u, where u is the difference between two consecutive step
    // and the sibling paths for each query.
    signal input s1_vals[32][24];
    signal input s1_siblings[32][7][4];
    signal input s2_vals[32][24];
    signal input s2_siblings[32][6][4];
    signal input s3_vals[32][48];
    signal input s3_siblings[32][4][4];
    signal input s4_vals[32][24];
    signal input s4_siblings[32][2][4];

    // Evaluations of the final FRI polynomial over a set of points of size bounded its degree
    signal input finalPol[16][3];

    signal enable;
    enable <== 1;

    // Each STARK proof requires 8 challenges (and remember that each challenge has the form a + bx + cx^2)
    // Challenge 0 && 1 -> Used to reduce vector lookups and vector permutations (uses a initial seed + root committed in round 1)
    // Challenge 2 && 3 -> Used to compute grand-product polynomials (uses previous output + root committed in round 2)
    // Challenge 4 -> Used to compute the quotient polynomial (uses previous output + root committed in round 3)
    // Challenge 7 -> Used to compute the evaluation challenge z (uses previous output + root committed in round 4)
    // Challenge 5 + 6 -> Used to compute combination challenge required for FRI (uses the evaluations values. 
    // Remember that each evaluation has three values since we are in an extended field GF(p^3))
    signal challenges[8][3];

    //(s_i)_special contains the random value provided by the verifier at each step of the folding so that 
    // the prover can commit the polynomial.
    // Remember that, when folding, the prover does as follows: f0 = g_0 + X*g_1 + ... + (X^b)*g_b and then the 
    // verifier provides a random X so that the prover can commit it. This value is stored here.
    signal s0_specialX[3];
    signal s1_specialX[3];
    signal s2_specialX[3];
    signal s3_specialX[3];
    signal s4_specialX[3];
    
    // Each of the queries values represented in binary
    signal ys[32][17];

    var p = 0xFFFFFFFF00000001;

    ///////////
    // Calculate challenges, s_i special and queries
    ///////////

    (challenges,ys,s0_specialX,s1_specialX,s2_specialX,s3_specialX,s4_specialX) <== Transcript()(publics,root1,root2,root3,rootQ,evals, s1_root,s2_root,s3_root,s4_root,finalPol);

    ///////////
    // Check constraints polynomial in the evaluation point
    ///////////

 
    VerifyEvaluations()(challenges[2], challenges[3], challenges[4], challenges[7], evals, publics, enable);

    ///////////
    // Preprocess s_i vals
    ///////////

    // Preprocess the s_i vals given as inputs so that we can use anonymous components.
    // Two different processings are done:
    // For s0_vals, the arrays are transposed so that they fit MerkleHash template
    // For (s_i)_vals, the values are passed all together in a single array of length nVals*3. We convert them to vals[nVals][3]
    
    var s0_vals1_p[32][12][1];
    var s0_vals3_p[32][21][1];
    var s0_valsQ_p[32][21][1];
    var s0_valsC_p[32][36][1];
    var s1_vals_p[32][8][3]; 
    var s2_vals_p[32][8][3]; 
    var s3_vals_p[32][16][3]; 
    var s4_vals_p[32][8][3]; 

    for (var q=0; q<32; q++) {
        // Preprocess vals for the initial FRI polynomial
        for (var i = 0; i < 12; i++) {
            s0_vals1_p[q][i][0] = s0_vals1[q][i];
        }
        for (var i = 0; i < 21; i++) {
            s0_vals3_p[q][i][0] = s0_vals3[q][i];
        }
        for (var i = 0; i < 21; i++) {
            s0_valsQ_p[q][i][0] = s0_valsQ[q][i];
        }
        for (var i = 0; i < 36; i++) {
            s0_valsC_p[q][i][0] = s0_valsC[q][i];
        }

        // Preprocess vals for each folded polynomial
        for(var e=0; e < 3; e++) {
            for(var c=0; c < 8; c++) {
                s1_vals_p[q][c][e] = s1_vals[q][c*3+e];
            }
            for(var c=0; c < 8; c++) {
                s2_vals_p[q][c][e] = s2_vals[q][c*3+e];
            }
            for(var c=0; c < 16; c++) {
                s3_vals_p[q][c][e] = s3_vals[q][c*3+e];
            }
            for(var c=0; c < 8; c++) {
                s4_vals_p[q][c][e] = s4_vals[q][c*3+e];
            }
        }
    }
    
    ///////////
    // Verify Merkle roots
    ///////////
        
    //Calculate merkle root for s0 vals
    for (var q=0; q<32; q++) {
        VerifyMerkleHash(1, 12, 17, 4)(s0_vals1_p[q], s0_siblings1[q], ys[q], root1, enable);
    }
    for (var q=0; q<32; q++) {
        VerifyMerkleHash(1, 21, 17, 4)(s0_vals3_p[q], s0_siblings3[q], ys[q], root3, enable);
    }
    for (var q=0; q<32; q++) {
        VerifyMerkleHash(1, 21, 17,4)(s0_valsQ_p[q], s0_siblingsQ[q], ys[q], rootQ, enable);
    }

    for (var q=0; q<32; q++) {
        VerifyMerkleHash(1, 36, 17, 4)(s0_valsC_p[q], s0_siblingsC[q], ys[q], rootC, enable);  
    }                                  

    for (var q=0; q<32; q++) {
        // Calculate merkle root for s1 vals
        var s1_keys_merkle[14];
        for(var i = 0; i < 14; i++) { s1_keys_merkle[i] = ys[q][i]; }
        VerifyMerkleHash(3, 8, 14,4)(s1_vals_p[q], s1_siblings[q], s1_keys_merkle, s1_root, enable);
    }
    for (var q=0; q<32; q++) {
        // Calculate merkle root for s2 vals
        var s2_keys_merkle[11];
        for(var i = 0; i < 11; i++) { s2_keys_merkle[i] = ys[q][i]; }
        VerifyMerkleHash(3, 8, 11,4)(s2_vals_p[q], s2_siblings[q], s2_keys_merkle, s2_root, enable);
    }
    for (var q=0; q<32; q++) {
        // Calculate merkle root for s3 vals
        var s3_keys_merkle[7];
        for(var i = 0; i < 7; i++) { s3_keys_merkle[i] = ys[q][i]; }
        VerifyMerkleHash(3, 16, 7,4)(s3_vals_p[q], s3_siblings[q], s3_keys_merkle, s3_root, enable);
    }
    for (var q=0; q<32; q++) {
        // Calculate merkle root for s4 vals
        var s4_keys_merkle[4];
        for(var i = 0; i < 4; i++) { s4_keys_merkle[i] = ys[q][i]; }
        VerifyMerkleHash(3, 8, 4,4)(s4_vals_p[q], s4_siblings[q], s4_keys_merkle, s4_root, enable);
    }

    ///////////
    // Verify FRI query
    ///////////

    // After checking that all merkle roots are properly built, the query and the intermediate 
    // polynomials need to be verified 
    for (var q=0; q<32; q++) {
        // Verify that the query is properly constructed. This is done by checking that the linear combination of the set of 
        // polynomials committed during the different rounds evaluated at z matches with the commitment of the FRI polynomial (unsure)
        VerifyQuery(17, 14)(ys[q], challenges[5], challenges[6], challenges[7], evals, s0_vals1[q], s0_vals3[q], s0_valsQ[q], s0_valsC[q], s1_vals_p[q], enable);

        ///////////
        // Verify FRI construction
        ///////////

        // For each folding level we need to check that the polynomial is properly constructed
        // Remember that if the step between polynomials is b = 2^l, the next polynomial p_(i+1) will have degree deg(p_i) / b

        // Check S1 
        var s1_ys[14];
        for(var i = 0; i < 14; i++) { s1_ys[i] = ys[q][i]; } 
        VerifyFRI(17, 14, 11, 2635249152773512046, 7433255753927727800)(s1_ys, s1_specialX, s1_vals_p[q], s2_vals_p[q], enable);

        // Check S2 
        var s2_ys[11];
        for(var i = 0; i < 11; i++) { s2_ys[i] = ys[q][i]; } 
        VerifyFRI(14, 11, 7, 12421013511830570338, 11983966273467659046)(s2_ys, s2_specialX, s2_vals_p[q], s3_vals_p[q], enable);

        // Check S3 
        var s3_ys[7];
        for(var i = 0; i < 7; i++) { s3_ys[i] = ys[q][i]; } 
        VerifyFRI(11, 7, 4, 11143297345130450484, 3316432459354545173)(s3_ys, s3_specialX, s3_vals_p[q], s4_vals_p[q], enable);

        // Check S4 
        var s4_ys[4];
        for(var i = 0; i < 4; i++) { s4_ys[i] = ys[q][i]; } 
        VerifyFRI(7, 4, 0, 14267896205310969465, 7826042894781768172)(s4_ys, s4_specialX, s4_vals_p[q], finalPol, enable);
    }

    VerifyFinalPol()(finalPol, enable);
}


template Main() {
    signal input proverAddr;
    signal output publicsHash;

    signal input publics[3];
    signal input root1;
    signal input root2;
    signal input root3;
    signal input rootQ;
    signal input evals[83][3];

    signal input s0_vals1[32][12];
    signal input s0_vals3[32][21];
    signal input s0_valsQ[32][21];
    signal input s0_valsC[32][36];
    signal input s0_siblings1[32][9][4];
    signal input s0_siblings3[32][9][4];
    signal input s0_siblingsQ[32][9][4];
    signal input s0_siblingsC[32][9][4];

    signal input s1_root;
    signal input s2_root;
    signal input s3_root;
    signal input s4_root;

    signal input s1_vals[32][24];
    signal input s1_siblings[32][7][4];
    signal input s2_vals[32][24];
    signal input s2_siblings[32][6][4];
    signal input s3_vals[32][48];
    signal input s3_siblings[32][4][4];
    signal input s4_vals[32][24];
    signal input s4_siblings[32][2][4];

    signal input finalPol[16][3];


    component sv = StarkVerifier();

    sv.publics <== publics;
    sv.root1 <== root1;
    sv.root2 <== root2;
    sv.root3 <== root3;
    sv.rootQ <== rootQ;
    sv.evals <== evals;


    sv.s0_vals1 <== s0_vals1;
    sv.s0_vals3 <== s0_vals3;
    sv.s0_valsQ <== s0_valsQ;
    sv.s0_valsC <== s0_valsC;
    sv.s0_siblings1 <== s0_siblings1;
    sv.s0_siblings3 <== s0_siblings3;
    sv.s0_siblingsQ <== s0_siblingsQ;
    sv.s0_siblingsC <== s0_siblingsC;

    sv.s1_root <== s1_root;
    sv.s2_root <== s2_root;
    sv.s3_root <== s3_root;
    sv.s4_root <== s4_root;

    sv.s1_vals <== s1_vals;
    sv.s1_siblings <== s1_siblings;
    sv.s2_vals <== s2_vals;
    sv.s2_siblings <== s2_siblings;
    sv.s3_vals <== s3_vals;
    sv.s3_siblings <== s3_siblings;
    sv.s4_vals <== s4_vals;
    sv.s4_siblings <== s4_siblings;
    sv.finalPol <== finalPol;

    //////
    // Calculate Publics Hash
    //////

    component publicsHasher = Sha256(352);
    component n2bProverAddr = Num2Bits(160);
    component n2bPublics[3 ];
    component cmpPublics[3 ];

    n2bProverAddr.in <== proverAddr;
    for (var i=0; i<160; i++) {
        publicsHasher.in[160 - 1 -i] <== n2bProverAddr.out[i];
    }

    var offset = 160;

    for (var i=0; i<3; i++) {
        n2bPublics[i] = Num2Bits(64);
        cmpPublics[i] = CompConstant64(0xFFFFFFFF00000000);
        n2bPublics[i].in <== publics[i];
        for (var j=0; j<64; j++) {
            publicsHasher.in[offset + 64 - 1 -j] <== n2bPublics[i].out[j];
            cmpPublics[i].in[j] <== n2bPublics[i].out[j];
        }
        cmpPublics[i].out === 0;
        offset += 64;
    }

    component n2bPublicsHash = Bits2Num(256);
    for (var i = 0; i < 256; i++) {
        n2bPublicsHash.in[i] <== publicsHasher.out[255-i];
    }

    publicsHash <== n2bPublicsHash.out;
}

component main = Main();

