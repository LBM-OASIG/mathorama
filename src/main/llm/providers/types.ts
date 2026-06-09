export interface LLMChatParams {
  model: string
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  stream?: boolean
  temperature?: number
  maxTokens?: number
}

export interface LLMProviderConfig {
  apiKey: string
  baseUrl?: string
}

export interface LLMProvider {
  readonly name: string
  chat(params: LLMChatParams): Promise<{ content: string }>
  listModels(): Promise<string[]>
}

export interface LLMChatMessage {
  role: string
  content: string
}
