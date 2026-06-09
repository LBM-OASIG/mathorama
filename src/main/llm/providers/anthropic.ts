import { LLMProvider, LLMChatParams, LLMChatResult, LLMProviderConfig, ToolCall } from './types'

interface AnthropicTextBlock {
  type: 'text'
  text: string
}

interface AnthropicToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

type AnthropicContentBlock = AnthropicTextBlock | AnthropicToolUseBlock

interface AnthropicResponse {
  content: AnthropicContentBlock[]
}

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic'
  private config: LLMProviderConfig

  constructor(config: LLMProviderConfig) {
    this.config = config
  }

  async chat(params: LLMChatParams): Promise<LLMChatResult> {
    if (params.stream && params.onToken) {
      return this.chatStream(params)
    }

    const systemMessages = params.messages.filter(m => m.role === 'system')
    const nonSystemMessages = params.messages.filter(m => m.role !== 'system')

    const body: Record<string, unknown> = {
      model: params.model,
      messages: this.convertMessages(nonSystemMessages),
      max_tokens: params.maxTokens ?? 4096,
      stream: false
    }

    if (params.tools && params.tools.length > 0) {
      body.tools = params.tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters
      }))
    }

    if (systemMessages.length > 0) {
      body.system = systemMessages.map(m => m.content).join('\n')
    }

    if (params.temperature !== undefined) {
      body.temperature = params.temperature
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Anthropic API error (${response.status}): ${errorBody}`)
    }

    const data = await response.json() as AnthropicResponse
    const content: string[] = []
    const toolCalls: ToolCall[] = []

    for (const block of data.content) {
      if (block.type === 'text') {
        content.push(block.text)
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          type: 'function',
          function: {
            name: block.name,
            arguments: JSON.stringify(block.input)
          }
        })
      }
    }

    const result: LLMChatResult = {}
    if (content.length > 0) {
      result.content = content.join('')
    }
    if (toolCalls.length > 0) {
      result.tool_calls = toolCalls
    }

    return result
  }

  private convertMessages(messages: LLMChatMessage[]): Array<Record<string, unknown>> {
    return messages.map(m => {
      if (m.tool_calls && m.tool_calls.length > 0) {
        const content: AnthropicContentBlock[] = []
        if (m.content) content.push({ type: 'text', text: m.content })
        for (const tc of m.tool_calls) {
          content.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.function.name,
            input: JSON.parse(tc.function.arguments)
          })
        }
        return { role: m.role, content }
      }

      if (m.role === 'tool' && m.tool_call_id) {
        return {
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: m.tool_call_id,
            content: m.content ?? ''
          }]
        }
      }

      return { role: m.role, content: m.content ?? '' }
    })
  }

  private async chatStream(params: LLMChatParams): Promise<LLMChatResult> {
    const systemMessages = params.messages.filter(m => m.role === 'system')
    const nonSystemMessages = params.messages.filter(m => m.role !== 'system')

    const body: Record<string, unknown> = {
      model: params.model,
      messages: this.convertMessages(nonSystemMessages),
      max_tokens: params.maxTokens ?? 4096,
      stream: true,
      tools: params.tools?.map(t => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters
      })) || undefined
    }

    if (systemMessages.length > 0) {
      (body as Record<string, unknown>).system = systemMessages.map(m => m.content).join('\n')
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Anthropic API error (${response.status}): ${errorBody}`)
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''
    const toolCalls: Array<{ id: string; type: string; function: { name: string; arguments: string } }> = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('event:') && !trimmed.startsWith('data:')) continue

        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6)
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              const text = parsed.delta.text
              fullContent += text
              params.onToken!(text)
            }
            if (parsed.type === 'content_block_start' && parsed.content_block?.type === 'tool_use') {
              toolCalls.push({
                id: parsed.content_block.id,
                type: 'function',
                function: {
                  name: parsed.content_block.name,
                  arguments: ''
                }
              })
            }
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'input_json_delta') {
              const lastTc = toolCalls[toolCalls.length - 1]
              if (lastTc) lastTc.function.arguments += parsed.delta.partial_json
            }
          } catch { /* skip */ }
        }
      }
    }

    const result: LLMChatResult = {}
    if (fullContent) result.content = fullContent
    if (toolCalls.length > 0) result.tool_calls = toolCalls
    return result
  }

  async listModels(): Promise<string[]> {
    return [
      'claude-sonnet-4-20250514',
      'claude-haiku-3-5-20241022'
    ]
  }
}
