export interface ToolTrace {
  tool: string
  args: Record<string, unknown>
  result: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  timestamp: number
  status?: 'sending' | 'streaming' | 'done' | 'error'
  trace?: ToolTrace[]
  images?: string[]
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

/** Semantic parameters — adapter translates per model. */
export interface AgentParams {
  temperature?: number
  max_tokens?: number
  top_p?: number
  stop?: string[]
  reasoning_effort?: 'low' | 'medium' | 'high'
  frequency_penalty?: number
  presence_penalty?: number
}

/** Agent configuration entity. */
export interface AgentConfig {
  name: string
  description?: string
  provider: string
  model: string
  system_prompt: string
  params: AgentParams
  tools: string[]
}
