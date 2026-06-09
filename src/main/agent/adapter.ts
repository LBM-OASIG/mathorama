import type { AgentConfig } from './types'
import { getOpenAITools, getAnthropicTools } from './tools'
import type { LLMChatParams, LLMChatMessage } from '../llm/providers/types'

// ── Model family detection ────────────────────────────────

type ModelFamily = 'openai-standard' | 'openai-reasoning' | 'anthropic' | 'openai-compatible'

function detectFamily(provider: string, model: string): ModelFamily {
  if (provider === 'anthropic') return 'anthropic'
  if (provider === 'openai') {
    // o-series reasoning models
    if (/^o[13]-/.test(model) || model.startsWith('o1-') || model.startsWith('o3-')) {
      return 'openai-reasoning'
    }
    return 'openai-standard'
  }
  // Custom / OpenAI-compatible providers (Ollama, vLLM, DeepSeek, etc.)
  return 'openai-compatible'
}

// ── Adapter ───────────────────────────────────────────────

export function buildLLMParams(
  agent: AgentConfig,
  messages: LLMChatMessage[],
  options: { stream?: boolean; onToken?: (token: string) => void }
): LLMChatParams {
  const family = detectFamily(agent.provider, agent.model)
  const extraBody: Record<string, unknown> = {}

  // ── Temperature ───────────────────────────────────
  // Reasoning models (o1, o3) ignore temperature
  let temperature: number | undefined = agent.params.temperature
  if (family === 'openai-reasoning') {
    temperature = undefined  // o-series doesn't support it
  }

  // ── max_tokens → model-specific field ─────────────
  let maxTokens: number | undefined = agent.params.max_tokens

  // DeepSeek models have a hard 8192 output-token ceiling
  const isDeepSeek = /deepseek/i.test(agent.model)
  if (isDeepSeek && maxTokens !== undefined && maxTokens > 8192) {
    console.warn(`[Adapter] DeepSeek model '${agent.model}' max_tokens capped from ${maxTokens} to 8192 (API limit)`)
    maxTokens = 8192
  }

  if (family === 'openai-reasoning' && agent.params.max_tokens !== undefined) {
    extraBody.max_completion_tokens = agent.params.max_tokens
    maxTokens = undefined  // don't send the standard field
  }

  // ── reasoning_effort → model-specific ─────────────
  if (agent.params.reasoning_effort) {
    if (family === 'openai-reasoning') {
      extraBody.reasoning_effort = agent.params.reasoning_effort
    } else if (family === 'anthropic') {
      // Anthropic: map reasoning_effort to thinking budget
      const budgets: Record<string, number> = {
        low: 2048,
        medium: 8192,
        high: 16000
      }
      extraBody.thinking = {
        type: 'enabled',
        budget_tokens: budgets[agent.params.reasoning_effort] ?? 4096
      }
    }
  }

  // ── Tools: pick only the ones the agent enables ──────
  let tools: unknown[] | undefined

  if (agent.tools.length > 0) {
    if (family === 'anthropic') {
      tools = getAnthropicTools().filter(t => agent.tools.includes(t.name))
    } else {
      // OpenAI / OpenAI-compatible
      tools = getOpenAITools().filter(t => agent.tools.includes(t.function.name))
    }
  }

  const result: LLMChatParams = {
    model: agent.model,
    messages,
    temperature,
    maxTokens,
    top_p: agent.params.top_p,
    stop: agent.params.stop,
    stream: options.stream,
    onToken: options.onToken,
    tools: tools as LLMChatParams['tools'],
    extraBody
  }

  // Debug: log what we're actually sending
  console.log('[Adapter] buildLLMParams:', {
    family,
    model: agent.model,
    maxTokens,
    temperature,
    extraBodyKeys: Object.keys(extraBody)
  })

  return result
}
