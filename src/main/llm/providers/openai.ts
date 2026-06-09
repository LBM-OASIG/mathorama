import { LLMProvider, LLMChatParams, LLMProviderConfig } from './types'

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai'
  private config: LLMProviderConfig

  constructor(config: LLMProviderConfig) {
    this.config = config
  }

  private get baseUrl(): string {
    return this.config.baseUrl ?? 'https://api.openai.com/v1'
  }

  async chat(params: LLMChatParams): Promise<{ content: string }> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens ?? 4096,
        stream: false
      })
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`OpenAI API error (${response.status}): ${errorBody}`)
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>
    }

    return { content: data.choices[0].message.content }
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
