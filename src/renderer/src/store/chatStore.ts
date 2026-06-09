import { create } from 'zustand'
import type { Conversation, Message, ProviderConfig, ToolTrace, AgentConfig } from '../types'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null

function scheduleSave(conversations: Conversation[]): void {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    window.mathorama.conversations.saveAll(conversations).catch(() => {})
  }, 500)
}

function createNewConversation(title?: string): Conversation {
  const now = Date.now()
  return {
    id: generateId(),
    title: title || 'New Conversation',
    messages: [],
    createdAt: now,
    updatedAt: now
  }
}

interface StoredProviderData {
  apiKey?: string
  baseUrl?: string
  models?: string[]
}

// ── Default Agents ────────────────────────────────────────

const DEFAULT_AGENTS: AgentConfig[] = [
  {
    name: 'Math Tutor',
    description: 'Full mathematical toolbox — evaluate, solve, simplify, differentiate, integrate, plot',
    provider: 'openai',
    model: 'gpt-4o',
    system_prompt: `You are Mathorama, a mathematical problem-solving assistant powered by symbolic computation tools.

Available tools:
- evaluate_expression: Evaluate numeric expressions (e.g., sin(pi/2) + 1)
- solve_equation: Solve equations for a variable (e.g., x**2 - 4 = 0)
- simplify: Simplify algebraic expressions (e.g., x**2 + 2x + 1)
- differentiate: Compute derivatives (e.g., x**3 + 2x**2 + x)
- integrate: Compute integrals, optionally with bounds
- plot: Plot a function and return an image

When solving math problems:
1. Break the problem into steps
2. Use tools to perform calculations
3. For plots, use the plot tool and let the user know an image was generated
4. Explain your reasoning clearly between tool calls
5. Never solve math manually — always use the tools for computation`,
    params: { temperature: 0.3, max_tokens: 4096 },
    tools: ['evaluate_expression', 'solve_equation', 'simplify', 'differentiate', 'integrate', 'plot']
  },
  {
    name: 'General Assistant',
    description: 'Chat-only, no math tools',
    provider: 'openai',
    model: 'gpt-4o',
    system_prompt: 'You are a helpful and concise assistant.',
    params: { temperature: 0.7, max_tokens: 2048 },
    tools: []
  },
  {
    name: 'Plot Artist',
    description: 'Focused on mathematical visualization',
    provider: 'openai',
    model: 'gpt-4o',
    system_prompt: `You are a mathematical visualization specialist.
Use the plot tool to create clear, well-labeled plots.
Explain what each plot shows and why it's relevant.
If a problem requires computation before plotting, use evaluate or solve first.`,
    params: { temperature: 0.7, max_tokens: 4096 },
    tools: ['plot']
  }
]

interface ChatState {
  conversations: Conversation[]
  currentConversationId: string | null
  streamingContent: string
  providers: ProviderConfig[]
  selectedProvider: string | null
  selectedModel: string | null
  agents: AgentConfig[]
  selectedAgentName: string
  isLoading: boolean
  error: string | null
  _loaded: boolean

  // Actions
  createNewConversation: () => string
  switchConversation: (id: string) => void
  sendMessage: (content: string, provider?: string, model?: string) => Promise<void>
  appendToLastMessage: (content: string) => void
  setStreamingContent: (content: string) => void
  clearConversation: () => void
  deleteConversation: (id: string) => void
  updateConversationTitle: (id: string, title: string) => void
  setError: (error: string | null) => void
  setSelectedModel: (provider: string, model: string) => void
  selectAgent: (name: string) => void
  loadProviders: () => Promise<void>
  loadConversations: () => Promise<void>
}

