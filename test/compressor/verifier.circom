pragma circom 2.1.0;
pragma custom_templates;

include "cmul.circom";
include "cinv.circom";
include "poseidon.circom";
include "bitify.circom";
include "fft.circom";
include "evalpol.circom";
include "treeselector4.circom";
include "merklehash.circom";

/* 
    Calculate the transcript
*/ 
template Transcript() {

    signal input publics[3];
    signal input root1[4]; 
    signal input root2[4]; 
    signal input root3[4]; 
    signal input rootQ[4];
    signal input evals[43][3]; 
    signal input s1_root[4];
    signal input s2_root[4];
    signal input finalPol[8][3];

    signal output challenges[8][3];  
    signal output ys[8][9];
    signal output s0_specialX[3];
    signal output s1_specialX[3];
    signal output s2_specialX[3];
  

    
    signal transcriptHash_0[12] <== Poseidon(12)([publics[0],publics[1],publics[2],root1[0],root1[1],root1[2],root1[3],0], [0,0,0,0]);
    challenges[0] <== [transcriptHash_0[0], transcriptHash_0[1], transcriptHash_0[2]];
    challenges[1] <== [transcriptHash_0[3], transcriptHash_0[4], transcriptHash_0[5]];
    for(var i = 6; i < 12; i++){
        _ <== transcriptHash_0[i]; // Unused transcript values 
    }
    
    signal transcriptHash_1[12] <== Poseidon(12)([root2[0],root2[1],root2[2],root2[3],0,0,0,0], [transcriptHash_0[0],transcriptHash_0[1],transcriptHash_0[2],transcriptHash_0[3]]);
    challenges[2] <== [transcriptHash_1[0], transcriptHash_1[1], transcriptHash_1[2]];
    challenges[3] <== [transcriptHash_1[3], transcriptHash_1[4], transcriptHash_1[5]];
    for(var i = 6; i < 12; i++){
        _ <== transcriptHash_1[i]; // Unused transcript values 
    }
    
    signal transcriptHash_2[12] <== Poseidon(12)([root3[0],root3[1],root3[2],root3[3],0,0,0,0], [transcriptHash_1[0],transcriptHash_1[1],transcriptHash_1[2],transcriptHash_1[3]]);
    challenges[4] <== [transcriptHash_2[0], transcriptHash_2[1], transcriptHash_2[2]];
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_2[i]; // Unused transcript values 
    }
    
    signal transcriptHash_3[12] <== Poseidon(12)([rootQ[0],rootQ[1],rootQ[2],rootQ[3],0,0,0,0], [transcriptHash_2[0],transcriptHash_2[1],transcriptHash_2[2],transcriptHash_2[3]]);
    challenges[7] <== [transcriptHash_3[0], transcriptHash_3[1], transcriptHash_3[2]];
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_3[i]; // Unused transcript values 
    }
    
    signal transcriptHash_4[12] <== Poseidon(12)([evals[0][0],evals[0][1],evals[0][2],evals[1][0],evals[1][1],evals[1][2],evals[2][0],evals[2][1]], [transcriptHash_3[0],transcriptHash_3[1],transcriptHash_3[2],transcriptHash_3[3]]);
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_4[i]; // Unused transcript values 
    }
    
    signal transcriptHash_5[12] <== Poseidon(12)([evals[2][2],evals[3][0],evals[3][1],evals[3][2],evals[4][0],evals[4][1],evals[4][2],evals[5][0]], [transcriptHash_4[0],transcriptHash_4[1],transcriptHash_4[2],transcriptHash_4[3]]);
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_5[i]; // Unused transcript values 
    }
    
    signal transcriptHash_6[12] <== Poseidon(12)([evals[5][1],evals[5][2],evals[6][0],evals[6][1],evals[6][2],evals[7][0],evals[7][1],evals[7][2]], [transcriptHash_5[0],transcriptHash_5[1],transcriptHash_5[2],transcriptHash_5[3]]);
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_6[i]; // Unused transcript values 
    }
    
    signal transcriptHash_7[12] <== Poseidon(12)([evals[8][0],evals[8][1],evals[8][2],evals[9][0],evals[9][1],evals[9][2],evals[10][0],evals[10][1]], [transcriptHash_6[0],transcriptHash_6[1],transcriptHash_6[2],transcriptHash_6[3]]);
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_7[i]; // Unused transcript values 
    }
    
    signal transcriptHash_8[12] <== Poseidon(12)([evals[10][2],evals[11][0],evals[11][1],evals[11][2],evals[12][0],evals[12][1],evals[12][2],evals[13][0]], [transcriptHash_7[0],transcriptHash_7[1],transcriptHash_7[2],transcriptHash_7[3]]);
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_8[i]; // Unused transcript values 
    }
    
    signal transcriptHash_9[12] <== Poseidon(12)([evals[13][1],evals[13][2],evals[14][0],evals[14][1],evals[14][2],evals[15][0],evals[15][1],evals[15][2]], [transcriptHash_8[0],transcriptHash_8[1],transcriptHash_8[2],transcriptHash_8[3]]);
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_9[i]; // Unused transcript values 
    }
    
    signal transcriptHash_10[12] <== Poseidon(12)([evals[16][0],evals[16][1],evals[16][2],evals[17][0],evals[17][1],evals[17][2],evals[18][0],evals[18][1]], [transcriptHash_9[0],transcriptHash_9[1],transcriptHash_9[2],transcriptHash_9[3]]);
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_10[i]; // Unused transcript values 
    }
    
    signal transcriptHash_11[12] <== Poseidon(12)([evals[18][2],evals[19][0],evals[19][1],evals[19][2],evals[20][0],evals[20][1],evals[20][2],evals[21][0]], [transcriptHash_10[0],transcriptHash_10[1],transcriptHash_10[2],transcriptHash_10[3]]);
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_11[i]; // Unused transcript values 
    }
    
    signal transcriptHash_12[12] <== Poseidon(12)([evals[21][1],evals[21][2],evals[22][0],evals[22][1],evals[22][2],evals[23][0],evals[23][1],evals[23][2]], [transcriptHash_11[0],transcriptHash_11[1],transcriptHash_11[2],transcriptHash_11[3]]);
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_12[i]; // Unused transcript values 
    }
    
    signal transcriptHash_13[12] <== Poseidon(12)([evals[24][0],evals[24][1],evals[24][2],evals[25][0],evals[25][1],evals[25][2],evals[26][0],evals[26][1]], [transcriptHash_12[0],transcriptHash_12[1],transcriptHash_12[2],transcriptHash_12[3]]);
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_13[i]; // Unused transcript values 
    }
    
    signal transcriptHash_14[12] <== Poseidon(12)([evals[26][2],evals[27][0],evals[27][1],evals[27][2],evals[28][0],evals[28][1],evals[28][2],evals[29][0]], [transcriptHash_13[0],transcriptHash_13[1],transcriptHash_13[2],transcriptHash_13[3]]);
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_14[i]; // Unused transcript values 
    }
    
    signal transcriptHash_15[12] <== Poseidon(12)([evals[29][1],evals[29][2],evals[30][0],evals[30][1],evals[30][2],evals[31][0],evals[31][1],evals[31][2]], [transcriptHash_14[0],transcriptHash_14[1],transcriptHash_14[2],transcriptHash_14[3]]);
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_15[i]; // Unused transcript values 
    }
    
    signal transcriptHash_16[12] <== Poseidon(12)([evals[32][0],evals[32][1],evals[32][2],evals[33][0],evals[33][1],evals[33][2],evals[34][0],evals[34][1]], [transcriptHash_15[0],transcriptHash_15[1],transcriptHash_15[2],transcriptHash_15[3]]);
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_16[i]; // Unused transcript values 
    }
    
    signal transcriptHash_17[12] <== Poseidon(12)([evals[34][2],evals[35][0],evals[35][1],evals[35][2],evals[36][0],evals[36][1],evals[36][2],evals[37][0]], [transcriptHash_16[0],transcriptHash_16[1],transcriptHash_16[2],transcriptHash_16[3]]);
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_17[i]; // Unused transcript values 
    }
    
    signal transcriptHash_18[12] <== Poseidon(12)([evals[37][1],evals[37][2],evals[38][0],evals[38][1],evals[38][2],evals[39][0],evals[39][1],evals[39][2]], [transcriptHash_17[0],transcriptHash_17[1],transcriptHash_17[2],transcriptHash_17[3]]);
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_18[i]; // Unused transcript values 
    }
    
    signal transcriptHash_19[12] <== Poseidon(12)([evals[40][0],evals[40][1],evals[40][2],evals[41][0],evals[41][1],evals[41][2],evals[42][0],evals[42][1]], [transcriptHash_18[0],transcriptHash_18[1],transcriptHash_18[2],transcriptHash_18[3]]);
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_19[i]; // Unused transcript values 
    }
    
    signal transcriptHash_20[12] <== Poseidon(12)([evals[42][2],0,0,0,0,0,0,0], [transcriptHash_19[0],transcriptHash_19[1],transcriptHash_19[2],transcriptHash_19[3]]);
    challenges[5] <== [transcriptHash_20[0], transcriptHash_20[1], transcriptHash_20[2]];
    challenges[6] <== [transcriptHash_20[3], transcriptHash_20[4], transcriptHash_20[5]];
    s0_specialX <== [transcriptHash_20[6], transcriptHash_20[7], transcriptHash_20[8]];
    for(var i = 9; i < 12; i++){
        _ <== transcriptHash_20[i]; // Unused transcript values 
    }
    
    signal transcriptHash_21[12] <== Poseidon(12)([s1_root[0],s1_root[1],s1_root[2],s1_root[3],0,0,0,0], [transcriptHash_20[0],transcriptHash_20[1],transcriptHash_20[2],transcriptHash_20[3]]);
    s1_specialX <== [transcriptHash_21[0], transcriptHash_21[1], transcriptHash_21[2]];
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_21[i]; // Unused transcript values 
    }
    
    signal transcriptHash_22[12] <== Poseidon(12)([s2_root[0],s2_root[1],s2_root[2],s2_root[3],0,0,0,0], [transcriptHash_21[0],transcriptHash_21[1],transcriptHash_21[2],transcriptHash_21[3]]);
    s2_specialX <== [transcriptHash_22[0], transcriptHash_22[1], transcriptHash_22[2]];
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_22[i]; // Unused transcript values 
    }
    
    signal transcriptHash_23[12] <== Poseidon(12)([finalPol[0][0],finalPol[0][1],finalPol[0][2],finalPol[1][0],finalPol[1][1],finalPol[1][2],finalPol[2][0],finalPol[2][1]], [transcriptHash_22[0],transcriptHash_22[1],transcriptHash_22[2],transcriptHash_22[3]]);
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_23[i]; // Unused transcript values 
    }
    
    signal transcriptHash_24[12] <== Poseidon(12)([finalPol[2][2],finalPol[3][0],finalPol[3][1],finalPol[3][2],finalPol[4][0],finalPol[4][1],finalPol[4][2],finalPol[5][0]], [transcriptHash_23[0],transcriptHash_23[1],transcriptHash_23[2],transcriptHash_23[3]]);
    for(var i = 4; i < 12; i++){
        _ <== transcriptHash_24[i]; // Unused transcript values 
    }
    
    signal transcriptHash_25[12] <== Poseidon(12)([finalPol[5][1],finalPol[5][2],finalPol[6][0],finalPol[6][1],finalPol[6][2],finalPol[7][0],finalPol[7][1],finalPol[7][2]], [transcriptHash_24[0],transcriptHash_24[1],transcriptHash_24[2],transcriptHash_24[3]]);
    signal transcriptN2b_0[64] <== Num2Bits_strict()(transcriptHash_25[0]);
    signal transcriptN2b_1[64] <== Num2Bits_strict()(transcriptHash_25[1]);
    for(var i = 2; i < 12; i++){
        _ <== transcriptHash_25[i]; // Unused transcript values        
    }

    // From each transcript hash converted to bits, we assign those bits to ys[q] to define the query positions
    var q = 0; // Query number 
    var b = 0; // Bit number 
    for(var j = 0; j < 63; j++) {
        ys[q][b] <== transcriptN2b_0[j];
        b++;
        if(b == 9) {
            b = 0; 
            q++;
        }
    }
    _ <== transcriptN2b_0[63]; // Unused last bit

    for(var j = 0; j < 9; j++) {
        ys[q][b] <== transcriptN2b_1[j];
        b++;
        if(b == 9) {
            b = 0; 
            q++;
        }
    }
    for(var j = 9; j < 64; j++) {
        _ <== transcriptN2b_1[j]; // Unused bits        
    }
}

