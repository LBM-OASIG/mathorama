import { llmGateway } from '../llm/gateway'
import { executeTool } from '../python/bridge'
import { buildLLMParams } from './adapter'
import type { AgentConfig } from './types'
import type { LLMChatMessage } from '../llm/providers/types'

export interface ToolTrace {
  tool: string
  args: Record<string, unknown>
  result: string
}

export interface AgentResult {
  content: string
  /** Native reasoning chain from the model's internal thinking (o1/o3, DeepSeek-R1, Claude thinking). */
  reasoning?: string
  trace: ToolTrace[]
}

export async function runAgent(params: {
  agent: AgentConfig
  messages: Array<{ role: string; content: string }>
  onToken?: (token: string) => void
  onReasoningToken?: (token: string) => void
}): Promise<AgentResult> {
  const trace: ToolTrace[] = []

  const msgs: LLMChatMessage[] = [
    { role: 'system', content: params.agent.system_prompt },
    ...params.messages.map(m => ({ role: m.role, content: m.content }))
  ]

  // Run without iteration limit — the loop naturally terminates when
  // the model returns a final answer (no tool_calls, not truncated).
  // A 200-iteration safety net prevents runaway loops from buggy agents.
  for (let i = 0; i < 200; i++) {
    const llmParams = buildLLMParams(params.agent, msgs, {
      stream: true,
      onToken: params.onToken,
      onReasoningToken: params.onReasoningToken
    })

    const response = await llmGateway.chatWithTools(params.agent.provider, llmParams)

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
    } else if (response.truncated && response.content) {
      // Output was cut off by max_tokens — continue generation
      msgs.push({ role: 'assistant', content: response.content })
      msgs.push({ role: 'user', content: '请继续完成你的回答。' })
      // Loop continues for another iteration
    } else {
      return {
        content: response.content ?? '',
        reasoning: response.reasoning,
        trace
      }
    }
  }

  return {
    content: 'Maximum iterations (200) reached without final answer.',
    trace
  }
}
