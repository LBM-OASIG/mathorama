export interface ToolDefinition {
  name: string
  description: string
  input_schema: Record<string, unknown>
  openai_tool: {
    type: 'function'
    function: {
      name: string
      description: string
      parameters: Record<string, unknown>
    }
  }
}

export const MATH_TOOLS: ToolDefinition[] = [
  {
    name: 'evaluate_expression',
    description: 'Compute the numeric value of a mathematical expression',
    input_schema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: "Mathematical expression to evaluate (e.g., 'sin(pi/2) + 1')"
        }
      },
      required: ['expression']
    },
    openai_tool: {
      type: 'function',
      function: {
        name: 'evaluate_expression',
        description: 'Compute the numeric value of a mathematical expression',
        parameters: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: "Mathematical expression to evaluate (e.g., 'sin(pi/2) + 1')"
            }
          },
          required: ['expression']
        }
      }
    }
  },
  {
    name: 'solve_equation',
    description: 'Solve an equation for a given variable',
    input_schema: {
      type: 'object',
      properties: {
        equation: {
          type: 'string',
          description: "Equation to solve (e.g., 'x**2 - 4 = 0')"
        },
        variable: {
          type: 'string',
          description: "Variable to solve for (e.g., 'x')"
        }
      },
      required: ['equation', 'variable']
    },
    openai_tool: {
      type: 'function',
      function: {
        name: 'solve_equation',
        description: 'Solve an equation for a given variable',
        parameters: {
          type: 'object',
          properties: {
            equation: {
              type: 'string',
              description: "Equation to solve (e.g., 'x**2 - 4 = 0')"
            },
            variable: {
              type: 'string',
              description: "Variable to solve for (e.g., 'x')"
            }
          },
          required: ['equation', 'variable']
        }
      }
    }
  },
  {
    name: 'simplify',
    description: 'Simplify an algebraic expression',
    input_schema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: "Algebraic expression to simplify (e.g., 'x**2 + 2*x + 1')"
        }
      },
      required: ['expression']
    },
    openai_tool: {
      type: 'function',
      function: {
        name: 'simplify',
        description: 'Simplify an algebraic expression',
        parameters: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: "Algebraic expression to simplify (e.g., 'x**2 + 2*x + 1')"
            }
          },
          required: ['expression']
        }
      }
    }
  },
  {
    name: 'differentiate',
    description: 'Compute the derivative of an expression',
    input_schema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: "Expression to differentiate (e.g., 'x**3 + 2*x**2 + x')"
        },
        variable: {
          type: 'string',
          description: 'Variable with respect to which to differentiate'
        },
        order: {
          type: 'number',
          description: 'Order of derivative (default: 1)'
        }
      },
      required: ['expression', 'variable']
    },
    openai_tool: {
      type: 'function',
      function: {
        name: 'differentiate',
        description: 'Compute the derivative of an expression',
        parameters: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: "Expression to differentiate (e.g., 'x**3 + 2*x**2 + x')"
            },
            variable: {
              type: 'string',
              description: 'Variable with respect to which to differentiate'
            },
            order: {
              type: 'number',
              description: 'Order of derivative (default: 1)'
            }
          },
          required: ['expression', 'variable']
        }
      }
    }
  },
  {
    name: 'integrate',
    description: 'Compute the integral of an expression (definite or indefinite)',
    input_schema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: "Expression to integrate (e.g., 'x**2')"
        },
        variable: {
          type: 'string',
          description: 'Variable of integration'
        },
        lower: {
          type: 'number',
          description: 'Lower bound for definite integral'
        },
        upper: {
          type: 'number',
          description: 'Upper bound for definite integral'
        }
      },
      required: ['expression', 'variable']
    },
    openai_tool: {
      type: 'function',
      function: {
        name: 'integrate',
        description: 'Compute the integral of an expression (definite or indefinite)',
        parameters: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: "Expression to integrate (e.g., 'x**2')"
            },
            variable: {
              type: 'string',
              description: 'Variable of integration'
            },
            lower: {
              type: 'number',
              description: 'Lower bound for definite integral'
            },
            upper: {
              type: 'number',
              description: 'Upper bound for definite integral'
            }
          },
          required: ['expression', 'variable']
        }
      }
    }
  },
  {
    name: 'plot',
    description: 'Plot a mathematical function and return as a base64-encoded PNG image',
    input_schema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: "Expression to plot (e.g., 'sin(x)')"
        },
        variable: {
          type: 'string',
          description: "Variable in the expression (e.g., 'x')"
        },
        xmin: {
          type: 'number',
          description: 'Minimum x value for plot (default: -10)'
        },
        xmax: {
          type: 'number',
          description: 'Maximum x value for plot (default: 10)'
        }
      },
      required: ['expression', 'variable']
    },
    openai_tool: {
      type: 'function',
      function: {
        name: 'plot',
        description: 'Plot a mathematical function and return as a base64-encoded PNG image',
        parameters: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: "Expression to plot (e.g., 'sin(x)')"
            },
            variable: {
              type: 'string',
              description: "Variable in the expression (e.g., 'x')"
            },
            xmin: {
              type: 'number',
              description: 'Minimum x value for plot (default: -10)'
            },
            xmax: {
              type: 'number',
              description: 'Maximum x value for plot (default: 10)'
            }
          },
          required: ['expression', 'variable']
        }
      }
    }
  }
]

export function getToolDefinition(name: string): ToolDefinition | undefined {
  return MATH_TOOLS.find(t => t.name === name)
}

export function getOpenAITools(): Array<ToolDefinition['openai_tool']> {
  return MATH_TOOLS.map(t => t.openai_tool)
}

export function getAnthropicTools(): Array<{
  name: string
  description: string
  input_schema: Record<string, unknown>
}> {
  return MATH_TOOLS.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema
  }))
}
