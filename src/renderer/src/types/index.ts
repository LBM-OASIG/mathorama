export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  status?: 'sending' | 'streaming' | 'done' | 'error'
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export type Provider = 'openai' | 'anthropic' | 'custom'

export interface ProviderConfig {
  id: Provider
  name: string
  apiKey: string
  baseUrl?: string
  models: string[]
}