/*
    Verify that FRI polynomials are built properly
*/
template parallel VerifyFRI(nBitsExt, prevStepBits, currStepBits, nextStepBits, e0) {
    var nextStep = currStepBits - nextStepBits; 
    var step = prevStepBits - currStepBits;

    signal input ys[currStepBits];
    signal input specialX[3];
    signal input s_vals_curr[1<< step][3];
    signal input s_vals_next[1<< nextStep][3];
    signal input enable;

    signal sx[currStepBits];
    
    sx[0] <==  e0 *( ys[0] * (invroots(prevStepBits) -1) + 1);
    for (var i=1; i< currStepBits; i++) {
        sx[i] <== sx[i-1] *  ( ys[i] * (invroots(prevStepBits -i) -1) +1);
    }
        
    // Perform an IFFT to obtain the coefficients of the polynomial given s_vals and evaluate it at ??????
    signal coefs[1 << step][3] <== FFT(step, 3, 1)(s_vals_curr);
    signal evalXprime[3] <== [specialX[0] *  sx[currStepBits - 1], specialX[1] * sx[currStepBits - 1], specialX[2] *  sx[currStepBits - 1]];
    signal evalPol[3] <== EvalPol(1 << step)(coefs, evalXprime);

    var keys_lowValues[nextStep];
    for(var i = 0; i < nextStep; i++) { keys_lowValues[i] = ys[i + nextStepBits]; } 
    signal lowValues[3] <== TreeSelector(nextStep, 3)(s_vals_next, keys_lowValues);

    // Check that ??????
    enable * (lowValues[0] - evalPol[0]) === 0;
    enable * (lowValues[1] - evalPol[1]) === 0;
    enable * (lowValues[2] - evalPol[2]) === 0;
}

