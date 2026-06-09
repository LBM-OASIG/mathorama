import { OpenAIProvider } from './providers/openai'
import { AnthropicProvider } from './providers/anthropic'
import { LLMChatParams } from './providers/types'

export interface ProviderConfig {
  apiKey: string
  baseUrl?: string
}

class LLMGateway {
  private providers: Map<string, { provider: { chat(params: LLMChatParams): Promise<{ content: string }>; listModels(): Promise<string[]> }; config: ProviderConfig }> = new Map()

  setProvider(name: string, config: ProviderConfig): void {
    let instance: { chat(params: LLMChatParams): Promise<{ content: string }>; listModels(): Promise<string[]> }

    switch (name) {
      case 'openai':
        instance = new OpenAIProvider(config)
        break
      case 'anthropic':
        instance = new AnthropicProvider(config)
        break
      default:
        instance = new OpenAIProvider(config)
        break
    }

    this.providers.set(name, { provider: instance, config })
  }

  removeProvider(name: string): void {
    this.providers.delete(name)
  }

  async chat(providerName: string, params: LLMChatParams): Promise<{ content: string }> {
    const entry = this.providers.get(providerName)
    if (!entry) throw new Error(`Provider "${providerName}" not configured`)
    return entry.provider.chat(params)
  }

  async listModels(providerName: string): Promise<string[]> {
    const entry = this.providers.get(providerName)
    if (!entry) throw new Error(`Provider "${providerName}" not configured`)
    return entry.provider.listModels()
  }

  getProviders(): string[] {
    return Array.from(this.providers.keys())
  }
}

export const llmGateway = new LLMGateway()
