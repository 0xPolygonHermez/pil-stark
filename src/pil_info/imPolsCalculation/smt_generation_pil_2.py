#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Created on Fri May 26 17:51:23 2023

@author: clara
"""

from z3 import *


def declare_minimize_keeps(number_intermediates, solver):
    
    aux = 0
    for s in range(number_intermediates):
        aux = aux + If(Bool('k_exp_'+ str(s)), 1, 0)
    solver.add(Int('needed_variables') == aux)


def declare_keep_variables(number_intermediates, n, solver):
    for s in range(number_intermediates):
        solver.add(Int('d_exp_' + str(s)) >= 0)
        solver.add(Int('d_exp_' + str(s)) <= n)
        
def generate_expression_declaration(tree, zero_expressions, one_expressions, position, n, solver):
    possible_degrees = get_degrees_tree(tree, zero_expressions, one_expressions, "aux_" + str(position), n, solver)
    if_keep =  Int('d_exp_' + str(position)) == 1
    if_not_keep = Int('d_exp_' + str(position)) == possible_degrees
    solver.add(If( Bool('k_exp_'+ str(position)), if_keep, if_not_keep))

        

def get_degrees_tree(tree, zero_expressions, one_expressions, prefix, n, solver):
    if type(tree) == list:
        solver.add(Int(prefix) <= n)
        
        or_condition = "false"
        
        i = 0
        for e in tree:
            new_degree = get_degrees_tree(e, zero_expressions, one_expressions, prefix + '_' + str(i), n, solver)
            solver.add(Int(prefix) >= new_degree)

            or_condition = or_condition or (prefix == new_degree)
            i = i + 1
        #solver.add(or_condition) #check if helps
        return Int(prefix)
    elif type(tree) == tuple:
        left_degree = get_degrees_tree(tree[0], zero_expressions, one_expressions, prefix + "_0", n, solver)
        right_degree = get_degrees_tree(tree[1], zero_expressions, one_expressions, prefix + "_1", n, solver)
        total_degree_var = Int(prefix + "_total_degree")
        solver.add(total_degree_var <= n)  # Set an upper bound constraint on the total degree
        solver.add(total_degree_var == left_degree + right_degree)  # Set the total degree of the tuple expression
        return total_degree_var
    elif type(tree) == int:
        return tree
    else:
        if tree in zero_expressions:
            return 0
        elif tree in one_expressions:
            return 1
        else:
            return Int('d_' + tree)



def get_minimal_expressions(number_intermediates, solver):
    solver.minimize(Int('needed_variables'))
    if(solver.check() == sat): 
        m = solver.model()
        print("Number of needed variables: " + str(m[z3.Int('needed_variables')]))
        should_keep = set()
        for s in range(number_intermediates):
            if m[z3.Bool('k_exp_' + str(s))]:
                should_keep.add(s)
                
    return should_keep
    
    