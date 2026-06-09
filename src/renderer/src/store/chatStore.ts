import { create } from 'zustand'
import type { Conversation, Message, ProviderConfig } from '../types'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
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

interface ChatState {
  conversations: Conversation[]
  currentConversationId: string | null
  streamingContent: string
  providers: ProviderConfig[]
  isLoading: boolean
  error: string | null

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
}

export const useChatStore = create<ChatState>((set, get) => {
  // Initialize with a default conversation
  const defaultConv = createNewConversation()

  return {
    conversations: [defaultConv],
    currentConversationId: defaultConv.id,
    streamingContent: '',
    providers: [],
    isLoading: false,
    error: null,

    createNewConversation: () => {
      const conv = createNewConversation()
      set((state) => ({
        conversations: [conv, ...state.conversations],
        currentConversationId: conv.id
      }))
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

        // Call the LLM API via preload bridge
        const response = await window.mathorama.llm.chat({
          provider: provider || 'openai',
          model: model || 'gpt-4',
          messages: apiMessages,
          stream: false
        })

        // Update assistant message with response
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id === convId) {
              return {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === assistantMessage.id
                    ? { ...m, content: response.content, status: 'done' as const }
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
    },

    updateConversationTitle: (id: string, title: string) => {
      set((s) => ({
        conversations: s.conversations.map((c) => (c.id === id ? { ...c, title } : c))
      }))
    },

    setError: (error: string | null) => {
      set({ error })
    }
  }
})

// Selector helpers
export const selectCurrentConversation = (state: ChatState): Conversation | undefined =>
  state.conversations.find((c) => c.id === state.currentConversationId)

export const selectCurrentMessages = (state: ChatState): Message[] =>
  state.conversations.find((c) => c.id === state.currentConversationId)?.messages || []