/* 
    Verify that all committed polynomials are calculated correctly
*/
template parallel VerifyEvaluations() {
    signal input challenges0[3];
    signal input challenges1[3];
   
    signal input challenges2[3];
    signal input challenges3[3];
    signal input challenges4[3];
    signal input challenges7[3];
    signal input evals[43][3];
    signal input publics[3];
    signal input enable;

    // zMul stores all the powers of z (which is stored in challenge7) up to nBits, i.e, [z, z^2, ..., z^nBits]
    signal zMul[8][3];
    for (var i=0; i< 8 ; i++) {
        if(i==0){
            zMul[i] <== CMul()(challenges7, challenges7);
        } else {
            zMul[i] <== CMul()(zMul[i-1], zMul[i-1]);
        }
    }

    // Store the vanishing polynomial Zg = x^nBits - 1 evaluated at z
    var Z[3] = [zMul[7][0] -1, zMul[7][1], zMul[7][2]];

    // Using the evaluations committed and the challenges,
    // calculate the sum of q_i, i.e, q_0(X) + challenge * q_1(X) + challenge^2 * q_2(X) +  ... + challenge^(l-1) * q_l-1(X) evaluated at z 
    signal tmp_0[3] <== [evals[0][0] - evals[1][0], evals[0][1] - evals[1][1], evals[0][2] - evals[1][2]];
    signal tmp_1[3] <== [1 - evals[2][0], -evals[2][1], -evals[2][2]];
    signal tmp_2[3] <== CMul()(tmp_0, tmp_1);
    signal tmp_99[3] <== [tmp_2[0] - 0, tmp_2[1], tmp_2[2]];
    signal tmp_3[3] <== CMul()(evals[1], evals[1]);
    signal tmp_4[3] <== CMul()(evals[3], evals[3]);
    signal tmp_100[3] <== [tmp_3[0] + tmp_4[0], tmp_3[1] + tmp_4[1], tmp_3[2] + tmp_4[2]];
    signal tmp_5[3] <== [evals[4][0] - tmp_100[0], evals[4][1] - tmp_100[1], evals[4][2] - tmp_100[2]];
    signal tmp_6[3] <== [1 - evals[2][0], -evals[2][1], -evals[2][2]];
    signal tmp_7[3] <== CMul()(tmp_5, tmp_6);
    signal tmp_101[3] <== [tmp_7[0] - 0, tmp_7[1], tmp_7[2]];
    signal tmp_8[3] <== [evals[3][0] - publics[0], evals[3][1], evals[3][2]];
    signal tmp_9[3] <== CMul()(evals[5], tmp_8);
    signal tmp_102[3] <== [tmp_9[0] - 0, tmp_9[1], tmp_9[2]];
    signal tmp_10[3] <== [evals[1][0] - publics[1], evals[1][1], evals[1][2]];
    signal tmp_11[3] <== CMul()(evals[5], tmp_10);
    signal tmp_103[3] <== [tmp_11[0] - 0, tmp_11[1], tmp_11[2]];
    signal tmp_12[3] <== [evals[1][0] - publics[2], evals[1][1], evals[1][2]];
    signal tmp_13[3] <== CMul()(evals[2], tmp_12);
    signal tmp_104[3] <== [tmp_13[0] - 0, tmp_13[1], tmp_13[2]];
    signal tmp_14[3] <== [evals[6][0] - 1, evals[6][1], evals[6][2]];
    signal tmp_105[3] <== CMul()(evals[7], tmp_14);
    signal tmp_15[3] <== CMul()(evals[8], challenges3);
    signal tmp_16[3] <== [evals[9][0] + tmp_15[0], evals[9][1] + tmp_15[1], evals[9][2] + tmp_15[2]];
    signal tmp_17[3] <== [1 + challenges3[0], challenges3[1],  challenges3[2]];
    signal tmp_18[3] <== CMul()(challenges2, tmp_17);
    signal tmp_19[3] <== [tmp_16[0] + tmp_18[0], tmp_16[1] + tmp_18[1], tmp_16[2] + tmp_18[2]];
    signal tmp_20[3] <== CMul()(evals[10], challenges3);
    signal tmp_21[3] <== [evals[8][0] + tmp_20[0], evals[8][1] + tmp_20[1], evals[8][2] + tmp_20[2]];
    signal tmp_22[3] <== [1 + challenges3[0], challenges3[1],  challenges3[2]];
    signal tmp_23[3] <== CMul()(challenges2, tmp_22);
    signal tmp_24[3] <== [tmp_21[0] + tmp_23[0], tmp_21[1] + tmp_23[1], tmp_21[2] + tmp_23[2]];
    signal tmp_106[3] <== CMul()(tmp_19, tmp_24);
    signal tmp_25[3] <== CMul()(evals[11], tmp_106);
    signal tmp_26[3] <== CMul()(evals[6], evals[12]);
    signal tmp_107[3] <== [tmp_25[0] - tmp_26[0], tmp_25[1] - tmp_26[1], tmp_25[2] - tmp_26[2]];
    signal tmp_27[3] <== [evals[13][0] - 1, evals[13][1], evals[13][2]];
    signal tmp_108[3] <== CMul()(evals[7], tmp_27);
    signal tmp_109[3] <== evals[14];
    signal tmp_110[3] <== evals[14];
    signal tmp_111[3] <== evals[15];
    signal tmp_28[3] <== CMul()(challenges0, tmp_109);
    signal tmp_29[3] <== [tmp_28[0] + tmp_110[0], tmp_28[1] + tmp_110[1], tmp_28[2] + tmp_110[2]];
    signal tmp_30[3] <== [tmp_29[0] - challenges1[0], tmp_29[1] - challenges1[1], tmp_29[2] - challenges1[2]];
    signal tmp_31[3] <== CMul()(tmp_30, tmp_111);
    signal tmp_112[3] <== [tmp_31[0] + challenges1[0], tmp_31[1] + challenges1[1], tmp_31[2] + challenges1[2]];
    signal tmp_113[3] <== [tmp_112[0] + challenges3[0], tmp_112[1] + challenges3[1], tmp_112[2] + challenges3[2]];
    signal tmp_114[3] <== evals[16];
    signal tmp_115[3] <== evals[16];
    signal tmp_116[3] <== evals[17];
    signal tmp_32[3] <== CMul()(tmp_114, challenges0);
    signal tmp_33[3] <== [tmp_32[0] + tmp_115[0], tmp_32[1] + tmp_115[1], tmp_32[2] + tmp_115[2]];
    signal tmp_34[3] <== [tmp_33[0] - challenges1[0], tmp_33[1] - challenges1[1], tmp_33[2] - challenges1[2]];
    signal tmp_35[3] <== CMul()(tmp_34, tmp_116);
    signal tmp_117[3] <== [tmp_35[0] + challenges1[0], tmp_35[1] + challenges1[1], tmp_35[2] + challenges1[2]];
    signal tmp_118[3] <== [tmp_117[0] + challenges3[0], tmp_117[1] + challenges3[1], tmp_117[2] + challenges3[2]];
    signal tmp_36[3] <== CMul()(evals[18], tmp_113);
    signal tmp_37[3] <== CMul()(evals[13], tmp_118);
    signal tmp_119[3] <== [tmp_36[0] - tmp_37[0], tmp_36[1] - tmp_37[1], tmp_36[2] - tmp_37[2]];
    signal tmp_38[3] <== [evals[19][0] - 1, evals[19][1], evals[19][2]];
    signal tmp_120[3] <== CMul()(evals[7], tmp_38);
    signal tmp_39[3] <== CMul()(evals[20], evals[21]);
    signal tmp_40[3] <== CMul()(evals[19], evals[22]);
    signal tmp_121[3] <== [tmp_39[0] - tmp_40[0], tmp_39[1] - tmp_40[1], tmp_39[2] - tmp_40[2]];
    signal tmp_122[3] <== evals[23];
    signal tmp_123[3] <== evals[24];
    signal tmp_124[3] <== CMul()(evals[23], evals[24]);
    signal tmp_125[3] <== evals[25];
    signal tmp_126[3] <== evals[26];
    signal tmp_127[3] <== evals[27];
    signal tmp_128[3] <== evals[28];
    signal tmp_41[3] <== CMul()(challenges0, tmp_125);
    signal tmp_42[3] <== [tmp_41[0] + tmp_126[0], tmp_41[1] + tmp_126[1], tmp_41[2] + tmp_126[2]];
    signal tmp_43[3] <== CMul()(challenges0, tmp_42);
    signal tmp_44[3] <== [tmp_43[0] + tmp_127[0], tmp_43[1] + tmp_127[1], tmp_43[2] + tmp_127[2]];
    signal tmp_45[3] <== [tmp_44[0] - challenges1[0], tmp_44[1] - challenges1[1], tmp_44[2] - challenges1[2]];
    signal tmp_46[3] <== CMul()(tmp_45, tmp_128);
    signal tmp_129[3] <== [tmp_46[0] + challenges1[0], tmp_46[1] + challenges1[1], tmp_46[2] + challenges1[2]];
    signal tmp_130[3] <== evals[29];
    signal tmp_131[3] <== evals[30];
    signal tmp_132[3] <== evals[31];
    signal tmp_133[3] <== evals[32];
    signal tmp_134[3] <== evals[33];
    signal tmp_47[3] <== CMul()(challenges0, tmp_131);
    signal tmp_48[3] <== [tmp_47[0] + tmp_132[0], tmp_47[1] + tmp_132[1], tmp_47[2] + tmp_132[2]];
    signal tmp_49[3] <== CMul()(challenges0, tmp_48);
    signal tmp_50[3] <== [tmp_49[0] + tmp_133[0], tmp_49[1] + tmp_133[1], tmp_49[2] + tmp_133[2]];
    signal tmp_51[3] <== [tmp_50[0] - challenges1[0], tmp_50[1] - challenges1[1], tmp_50[2] - challenges1[2]];
    signal tmp_52[3] <== CMul()(tmp_51, tmp_134);
    signal tmp_135[3] <== [tmp_52[0] + challenges1[0], tmp_52[1] + challenges1[1], tmp_52[2] + challenges1[2]];
    signal tmp_136[3] <== evals[34];
    signal tmp_53[3] <== CMul()(challenges3, challenges7);
    signal tmp_54[3] <== [tmp_136[0] + tmp_53[0], tmp_136[1] + tmp_53[1], tmp_136[2] + tmp_53[2]];
    signal tmp_137[3] <== [tmp_54[0] + challenges2[0], tmp_54[1] + challenges2[1], tmp_54[2] + challenges2[2]];
    signal tmp_138[3] <== evals[35];
    signal tmp_55[3] <== [challenges3[0] * 12275445934081160404, challenges3[1] * 12275445934081160404, challenges3[2] * 12275445934081160404];
    signal tmp_56[3] <== CMul()(tmp_55, challenges7);
    signal tmp_57[3] <== [tmp_138[0] + tmp_56[0], tmp_138[1] + tmp_56[1], tmp_138[2] + tmp_56[2]];
    signal tmp_58[3] <== [tmp_57[0] + challenges2[0], tmp_57[1] + challenges2[1], tmp_57[2] + challenges2[2]];
    signal tmp_139[3] <== CMul()(tmp_137, tmp_58);
    signal tmp_140[3] <== evals[36];
    signal tmp_141[3] <== evals[37];
    signal tmp_59[3] <== CMul()(challenges3, tmp_141);
    signal tmp_60[3] <== [tmp_136[0] + tmp_59[0], tmp_136[1] + tmp_59[1], tmp_136[2] + tmp_59[2]];
    signal tmp_142[3] <== [tmp_60[0] + challenges2[0], tmp_60[1] + challenges2[1], tmp_60[2] + challenges2[2]];
    signal tmp_143[3] <== evals[38];
    signal tmp_61[3] <== CMul()(challenges3, tmp_143);
    signal tmp_62[3] <== [tmp_138[0] + tmp_61[0], tmp_138[1] + tmp_61[1], tmp_138[2] + tmp_61[2]];
    signal tmp_63[3] <== [tmp_62[0] + challenges2[0], tmp_62[1] + challenges2[1], tmp_62[2] + challenges2[2]];
    signal tmp_144[3] <== CMul()(tmp_142, tmp_63);
    signal tmp_145[3] <== evals[39];
    signal tmp_64_mul[3] <== CMul()(challenges4, tmp_99);
    signal tmp_64[3] <== [tmp_64_mul[0] + tmp_101[0], tmp_64_mul[1] + tmp_101[1], tmp_64_mul[2] + tmp_101[2]];
    signal tmp_65_mul[3] <== CMul()(challenges4, tmp_64);
    signal tmp_65[3] <== [tmp_65_mul[0] + tmp_102[0], tmp_65_mul[1] + tmp_102[1], tmp_65_mul[2] + tmp_102[2]];
    signal tmp_66_mul[3] <== CMul()(challenges4, tmp_65);
    signal tmp_66[3] <== [tmp_66_mul[0] + tmp_103[0], tmp_66_mul[1] + tmp_103[1], tmp_66_mul[2] + tmp_103[2]];
    signal tmp_67_mul[3] <== CMul()(challenges4, tmp_66);
    signal tmp_67[3] <== [tmp_67_mul[0] + tmp_104[0], tmp_67_mul[1] + tmp_104[1], tmp_67_mul[2] + tmp_104[2]];
    signal tmp_68_mul[3] <== CMul()(challenges4, tmp_67);
    signal tmp_68[3] <== [tmp_68_mul[0] + tmp_105[0], tmp_68_mul[1] + tmp_105[1], tmp_68_mul[2] + tmp_105[2]];
    signal tmp_69_mul[3] <== CMul()(challenges4, tmp_68);
    signal tmp_69[3] <== [tmp_69_mul[0] + tmp_107[0], tmp_69_mul[1] + tmp_107[1], tmp_69_mul[2] + tmp_107[2]];
    signal tmp_70_mul[3] <== CMul()(challenges4, tmp_69);
    signal tmp_70[3] <== [tmp_70_mul[0] + tmp_108[0], tmp_70_mul[1] + tmp_108[1], tmp_70_mul[2] + tmp_108[2]];
    signal tmp_71_mul[3] <== CMul()(challenges4, tmp_70);
    signal tmp_71[3] <== [tmp_71_mul[0] + tmp_119[0], tmp_71_mul[1] + tmp_119[1], tmp_71_mul[2] + tmp_119[2]];
    signal tmp_72_mul[3] <== CMul()(challenges4, tmp_71);
    signal tmp_72[3] <== [tmp_72_mul[0] + tmp_120[0], tmp_72_mul[1] + tmp_120[1], tmp_72_mul[2] + tmp_120[2]];
    signal tmp_73_mul[3] <== CMul()(challenges4, tmp_72);
    signal tmp_73[3] <== [tmp_73_mul[0] + tmp_121[0], tmp_73_mul[1] + tmp_121[1], tmp_73_mul[2] + tmp_121[2]];
    signal tmp_74_mul[3] <== CMul()(tmp_122, challenges0);
    signal tmp_74[3] <== [tmp_74_mul[0] + tmp_123[0], tmp_74_mul[1] + tmp_123[1], tmp_74_mul[2] + tmp_123[2]];
    signal tmp_75_mul[3] <== CMul()(tmp_74, challenges0);
    signal tmp_75[3] <== [tmp_75_mul[0] + tmp_124[0], tmp_75_mul[1] + tmp_124[1], tmp_75_mul[2] + tmp_124[2]];
    signal tmp_76[3] <== [tmp_75[0] - tmp_129[0], tmp_75[1] - tmp_129[1], tmp_75[2] - tmp_129[2]];
    signal tmp_77_mul[3] <== CMul()(tmp_76, tmp_130);
    signal tmp_77[3] <== [tmp_77_mul[0] + tmp_129[0], tmp_77_mul[1] + tmp_129[1], tmp_77_mul[2] + tmp_129[2]];
    signal tmp_78[3] <== [tmp_77[0] - evals[40][0], tmp_77[1] - evals[40][1], tmp_77[2] - evals[40][2]];
    signal tmp_79_mul[3] <== CMul()(challenges4, tmp_73);
    signal tmp_79[3] <== [tmp_79_mul[0] + tmp_78[0], tmp_79_mul[1] + tmp_78[1], tmp_79_mul[2] + tmp_78[2]];
    signal tmp_80[3] <== [evals[40][0] + challenges2[0], evals[40][1] + challenges2[1], evals[40][2] + challenges2[2]];
    signal tmp_81[3] <== [1 + challenges3[0], challenges3[1],  challenges3[2]];
    signal tmp_82_mul[3] <== CMul()(tmp_135, challenges3);
    signal tmp_82[3] <== [tmp_82_mul[0] + tmp_129[0], tmp_82_mul[1] + tmp_129[1], tmp_82_mul[2] + tmp_129[2]];
    signal tmp_83_mul[3] <== CMul()(challenges2, tmp_81);
    signal tmp_83[3] <== [tmp_83_mul[0] + tmp_82[0], tmp_83_mul[1] + tmp_82[1], tmp_83_mul[2] + tmp_82[2]];
    signal tmp_84[3] <== CMul()(tmp_80, tmp_83);
    signal tmp_85[3] <== [1 + challenges3[0], challenges3[1],  challenges3[2]];
    signal tmp_86[3] <== CMul()(tmp_84, tmp_85);
    signal tmp_87[3] <== [tmp_86[0] - evals[12][0], tmp_86[1] - evals[12][1], tmp_86[2] - evals[12][2]];
    signal tmp_88_mul[3] <== CMul()(challenges4, tmp_79);
    signal tmp_88[3] <== [tmp_88_mul[0] + tmp_87[0], tmp_88_mul[1] + tmp_87[1], tmp_88_mul[2] + tmp_87[2]];
    signal tmp_89[3] <== [challenges3[0] * 4756475762779100925, challenges3[1] * 4756475762779100925, challenges3[2] * 4756475762779100925];
    signal tmp_90_mul[3] <== CMul()(tmp_89, challenges7);
    signal tmp_90[3] <== [tmp_90_mul[0] + tmp_140[0], tmp_90_mul[1] + tmp_140[1], tmp_90_mul[2] + tmp_140[2]];
    signal tmp_91[3] <== [tmp_90[0] + challenges2[0], tmp_90[1] + challenges2[1], tmp_90[2] + challenges2[2]];
    signal tmp_92[3] <== CMul()(tmp_139, tmp_91);
    signal tmp_93[3] <== [tmp_92[0] - evals[22][0], tmp_92[1] - evals[22][1], tmp_92[2] - evals[22][2]];
    signal tmp_94_mul[3] <== CMul()(challenges4, tmp_88);
    signal tmp_94[3] <== [tmp_94_mul[0] + tmp_93[0], tmp_94_mul[1] + tmp_93[1], tmp_94_mul[2] + tmp_93[2]];
    signal tmp_95_mul[3] <== CMul()(challenges3, tmp_145);
    signal tmp_95[3] <== [tmp_95_mul[0] + tmp_140[0], tmp_95_mul[1] + tmp_140[1], tmp_95_mul[2] + tmp_140[2]];
    signal tmp_96[3] <== [tmp_95[0] + challenges2[0], tmp_95[1] + challenges2[1], tmp_95[2] + challenges2[2]];
    signal tmp_97[3] <== CMul()(tmp_144, tmp_96);
    signal tmp_98[3] <== [tmp_97[0] - evals[21][0], tmp_97[1] - evals[21][1], tmp_97[2] - evals[21][2]];
    signal tmp_146_mul[3] <== CMul()(challenges4, tmp_94);
    signal tmp_146[3] <== [tmp_146_mul[0] + tmp_98[0], tmp_146_mul[1] + tmp_98[1], tmp_146_mul[2] + tmp_98[2]];

    signal xAcc[2][3]; //Stores, at each step, x^i evaluated at z
    signal qStep[1][3]; // Stores the evaluations of Q_i
    signal qAcc[2][3]; // Stores the accumulate sum of Q_i

    // Note: Each Qi has degree < n. qDeg determines the number of polynomials of degree < n needed to define Q
    // Calculate Q(X) = Q1(X) + X^n*Q2(X) + X^(2n)*Q3(X) + ..... X^((qDeg-1)n)*Q(X) evaluated at z 
    for (var i=0; i< 2; i++) {
        if (i==0) {
            xAcc[0] <== [1, 0, 0];
            qAcc[0] <== evals[41+i];
        } else {
            xAcc[i] <== CMul()(xAcc[i-1], zMul[7]);
            qStep[i-1] <== CMul()(xAcc[i], evals[41+i]);
            qAcc[i][0] <== qAcc[i-1][0] + qStep[i-1][0];
            qAcc[i][1] <== qAcc[i-1][1] + qStep[i-1][1];
            qAcc[i][2] <== qAcc[i-1][2] + qStep[i-1][2];
        }
    }

    signal QZ[3] <== CMul()(qAcc[1], Z); // Stores the result of multiplying Q(X) per Zg(X)

    // Final Verification. Check that Q(X)*Zg(X) = sum of linear combination of q_i, which is stored at tmp_146 
    enable * (tmp_146[0] - QZ[0]) === 0;
    enable * (tmp_146[1] - QZ[1]) === 0;
    enable * (tmp_146[2] - QZ[2]) === 0;
}

