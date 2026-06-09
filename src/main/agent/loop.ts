import { llmGateway } from '../llm/gateway'
import { executeTool } from '../python/bridge'
import { buildLLMParams } from './adapter'
import type { AgentConfig } from './types'
import type { LLMChatMessage } from '../llm/providers/types'

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
  agent: AgentConfig
  messages: Array<{ role: string; content: string }>
  onToken?: (token: string) => void
}): Promise<AgentResult> {
  const trace: ToolTrace[] = []

  const msgs: LLMChatMessage[] = [
    { role: 'system', content: params.agent.system_prompt },
    ...params.messages.map(m => ({ role: m.role, content: m.content }))
  ]

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const llmParams = buildLLMParams(params.agent, msgs, {
      stream: true,
      onToken: params.onToken
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
