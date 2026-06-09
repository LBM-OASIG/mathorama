export interface ToolCall {
  id: string
  type: string
  function: {
    name: string
    arguments: string
  }
}

export interface LLMChatParams {
  model: string
  messages: LLMChatMessage[]
  tools?: Array<{
    type: string
    function: {
      name: string
      description: string
      parameters: Record<string, unknown>
    }
  }>
  stream?: boolean
  onToken?: (token: string) => void
  temperature?: number
  maxTokens?: number
}

export interface LLMChatResult {
  content?: string
  tool_calls?: ToolCall[]
}

export interface LLMProviderConfig {
  apiKey: string
  baseUrl?: string
}

export interface LLMProvider {
  readonly name: string
  chat(params: LLMChatParams): Promise<LLMChatResult>
  listModels(): Promise<string[]>
}

export interface LLMChatMessage {
  role: string
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}