/* 
    Verify that the initial FRI polynomial, which is the lineal combination of the committed polynomials
    during the STARK phases, is built properly
*/
template parallel VerifyQuery(currStepBits, nextStepBits) {
    var nextStep = currStepBits - nextStepBits; 
    signal input ys[9];
    signal input challenges5[3];
    signal input challenges6[3];
    signal input challenges7[3];
    signal input evals[43][3];
    signal input tree1[15];
    signal input tree2[6];
    signal input tree3[21];
    signal input treeQ[6];
    signal input consts[9];
    signal input s0_vals[1<< nextStep][3];
    signal input enable;
    


    // Map the s0_vals so that they are converted either into single vars (if they belong to base field) or arrays of 3 elements (if 
    // they belong to the extended field). 
    component mapValues = MapValues();
    mapValues.vals1 <== tree1;
    mapValues.vals2 <== tree2;
    mapValues.vals3 <== tree3;
    mapValues.valsQ <== treeQ;

    signal xacc[9];
    xacc[0] <== ys[0]*(7 * roots(9)-7) + 7;
    for (var i=1; i<9; i++) {
        xacc[i] <== xacc[i-1] * ( ys[i]*(roots(9 - i) - 1) +1);
    }

    signal xDivXSubXi[2][3];

    signal den0inv[3] <== CInv()([xacc[8] - 1 * challenges7[0], - 1 * challenges7[1], - 1 * challenges7[2]]);
    xDivXSubXi[0] <== [xacc[8] * den0inv[0], xacc[8] * den0inv[1],  xacc[8] * den0inv[2]];
    signal den1inv[3] <== CInv()([xacc[8] - 1 * roots(8) * challenges7[0], - 1 * roots(8) * challenges7[1], - 1 * roots(8) * challenges7[2]]);
    xDivXSubXi[1] <== [xacc[8] * den1inv[0], xacc[8] * den1inv[1],  xacc[8] * den1inv[2]];

    signal tmp_0[3] <== [mapValues.tree1_1 - evals[0][0], -evals[0][1], -evals[0][2]];
    signal tmp_1[3] <== [mapValues.tree1_0 - evals[4][0], -evals[4][1], -evals[4][2]];
    signal tmp_2_mul[3] <== CMul()(tmp_0, challenges6);
    signal tmp_2[3] <== [tmp_2_mul[0] + tmp_1[0], tmp_2_mul[1] + tmp_1[1], tmp_2_mul[2] + tmp_1[2]];
    signal tmp_3[3] <== [mapValues.tree2_0[0] - evals[10][0], mapValues.tree2_0[1] - evals[10][1], mapValues.tree2_0[2] - evals[10][2]];
    signal tmp_4_mul[3] <== CMul()(tmp_2, challenges6);
    signal tmp_4[3] <== [tmp_4_mul[0] + tmp_3[0], tmp_4_mul[1] + tmp_3[1], tmp_4_mul[2] + tmp_3[2]];
    signal tmp_5[3] <== [mapValues.tree3_0[0] - evals[11][0], mapValues.tree3_0[1] - evals[11][1], mapValues.tree3_0[2] - evals[11][2]];
    signal tmp_6_mul[3] <== CMul()(tmp_4, challenges6);
    signal tmp_6[3] <== [tmp_6_mul[0] + tmp_5[0], tmp_6_mul[1] + tmp_5[1], tmp_6_mul[2] + tmp_5[2]];
    signal tmp_7[3] <== [mapValues.tree3_1[0] - evals[18][0], mapValues.tree3_1[1] - evals[18][1], mapValues.tree3_1[2] - evals[18][2]];
    signal tmp_8_mul[3] <== CMul()(tmp_6, challenges6);
    signal tmp_8[3] <== [tmp_8_mul[0] + tmp_7[0], tmp_8_mul[1] + tmp_7[1], tmp_8_mul[2] + tmp_7[2]];
    signal tmp_9[3] <== [mapValues.tree3_2[0] - evals[20][0], mapValues.tree3_2[1] - evals[20][1], mapValues.tree3_2[2] - evals[20][2]];
    signal tmp_10_mul[3] <== CMul()(tmp_8, challenges6);
    signal tmp_10[3] <== [tmp_10_mul[0] + tmp_9[0], tmp_10_mul[1] + tmp_9[1], tmp_10_mul[2] + tmp_9[2]];
    signal tmp_11[3] <== [mapValues.tree1_13 - evals[24][0], -evals[24][1], -evals[24][2]];
    signal tmp_12_mul[3] <== CMul()(tmp_10, challenges6);
    signal tmp_12[3] <== [tmp_12_mul[0] + tmp_11[0], tmp_12_mul[1] + tmp_11[1], tmp_12_mul[2] + tmp_11[2]];
    signal tmp_13[3] <== [consts[7] - evals[30][0], -evals[30][1], -evals[30][2]];
    signal tmp_14_mul[3] <== CMul()(tmp_12, challenges6);
    signal tmp_14[3] <== [tmp_14_mul[0] + tmp_13[0], tmp_14_mul[1] + tmp_13[1], tmp_14_mul[2] + tmp_13[2]];
    signal tmp_15[3] <== [consts[8] - evals[31][0], -evals[31][1], -evals[31][2]];
    signal tmp_16_mul[3] <== CMul()(tmp_14, challenges6);
    signal tmp_16[3] <== [tmp_16_mul[0] + tmp_15[0], tmp_16_mul[1] + tmp_15[1], tmp_16_mul[2] + tmp_15[2]];
    signal tmp_17[3] <== [mapValues.tree1_14 - evals[32][0], -evals[32][1], -evals[32][2]];
    signal tmp_18_mul[3] <== CMul()(tmp_16, challenges6);
    signal tmp_18[3] <== [tmp_18_mul[0] + tmp_17[0], tmp_18_mul[1] + tmp_17[1], tmp_18_mul[2] + tmp_17[2]];
    signal tmp_19[3] <== [consts[6] - evals[33][0], -evals[33][1], -evals[33][2]];
    signal tmp_20_mul[3] <== CMul()(tmp_18, challenges6);
    signal tmp_20[3] <== [tmp_20_mul[0] + tmp_19[0], tmp_20_mul[1] + tmp_19[1], tmp_20_mul[2] + tmp_19[2]];
    signal tmp_21[3] <== CMul()(tmp_20, xDivXSubXi[1]);
    signal tmp_22[3] <== [mapValues.tree1_1 - evals[0][0], -evals[0][1], -evals[0][2]];
    signal tmp_23[3] <== [mapValues.tree1_0 - evals[4][0], -evals[4][1], -evals[4][2]];
    signal tmp_24_mul[3] <== CMul()(tmp_22, challenges6);
    signal tmp_24[3] <== [tmp_24_mul[0] + tmp_23[0], tmp_24_mul[1] + tmp_23[1], tmp_24_mul[2] + tmp_23[2]];
    signal tmp_25[3] <== [mapValues.tree2_0[0] - evals[10][0], mapValues.tree2_0[1] - evals[10][1], mapValues.tree2_0[2] - evals[10][2]];
    signal tmp_26_mul[3] <== CMul()(tmp_24, challenges6);
    signal tmp_26[3] <== [tmp_26_mul[0] + tmp_25[0], tmp_26_mul[1] + tmp_25[1], tmp_26_mul[2] + tmp_25[2]];
    signal tmp_27[3] <== [mapValues.tree3_0[0] - evals[11][0], mapValues.tree3_0[1] - evals[11][1], mapValues.tree3_0[2] - evals[11][2]];
    signal tmp_28_mul[3] <== CMul()(tmp_26, challenges6);
    signal tmp_28[3] <== [tmp_28_mul[0] + tmp_27[0], tmp_28_mul[1] + tmp_27[1], tmp_28_mul[2] + tmp_27[2]];
    signal tmp_29[3] <== [mapValues.tree3_1[0] - evals[18][0], mapValues.tree3_1[1] - evals[18][1], mapValues.tree3_1[2] - evals[18][2]];
    signal tmp_30_mul[3] <== CMul()(tmp_28, challenges6);
    signal tmp_30[3] <== [tmp_30_mul[0] + tmp_29[0], tmp_30_mul[1] + tmp_29[1], tmp_30_mul[2] + tmp_29[2]];
    signal tmp_31[3] <== [mapValues.tree3_2[0] - evals[20][0], mapValues.tree3_2[1] - evals[20][1], mapValues.tree3_2[2] - evals[20][2]];
    signal tmp_32_mul[3] <== CMul()(tmp_30, challenges6);
    signal tmp_32[3] <== [tmp_32_mul[0] + tmp_31[0], tmp_32_mul[1] + tmp_31[1], tmp_32_mul[2] + tmp_31[2]];
    signal tmp_33[3] <== [mapValues.tree1_13 - evals[24][0], -evals[24][1], -evals[24][2]];
    signal tmp_34_mul[3] <== CMul()(tmp_32, challenges6);
    signal tmp_34[3] <== [tmp_34_mul[0] + tmp_33[0], tmp_34_mul[1] + tmp_33[1], tmp_34_mul[2] + tmp_33[2]];
    signal tmp_35[3] <== [consts[7] - evals[30][0], -evals[30][1], -evals[30][2]];
    signal tmp_36_mul[3] <== CMul()(tmp_34, challenges6);
    signal tmp_36[3] <== [tmp_36_mul[0] + tmp_35[0], tmp_36_mul[1] + tmp_35[1], tmp_36_mul[2] + tmp_35[2]];
    signal tmp_37[3] <== [consts[8] - evals[31][0], -evals[31][1], -evals[31][2]];
    signal tmp_38_mul[3] <== CMul()(tmp_36, challenges6);
    signal tmp_38[3] <== [tmp_38_mul[0] + tmp_37[0], tmp_38_mul[1] + tmp_37[1], tmp_38_mul[2] + tmp_37[2]];
    signal tmp_39[3] <== [mapValues.tree1_14 - evals[32][0], -evals[32][1], -evals[32][2]];
    signal tmp_40_mul[3] <== CMul()(tmp_38, challenges6);
    signal tmp_40[3] <== [tmp_40_mul[0] + tmp_39[0], tmp_40_mul[1] + tmp_39[1], tmp_40_mul[2] + tmp_39[2]];
    signal tmp_41[3] <== [consts[6] - evals[33][0], -evals[33][1], -evals[33][2]];
    signal tmp_42_mul[3] <== CMul()(tmp_40, challenges6);
    signal tmp_42[3] <== [tmp_42_mul[0] + tmp_41[0], tmp_42_mul[1] + tmp_41[1], tmp_42_mul[2] + tmp_41[2]];
    signal tmp_43[3] <== CMul()(tmp_42, xDivXSubXi[1]);
    signal tmp_44_mul[3] <== CMul()(challenges5, tmp_21);
    signal tmp_44[3] <== [tmp_44_mul[0] + tmp_43[0], tmp_44_mul[1] + tmp_43[1], tmp_44_mul[2] + tmp_43[2]];

    var queryVals[3] = [tmp_44[0], tmp_44[1], tmp_44[2]];

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
    signal input vals1[15];
    signal input vals2[6];
    signal input vals3[21];
    signal input valsQ[6];

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
    signal output tree1_12;
    signal output tree1_13;
    signal output tree1_14;
    signal output tree2_0[3];
    signal output tree2_1[3];
    signal output tree3_0[3];
    signal output tree3_1[3];
    signal output tree3_2[3];
    signal output tree3_3[3];
    signal output tree3_4[3];
    signal output tree3_5[3];
    signal output tree3_6[3];
    signal output treeQ_0[3];
    signal output treeQ_1[3];

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
    tree1_12 <== vals1[12];
    tree1_13 <== vals1[13];
    tree1_14 <== vals1[14];
    tree2_0 <== [vals2[0],vals2[1] , vals2[2]];
    tree2_1 <== [vals2[3],vals2[4] , vals2[5]];
    tree3_0 <== [vals3[0],vals3[1] , vals3[2]];
    tree3_1 <== [vals3[3],vals3[4] , vals3[5]];
    tree3_2 <== [vals3[6],vals3[7] , vals3[8]];
    tree3_3 <== [vals3[9],vals3[10] , vals3[11]];
    tree3_4 <== [vals3[12],vals3[13] , vals3[14]];
    tree3_5 <== [vals3[15],vals3[16] , vals3[17]];
    tree3_6 <== [vals3[18],vals3[19] , vals3[20]];
    treeQ_0 <== [valsQ[0],valsQ[1] , valsQ[2]];
    treeQ_1 <== [valsQ[3],valsQ[4] , valsQ[5]];
}

