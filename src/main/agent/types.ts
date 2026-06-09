/** Semantic parameters — not API-specific. Adapter translates per model. */
export interface AgentParams {
  /** Output randomness (0–2). Some models ignore this (e.g., o1). */
  temperature?: number
  /** Maximum output tokens. o1-family uses max_completion_tokens internally. */
  max_tokens?: number
  /** Nucleus sampling (0–1). */
  top_p?: number
  /** Stop sequences. */
  stop?: string[]
  /** Reasoning effort — for o-series (OpenAI) or thinking (Anthropic). */
  reasoning_effort?: 'low' | 'medium' | 'high'
  /** Frequency penalty (OpenAI). */
  frequency_penalty?: number
  /** Presence penalty (OpenAI). */
  presence_penalty?: number
}

/** Read-only Agent configuration. */
export interface AgentConfig {
  name: string
  description?: string
  provider: string
  model: string
  system_prompt: string
  params: AgentParams
  /** Which tools this agent can use. Empty = no tools (chat-only). */
  tools: string[]
}

/** The resolved request body per provider — adapter output. */
export interface AdapterBody {
  model: string
  messages: unknown[]
  stream: boolean
  onToken?: (token: string) => void
  /** Tools in provider-native format (already translated). */
  tools?: unknown[]
  /** Provider-specific overrides merged last. */
  extraBody: Record<string, unknown>
}
