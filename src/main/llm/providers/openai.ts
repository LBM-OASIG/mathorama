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
