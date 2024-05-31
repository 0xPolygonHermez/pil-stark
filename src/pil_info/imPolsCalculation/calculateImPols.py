#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Tue Sep 19 11:56:27 2023

@author: clara
"""


import smt_generation_pil_2
import json
  

    # The degree is the maximum of the list    
def mix_degrees(deg_1, deg_2, deg_3):
    result = []
    for d in deg_3:
        result.append(d)
    for i in deg_1:
        for j in deg_2:
            result.append((i, j))
    return result


def get_used_expressions(expr, expressions, used_expressions):
    type_union = {"add", "sub", "mul"}
    
    if expr["op"] in type_union:
        values = expr["values"] 
        for e in values:
            get_used_expressions(e, expressions, used_expressions)
    elif expr["op"] == "exp":
        if not int(expr["id"]) in used_expressions:
            used_expressions.add(int(expr["id"]))
            get_used_expressions(expressions[int(expr["id"])], expressions, used_expressions)

    

def parse_expression_pil(expression):
    # result: Possible max values
    result = 0
    type_add = {"add", "sub", "neg"}
    
    if expression["op"] in type_add:
        result = []
        for e in expression["values"]:
            result.append(parse_expression_pil(e))
    elif expression["op"] == "mul":
        values = expression["values"] 
        result = (parse_expression_pil(values[0]), parse_expression_pil(values[1]))
    elif expression["op"] == "exp":
        result = "exp_" + str(expression["id"])
    elif expression["op"] == "challenge":
        result = 0
    else:
        result = int(expression["expDeg"])
    return result 


def minimize_expression_pil(tree, zero_expressions, one_expressions):
    if type(tree) == list:
        # Case addition -> we take the maximum of the degrees
        max_value = 0
        needs_consider = []
        for expr in tree:
            new_value = minimize_expression_pil(expr, zero_expressions, one_expressions)
            if type(new_value) == int:
                if new_value > max_value:
                    max_value = new_value
            elif type(new_value) == list:
                needs_consider = needs_consider + new_value
            else:
                needs_consider.append(new_value)
        if len(needs_consider) == 0:
            needs_consider = max_value
        else:
            if max_value > 0:
                needs_consider.append(max_value)
            if len(needs_consider) == 1:    
                needs_consider = needs_consider[0]
        return needs_consider
    elif type(tree) == tuple:
        # Case multiplication: in case both number we add the degrees
        new_value_a = minimize_expression_pil(tree[0], zero_expressions, one_expressions)
        new_value_b = minimize_expression_pil(tree[1], zero_expressions, one_expressions)
        
        if type(new_value_a) == int and type(new_value_b) == int:
            return new_value_a + new_value_b
        else:
            if new_value_a == 0:
                return new_value_b
            elif new_value_b == 0:
                return new_value_a
            else:
                return (new_value_a, new_value_b)
    elif type(tree) == int:
        return tree
    else:
        #Case expression
        if tree in zero_expressions:
            return 0
        elif tree in one_expressions: 
            return 1
        else:
            return tree

# TODO: Check this function as it is not exactly the same as the one in JS
def calculate_added_cols(expressions, used_variables, q_deg, q_dim):
    q_cols = q_deg * q_dim
    im_cols = 0
    for v in used_variables:
        im_cols += expressions[v]["dim"]
    added_cols = q_cols + im_cols
    print("maxDeg: " + str(q_deg + 1) + ", nIm: " + str(len(used_variables)) + ", d: " + str(q_deg) + ", addedCols in the basefield: " + str(added_cols) + " (" + str(q_cols) + " + " + str(im_cols) + ")")
    return added_cols


def rebuild_expression(exp, expressions, used_expressions, new_map_expressions):
    
    type_operation = {"add", "sub", "mul"}
    new_expression = {}
    if exp["op"] in type_operation:
        new_expression["op"] = exp["op"]
        new_values = []
        for e in exp["values"]:
            new_values.append(rebuild_expression(e, expressions, used_expressions, new_map_expressions))
        new_expression["values"] = new_values
    elif exp["op"] == "exp":
        id_expr = int(exp["id"])
        if id_expr in used_expressions:
            new_expression = exp
        else:
            new_expression = new_map_expressions[id_expr]
    else:
        new_expression = exp
    return new_expression 


import sys
sys.setrecursionlimit(10000)

import argparse
parser = argparse.ArgumentParser()

parser.add_argument("filein", help=".json file including the tree structure",
                    type=str)
parser.add_argument("fileout", help= "Output file with the new expressions")


args=parser.parse_args()

# Opening JSON file
f = open(args.filein)
data = json.load(f)

file = open(args.fileout, "w")

expressions = data["expressions"]
cExpId = int(data["cExpId"])
degree = int(data["maxDeg"])
q_dim = int(data["qDim"])
used_expressions = {cExpId}
get_used_expressions(expressions[cExpId], expressions, used_expressions)
all_used = len(used_expressions) == len(expressions)

number_intermediates = len(expressions)

from z3 import *


i = 0
one_expressions = set()
zero_expressions = set()

trees = {}

for e in expressions:
    if all_used or i in used_expressions:
        tree = parse_expression_pil(e)
    
        #print("Printing tree " + str(i))
        #print(tree)
        #print("---------")

        new_tree = minimize_expression_pil(tree, zero_expressions, one_expressions)
        if new_tree == 0:
            zero_expressions.add("exp_" + str(i))
        if new_tree == 1:
            one_expressions.add("exp_" + str(i))
        #print(new_tree)
        #print("--------------------")
    
        if new_tree != 0 and new_tree != 1:
            trees[i] = new_tree
    i = i + 1

min_value = -1
optimal_degree = -1
min_vars = len(expressions)
possible_degree = 2

print("*** Considering degrees between 2 and " + str(degree) + " ***")
print() 

while min_vars != 0 and possible_degree <= degree:
    # Try with degree possible_degree, declare smt problem and try to solve it
    print("--- Using degree " + str(possible_degree) + " ---")
    solver = Optimize()
    smt_generation_pil_2.declare_keep_variables(number_intermediates, possible_degree, solver)
    for (index, value) in trees.items():
        smt_generation_pil_2.generate_expression_declaration(value, zero_expressions, one_expressions, index, possible_degree, solver)    
    smt_generation_pil_2.declare_minimize_keeps(number_intermediates, solver)
    new_used_variables = smt_generation_pil_2.get_minimal_expressions(number_intermediates, solver)
    
    added_basefield_cols = calculate_added_cols(expressions, new_used_variables, possible_degree - 1, q_dim)
    if min_value == -1 or added_basefield_cols < min_value:
        min_value = added_basefield_cols
        used_variables = new_used_variables
        optimal_degree = possible_degree - 1
    if len(new_used_variables) < min_vars:
        min_vars = len(new_used_variables)
    possible_degree = possible_degree + 1
    print()
        
        
print("--> Choosing degree: " + str(optimal_degree))
print("Variables that are kept:" + str(used_variables))

#new_map_expressions = {}
#i = 0
#for e in expressions:
#    new_e = rebuild_expression(e, expressions, used_variables, new_map_expressions)
#    new_map_expressions[i] = new_e
#    print("expresion " + str(i))
#    print(new_e)
#    i = i + 1
    
result = {}

used_index = list(used_variables)
used_index.sort()
filtered_expressions = []
#for e in used_index:
#    filtered_expressions.append(new_map_expressions[e])

solution = {}
solution["newExpressions"] = expressions
solution["imExps"] = used_index
solution["qDeg"] = optimal_degree

json_object = json.dumps(solution, indent = 1, sort_keys=True) 
file = open(args.fileout, "w")
file.write(json_object)
file.close()





