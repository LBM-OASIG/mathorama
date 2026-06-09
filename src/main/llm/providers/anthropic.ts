import { LLMProvider, LLMChatParams, LLMProviderConfig } from './types'

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic'
  private config: LLMProviderConfig

  constructor(config: LLMProviderConfig) {
    this.config = config
  }

  async chat(params: LLMChatParams): Promise<{ content: string }> {
    const systemMessages = params.messages.filter(m => m.role === 'system')
    const nonSystemMessages = params.messages.filter(m => m.role !== 'system')

    const body: Record<string, unknown> = {
      model: params.model,
      messages: nonSystemMessages.map(m => ({
        role: m.role,
        content: m.content
      })),
      max_tokens: params.maxTokens ?? 4096,
      stream: false
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

    const data = await response.json() as {
      content: Array<{ text: string }>
    }

    return { content: data.content[0].text }
  }

  async listModels(): Promise<string[]> {
    return [
      'claude-sonnet-4-20250514',
      'claude-haiku-3-5-20241022'
    ]
  }
}