export const useChatStore = create<ChatState>((set, get) => {
  // Initialize with a default conversation
  const defaultConv = createNewConversation()

  return {
    conversations: [defaultConv],
    currentConversationId: defaultConv.id,
    streamingContent: '',
    providers: [],
    selectedProvider: null,
    selectedModel: null,
    agents: DEFAULT_AGENTS,
    selectedAgentName: DEFAULT_AGENTS[0].name,
    isLoading: false,
    error: null,
    _loaded: false,

    loadConversations: async () => {
      try {
        const saved = await window.mathorama.conversations.loadAll()
        if (saved && (saved as Conversation[]).length > 0) {
          set({
            conversations: saved as Conversation[],
            currentConversationId: (saved as Conversation[])[0].id,
            _loaded: true
          })
        }
      } catch { /* ignore */ }
    },

    createNewConversation: () => {
      const conv = createNewConversation()
      set((state) => ({
        conversations: [conv, ...state.conversations],
        currentConversationId: conv.id
      }))
      scheduleSave(get().conversations)
      return conv.id
    },

    switchConversation: (id: string) => {
      set({ currentConversationId: id, streamingContent: '', error: null })
    },

    sendMessage: async (content: string, provider?: string, model?: string) => {
      const state = get()
      let convId = state.currentConversationId
      let conversation = state.conversations.find((c) => c.id === convId)

      // Create a new conversation if none exists
      if (!conversation) {
        convId = get().createNewConversation()
        conversation = get().conversations.find((c) => c.id === convId)!
      }

      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: Date.now(),
        status: 'done'
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        status: 'sending'
      }

      // Add user message and placeholder assistant message
      set((s) => ({
        conversations: s.conversations.map((c) => {
          if (c.id === convId) {
            // Auto-title: use first user message as title
            const title =
              c.messages.length === 0 ? content.slice(0, 50) + (content.length > 50 ? '...' : '') : c.title
            return {
              ...c,
              title,
              messages: [...c.messages, userMessage, assistantMessage],
              updatedAt: Date.now()
            }
          }
          return c
        }),
        streamingContent: '',
        isLoading: true,
        error: null
      }))

      try {
        // Build messages array for API call
        const currentConv = get().conversations.find((c) => c.id === convId)
        const apiMessages = (currentConv?.messages || [])
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role,
            content: m.content
          }))

        // Resolve agent from current selection, with optional provider/model override
        const currentAgent = state.agents.find(a => a.name === state.selectedAgentName) || state.agents[0]
        const agentForCall = {
          name: currentAgent.name,
          provider: provider || currentAgent.provider,
          model: model || currentAgent.model,
          system_prompt: currentAgent.system_prompt,
          params: currentAgent.params as Record<string, unknown>,
          tools: currentAgent.tools
        }

        // ── Character-by-character streaming ──────────────
        let charBuffer = ''
        let charInterval: ReturnType<typeof setInterval> | null = null

        const unsubscribe = window.mathorama.onStreamToken((token: string) => {
          charBuffer += token  // Buffer incoming tokens
        })

        // Reveal one character at a time from the buffer
        charInterval = setInterval(() => {
          if (charBuffer.length > 0) {
            const char = charBuffer[0]
            charBuffer = charBuffer.slice(1)
            set((s) => ({
              conversations: s.conversations.map((c) => {
                if (c.id === convId) {
                  return {
                    ...c,
                    messages: c.messages.map((m) =>
                      m.id === assistantMessage.id
                        ? { ...m, content: m.content + char, status: 'streaming' as const }
                        : m
                    ),
                    updatedAt: Date.now()
                  }
                }
                return c
              })
            }))
          }
        }, 15)  // ~67 chars per second

        // Call the agent loop via preload bridge
        const response = await window.mathorama.agent.run({
          agent: agentForCall,
          messages: apiMessages
        })

        // Clean up streaming
        if (charInterval) clearInterval(charInterval)
        unsubscribe()

        // Extract images from trace (tool "plot" results that are base64)
        const images: string[] = []
        if (response.trace) {
          for (const tr of response.trace) {
            if (tr.tool === 'plot' && typeof tr.result === 'string' && tr.result.startsWith('data:image')) {
              images.push(tr.result)
            }
          }
        }

        // Update assistant message with final content, trace, and images
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id === convId) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessage.id
                    ? {
                        ...m,
                        content: response.content || m.content,
                        trace: (response.trace as ToolTrace[]) || [],
                        images: images.length > 0 ? images : undefined,
                        status: 'done' as const
                      }
                    : m
                ),
                updatedAt: Date.now()
              }
            }
            return c
          }),
          streamingContent: '',
          isLoading: false
        }))
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id === convId) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessage.id
                    ? { ...m, content: `Error: ${errorMsg}`, status: 'error' as const }
                    : m
                ),
                updatedAt: Date.now()
              }
            }
            return c
          }),
          streamingContent: '',
          isLoading: false,
          error: errorMsg
        }))
      }
      scheduleSave(get().conversations)
    },

    appendToLastMessage: (content: string) => {
      set((s) => {
        const convId = s.currentConversationId
        if (!convId) return s
        return {
          conversations: s.conversations.map((c) => {
            if (c.id === convId) {
              const msgs = [...c.messages]
              const last = msgs[msgs.length - 1]
              if (last && last.role === 'assistant') {
                msgs[msgs.length - 1] = {
                  ...last,
                  content: last.content + content,
                  status: 'streaming' as const
                }
              }
              return { ...c, messages: msgs, updatedAt: Date.now() }
            }
            return c
          })
        }
      })
    },

    setStreamingContent: (content: string) => {
      set({ streamingContent: content })
    },

    clearConversation: () => {
      set((s) => {
        const convId = s.currentConversationId
        if (!convId) return s
        const now = Date.now()
        return {
          conversations: s.conversations.map((c) => {
            if (c.id === convId) {
              return { ...c, messages: [], updatedAt: now, title: 'New Conversation' }
            }
            return c
          }),
          streamingContent: '',
          error: null
        }
      })
      scheduleSave(get().conversations)
    },

    deleteConversation: (id: string) => {
      set((s) => {
        const remaining = s.conversations.filter((c) => c.id !== id)
        const newCurrentId =
          s.currentConversationId === id
            ? remaining.length > 0
              ? remaining[0].id
              : get().createNewConversation()
            : s.currentConversationId

        // If all deleted, create a new one
        if (remaining.length === 0) {
          const newConv = createNewConversation()
          return {
            conversations: [newConv],
            currentConversationId: newConv.id,
            streamingContent: '',
            error: null
          }
        }

        return {
          conversations: remaining,
          currentConversationId: newCurrentId,
          streamingContent: '',
          error: null
        }
      })
      scheduleSave(get().conversations)
    },

    updateConversationTitle: (id: string, title: string) => {
      set((s) => ({
        conversations: s.conversations.map((c) => (c.id === id ? { ...c, title } : c))
      }))
      scheduleSave(get().conversations)
    },

    setError: (error: string | null) => {
      set({ error })
    },

    setSelectedModel: (provider: string, model: string) => {
      set({ selectedProvider: provider, selectedModel: model })
    },

    selectAgent: (name: string) => {
      const agent = get().agents.find(a => a.name === name)
      if (agent) {
        set({
          selectedAgentName: name,
          selectedProvider: agent.provider,
          selectedModel: agent.model
        })
      }
    },

    loadProviders: async () => {
      try {
        const allConfig = await window.mathorama.config.getAll()
        const storedProviders = (allConfig?.['providers'] as Record<string, StoredProviderData>) || {}

        const providerList: ProviderConfig[] = Object.entries(storedProviders).map(([name, data]) => {
          // Determine the provider type id from name (or default to 'custom')
          let id: ProviderConfig['id'] = 'custom'
          if (name === 'openai') id = 'openai'
          else if (name === 'anthropic') id = 'anthropic'

          return {
            id,
            name,
            apiKey: data.apiKey || '',
            baseUrl: data.baseUrl || undefined,
            models: data.models || []
          }
        })

        set({ providers: providerList })

        // Auto-select first model if nothing is selected yet
        const state = get()
        if (!state.selectedModel && providerList.length > 0) {
          const firstProvider = providerList[0]
          if (firstProvider.models.length > 0) {
            set({
              selectedProvider: firstProvider.name,
              selectedModel: firstProvider.models[0]
            })
          }
        }
      } catch (err) {
        console.error('Failed to load providers:', err)
        set({ providers: [] })
      }
    }
  }
})

// Auto-load conversations on init
useChatStore.getState().loadConversations()

// Selector helpers
export const selectCurrentConversation = (state: ChatState): Conversation | undefined =>
  state.conversations.find((c) => c.id === state.currentConversationId)

export const selectCurrentMessages = (state: ChatState): Message[] =>
  state.conversations.find((c) => c.id === state.currentConversationId)?.messages || []