template parallel VerifyFinalPol() {
    ///////
    // Check Degree last pol
    ///////
    signal input finalPol[8][3];
    signal input enable;
    
    // Calculate the IFFT to get the coefficients of finalPol 
    signal lastIFFT[8][3] <== FFT(3, 3, 1)(finalPol);

    // Check that the degree of the final polynomial is bounded by the degree defined in the last step of the folding
    // This means ?????? in terms of IFFT
    for (var k= 4; k< 8; k++) {
        for (var e=0; e<3; e++) {
            enable * lastIFFT[k][e] === 0;
        }
    }
    
    // The coefficients of lower degree can have any value
    for (var k= 0; k < 4; k++) {
        _ <== lastIFFT[k];
    }
}
template StarkVerifier() {
    signal input publics[3]; // constant polynomials
    signal input root1[4]; // Merkle tree root of the evaluations of all trace polynomials
    signal input root2[4]; // Merkle tree root of the evaluations of polynomials h1 and h2 used for the plookup
    signal input root3[4]; // Merkle tree root of the evaluations of the grand product polynomials (Z) 
    signal input rootQ[4]; // Merkle tree root of the evaluations of the quotient Q1 and Q2 polynomials

    // Notice that root2 and root3 can be zero depending on the STARK being verified 

    signal rootC[4] <== [15547272193149522286,9194771220869109735,14340868669193233465,5317326090416537886 ]; // Merkle tree root of the evaluations of constant polynomials

    signal input evals[43][3]; // Evaluations of the set polynomials at a challenge value z and gz

    // Leaves values of the merkle tree used to check all the queries
    signal input s0_vals1[8][15];
    signal input s0_vals2[8][6];
    signal input s0_vals3[8][21];
    signal input s0_valsQ[8][6];
    signal input s0_valsC[8][9];

    // Merkle proofs for each of the evaluations
    signal input s0_siblings1[8][9][4];
    signal input s0_siblings2[8][9][4];
    signal input s0_siblings3[8][9][4];
    signal input s0_siblingsQ[8][9][4];
    signal input s0_siblingsC[8][9][4];

    // Contains the root of the original polynomial and all the intermediate FRI polynomials except for the last step
    signal input s1_root[4];
    signal input s2_root[4];

    // For each intermediate FRI polynomial and the last one, we store at vals the values needed to check the queries.
    // Given a query r,  the verifier needs b points to check it out, being b = 2^u, where u is the difference between two consecutive step
    // and the sibling paths for each query.
    signal input s1_vals[8][24];
    signal input s1_siblings[8][6][4];
    signal input s2_vals[8][24];
    signal input s2_siblings[8][3][4];

    // Evaluations of the final FRI polynomial over a set of points of size bounded its degree
    signal input finalPol[8][3];

    signal enable <== 1;

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

    // Each of the queries values represented in binary
    signal ys[8][9];


    ///////////
    // Calculate challenges, s_i special and queries
    ///////////

    (challenges,ys,s0_specialX,s1_specialX,s2_specialX) <== Transcript()(publics,root1,root2,root3,rootQ,evals, s1_root,s2_root,finalPol);

    ///////////
    // Check constraints polynomial in the evaluation point
    ///////////

 
    VerifyEvaluations()(challenges[0], challenges[1], challenges[2], challenges[3], challenges[4], challenges[7], evals, publics, enable);

    ///////////
    // Preprocess s_i vals
    ///////////

    // Preprocess the s_i vals given as inputs so that we can use anonymous components.
    // Two different processings are done:
    // For s0_vals, the arrays are transposed so that they fit MerkleHash template
    // For (s_i)_vals, the values are passed all together in a single array of length nVals*3. We convert them to vals[nVals][3]
    var s0_vals1_p[8][15][1];
    var s0_vals2_p[8][6][1];
    var s0_vals3_p[8][21][1];
    var s0_valsQ_p[8][6][1];
    var s0_valsC_p[8][9][1];
    var s1_vals_p[8][8][3]; 
    var s2_vals_p[8][8][3]; 

    for (var q=0; q<8; q++) {
        // Preprocess vals for the initial FRI polynomial
        for (var i = 0; i < 15; i++) {
            s0_vals1_p[q][i][0] = s0_vals1[q][i];
        }
        for (var i = 0; i < 6; i++) {
            s0_vals2_p[q][i][0] = s0_vals2[q][i];
        }
        for (var i = 0; i < 21; i++) {
            s0_vals3_p[q][i][0] = s0_vals3[q][i];
        }
        for (var i = 0; i < 6; i++) {
            s0_valsQ_p[q][i][0] = s0_valsQ[q][i];
        }
        for (var i = 0; i < 9; i++) {
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
        }
    }
    
    ///////////
    // Verify Merkle Roots
    ///////////

    //Calculate merkle root for s0 vals
    for (var q=0; q<8; q++) {
        
        VerifyMerkleHash(1, 15, 512)(s0_vals1_p[q], s0_siblings1[q], ys[q], root1, enable);
    }
    for (var q=0; q<8; q++) {
        VerifyMerkleHash(1, 6, 512)(s0_vals2_p[q], s0_siblings2[q], ys[q], root2, enable);
    }
    for (var q=0; q<8; q++) {
        VerifyMerkleHash(1, 21, 512)(s0_vals3_p[q], s0_siblings3[q], ys[q], root3, enable);
    }
    for (var q=0; q<8; q++) {
        VerifyMerkleHash(1, 6, 512)(s0_valsQ_p[q], s0_siblingsQ[q], ys[q], rootQ, enable);
    }

    for (var q=0; q<8; q++) {
        VerifyMerkleHash(1, 9, 512)(s0_valsC_p[q], s0_siblingsC[q], ys[q], rootC, enable);                                    
    }
    for (var q=0; q<8; q++) {
        // Calculate merkle root for s1 vals
        var s1_keys_merkle[6];
        for(var i = 0; i < 6; i++) { s1_keys_merkle[i] = ys[q][i]; }
        VerifyMerkleHash(3, 8, 64)(s1_vals_p[q], s1_siblings[q], s1_keys_merkle, s1_root, enable);
    }
    for (var q=0; q<8; q++) {
        // Calculate merkle root for s2 vals
        var s2_keys_merkle[3];
        for(var i = 0; i < 3; i++) { s2_keys_merkle[i] = ys[q][i]; }
        VerifyMerkleHash(3, 8, 8)(s2_vals_p[q], s2_siblings[q], s2_keys_merkle, s2_root, enable);
    }
        

    ///////////
    // Verify FRI query
    ///////////

    for (var q=0; q<8; q++) {

    // After checking that all merkle roots are properly built, the query and the intermediate 
    // polynomials need to be verified 
        // Verify that the query is properly constructed. This is done by checking that the linear combination of the set of 
        // polynomials committed during the different rounds evaluated at z matches with the commitment of the FRI polynomial (unsure)
        VerifyQuery(9, 6)(ys[q], challenges[5], challenges[6], challenges[7], evals, s0_vals1[q], s0_vals2[q], s0_vals3[q], s0_valsQ[q], s0_valsC[q], s1_vals_p[q], enable);

        ///////////
        // Verify FRI construction
        ///////////

        // For each folding level we need to check that the polynomial is properly constructed
        // Remember that if the step between polynomials is b = 2^l, the next polynomial p_(i+1) will have degree deg(p_i) / b

        // Check S1
        var s1_ys[6];
        for(var i = 0; i < 6; i++) { s1_ys[i] = ys[q][i]; }  
        VerifyFRI(9, 9, 6, 3, 2635249152773512046)(s1_ys, s1_specialX, s1_vals_p[q], s2_vals_p[q], enable);

        // Check S2
        var s2_ys[3];
        for(var i = 0; i < 3; i++) { s2_ys[i] = ys[q][i]; }  
        VerifyFRI(9, 6, 3, 0, 12421013511830570338)(s2_ys, s2_specialX, s2_vals_p[q], finalPol, enable);
    }

    VerifyFinalPol()(finalPol, enable);
}
    
component main {public [publics]}= StarkVerifier();
