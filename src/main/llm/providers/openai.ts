import { LLMProvider, LLMChatParams, LLMChatResult, LLMProviderConfig } from './types'

interface OpenAIChoice {
  message: {
    content: string | null
    tool_calls?: Array<{
      id: string
      type: string
      function: {
        name: string
        arguments: string
      }
    }>
  }
}

interface OpenAIResponse {
  choices: OpenAIChoice[]
}

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai'
  private config: LLMProviderConfig

  constructor(config: LLMProviderConfig) {
    this.config = config
  }

  private get baseUrl(): string {
    return this.config.baseUrl ?? 'https://api.openai.com/v1'
  }

  async chat(params: LLMChatParams): Promise<LLMChatResult> {
    if (params.stream && params.onToken) {
      return this.chatStream(params)
    }

    const body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 4096,
      stream: false
    }

    if (params.tools && params.tools.length > 0) {
      body.tools = params.tools
      body.tool_choice = 'auto'
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`OpenAI API error (${response.status}): ${errorBody}`)
    }

    const data = await response.json() as OpenAIResponse
    const message = data.choices[0].message

    if (message.tool_calls && message.tool_calls.length > 0) {
      return {
        content: message.content ?? undefined,
        tool_calls: message.tool_calls.map(tc => ({
          id: tc.id,
          type: tc.type,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments
          }
        }))
      }
    }

    return { content: message.content ?? '' }
  }

  private async chatStream(params: LLMChatParams): Promise<LLMChatResult> {
    const body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 4096,
      stream: true,
      tools: params.tools?.length ? params.tools : undefined,
      tool_choice: params.tools?.length ? 'auto' : undefined
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`OpenAI API error (${response.status}): ${errorBody}`)
    }

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''
    let toolCalls: Array<{ id: string; type: string; function: { name: string; arguments: string } }> | null = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') continue

        try {
          const chunk = JSON.parse(data)
          const delta = chunk.choices?.[0]?.delta
          if (!delta) continue

          if (delta.content) {
            fullContent += delta.content
            params.onToken!(delta.content)
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (!toolCalls) toolCalls = []
              const index = tc.index || 0
              while (toolCalls.length <= index) {
                toolCalls.push({ id: '', type: 'function', function: { name: '', arguments: '' } })
              }
              if (tc.id) toolCalls[index].id = tc.id
              if (tc.function?.name) toolCalls[index].function.name += tc.function.name
              if (tc.function?.arguments) toolCalls[index].function.arguments += tc.function.arguments
            }
          }
        } catch { /* skip malformed JSON chunks */ }
      }
    }

    const result: LLMChatResult = {}
    if (fullContent) result.content = fullContent
    if (toolCalls && toolCalls.length > 0 && toolCalls[0].id) {
      result.tool_calls = toolCalls
    }
    return result
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`
      }
    })

    if (!response.ok) {
      throw new Error(`OpenAI list models error (${response.status})`)
    }

    const data = await response.json() as {
      data: Array<{ id: string }>
    }

    return data.data
      .map(m => m.id)
      .filter(id => id.startsWith('gpt'))
      .sort()
  }
}
