import { llmGateway } from '../llm/gateway'
import { executeTool } from '../python/bridge'
import { getOpenAITools } from './tools'
import type { LLMChatMessage } from '../llm/providers/types'

const SYSTEM_PROMPT = `You are Mathorama, a mathematical problem-solving assistant powered by symbolic computation tools.

Available tools:
- evaluate_expression: Evaluate numeric expressions (e.g., sin(pi/2) + 1)
- solve_equation: Solve equations for a variable (e.g., x**2 - 4 = 0)
- simplify: Simplify algebraic expressions (e.g., x**2 + 2x + 1)
- differentiate: Compute derivatives (e.g., x**3 + 2x**2 + x)
- integrate: Compute integrals, optionally with bounds
- plot: Plot a function and return an image

When solving math problems:
1. Break the problem into steps
2. Use tools to perform calculations
3. For plots, use the plot tool and let the user know an image was generated
4. Explain your reasoning clearly between tool calls
5. Never solve math manually - always use the tools for computation`

const MAX_ITERATIONS = 10

export interface ToolTrace {
  tool: string
  args: Record<string, unknown>
  result: string
}

export interface AgentResult {
  content: string
  trace: ToolTrace[]
}

export async function runAgent(params: {
  provider: string
  model: string
  messages: Array<{ role: string; content: string }>
  onToken?: (token: string) => void
}): Promise<AgentResult> {
  const trace: ToolTrace[] = []

  const msgs: LLMChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...params.messages.map(m => ({ role: m.role, content: m.content }))
  ]

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await llmGateway.chatWithTools(params.provider, {
      model: params.model,
      messages: msgs,
      tools: getOpenAITools(),
      tool_choice: 'auto',
      stream: true,
      onToken: params.onToken
    })

    if (response.tool_calls && response.tool_calls.length > 0) {
      msgs.push({
        role: 'assistant',
        content: response.content ?? null,
        tool_calls: response.tool_calls
      })

      for (const tc of response.tool_calls) {
        const args = JSON.parse(tc.function.arguments) as Record<string, unknown>
        const result = await executeTool(tc.function.name, args)

        const resultStr = result.success
          ? (result.result ?? '')
          : (result.error ?? 'Unknown error')

        trace.push({
          tool: tc.function.name,
          args,
          result: resultStr
        })

        msgs.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: resultStr
        })
      }
    } else {
      return {
        content: response.content ?? '',
        trace
      }
    }
  }

  return {
    content: 'Maximum iterations reached without final answer.',
    trace
  }
}
