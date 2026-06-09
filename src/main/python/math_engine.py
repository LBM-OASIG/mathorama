#!/usr/bin/env python3
"""Mathorama Math Engine - Tool-based math computation dispatcher."""

import argparse
import base64
import io
import json
import sys

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from sympy import (Eq, N, diff, integrate, latex, simplify, solve,
                   symbols, sympify)


def tool_evaluate_expression(args: dict) -> str:
    expr = args['expression']
    result = N(sympify(expr))
    return str(result)


def tool_solve_equation(args: dict) -> str:
    eq_str = args['equation']
    var_str = args['variable']
    var = symbols(var_str)

    if '=' in eq_str:
        left, right = eq_str.split('=', 1)
        eq = Eq(sympify(left), sympify(right))
    else:
        eq = sympify(eq_str)

    sol = solve(eq, var)
    return str(sol)


def tool_simplify(args: dict) -> str:
    expr = args['expression']
    result = simplify(sympify(expr))
    return str(result)


def tool_differentiate(args: dict) -> str:
    expr = args['expression']
    var_str = args['variable']
    order = int(args.get('order', 1))
    var = symbols(var_str)
    result = diff(sympify(expr), var, order)
    return str(result)


def tool_integrate(args: dict) -> str:
    expr = args['expression']
    var_str = args['variable']
    var = symbols(var_str)
    lower = args.get('lower')
    upper = args.get('upper')
    expr_sym = sympify(expr)

    if lower is not None and upper is not None:
        result = integrate(expr_sym, (var, float(lower), float(upper)))
    else:
        result = integrate(expr_sym, var)

    return str(result)


def tool_plot(args: dict) -> str:
    expr = args['expression']
    var_str = args['variable']
    var = symbols(var_str)
    xmin = float(args.get('xmin', -10))
    xmax = float(args.get('xmax', 10))

    f = sympify(expr)
    f_lambda = np.vectorize(lambda xval: float(N(f.subs(var, xval))))

    xs = np.linspace(xmin, xmax, 400)
    ys = f_lambda(xs)

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(xs, ys, 'b-', linewidth=2)
    ax.axhline(0, color='gray', linewidth=0.5)
    ax.axvline(0, color='gray', linewidth=0.5)
    ax.set_xlabel(f'${var_str}$')
    ax.set_ylabel(f'$f({var_str})$')
    ax.set_title(f'$y = {latex(f)}$')
    ax.grid(True, alpha=0.3)

    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)
    img_base64 = base64.b64encode(buf.read()).decode('utf-8')

    return f'data:image/png;base64,{img_base64}'


TOOLS = {
    'evaluate_expression': tool_evaluate_expression,
    'solve_equation': tool_solve_equation,
    'simplify': tool_simplify,
    'differentiate': tool_differentiate,
    'integrate': tool_integrate,
    'plot': tool_plot,
}


def main() -> None:
    parser = argparse.ArgumentParser(description='Mathorama Math Engine')
    parser.add_argument('--tool', required=True, choices=list(TOOLS.keys()),
                        help='Tool to execute')
    parser.add_argument('--args', required=True,
                        help='JSON arguments for the tool')
    args = parser.parse_args()

    try:
        tool_args = json.loads(args.args)
        result = TOOLS[args.tool](tool_args)
        print(json.dumps({'success': True, 'result': str(result)}))
    except Exception as e:
        error_msg = f'{type(e).__name__}: {e}'
        print(error_msg, file=sys.stderr)
        print(json.dumps({'success': False, 'error': error_msg}))
        sys.exit(1)


if __name__ == '__main__':
    main()
