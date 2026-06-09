import { useState, useRef, useEffect, useCallback } from 'react'
import { useChatStore, selectCurrentMessages } from '../store/chatStore'
import type { Message } from '../types'

export default function ChatPanel(): JSX.Element {
  const messages = useChatStore(selectCurrentMessages)
  const isLoading = useChatStore((s) => s.isLoading)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const clearConversation = useChatStore((s) => s.clearConversation)
  const error = useChatStore((s) => s.error)
  const selectedProvider = useChatStore((s) => s.selectedProvider)
  const selectedModel = useChatStore((s) => s.selectedModel)

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    setInput('')
    await sendMessage(trimmed, selectedProvider || undefined, selectedModel || undefined)

    // Focus back on input after sending
    inputRef.current?.focus()
  }, [input, isLoading, sendMessage, selectedProvider, selectedModel])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-gray-950">
      {/* Chat header */}
      <div className="flex h-8 flex-shrink-0 items-center justify-between border-b border-gray-800 bg-gray-900 px-3">
        <span className="text-xs font-medium text-blue-400">Chat</span>
        <button
          onClick={clearConversation}
          className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
          title="Clear conversation"
        >
          Clear
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-2 text-3xl">∑</div>
              <p className="text-sm text-gray-500">Math Agent Platform</p>
              <p className="mt-1 text-xs text-gray-600">Ask a math question to get started.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && messages[messages.length - 1]?.status === 'sending' && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-400" />
                Thinking...
              </div>
            )}
            {error && (
              <div className="rounded border border-red-800 bg-red-900/30 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-gray-800 bg-gray-900/80 p-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for new line)"
            rows={2}
            disabled={isLoading}
            className="flex-1 resize-none rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            Send
          </button>
        </div>
        <p className="mt-1 text-[10px] text-gray-600">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  )
}

// ── Message Bubble ────────────────────────────────────────

function MessageBubble({ message }: { message: Message }): JSX.Element {
  const isUser = message.role === 'user'
  const isError = message.status === 'error'
  const isStreaming = message.status === 'streaming'
  const [traceOpen, setTraceOpen] = useState(false)

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white'
            : isError
              ? 'border border-red-800 bg-red-900/20 text-red-300'
              : 'bg-gray-800 text-gray-200'
        }`}
      >
        {/* Role label */}
        <div
          className={`mb-1 text-[10px] font-medium uppercase tracking-wider ${
            isUser ? 'text-blue-200' : 'text-gray-500'
          }`}
        >
          {isUser ? 'You' : 'Assistant'}
          {isStreaming && <span className="ml-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />}
        </div>

        {/* Content */}
        <div className="whitespace-pre-wrap break-words">
          {message.content || (isStreaming ? '' : '...')}
        </div>

        {/* Images from plot tool */}
        {message.images && message.images.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Plot ${i + 1}`}
                className="max-w-full rounded border border-gray-700"
              />
            ))}
          </div>
        )}

        {/* Tool trace (collapsible) */}
        {message.trace && message.trace.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setTraceOpen(!traceOpen)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
            >
              {traceOpen ? '\u25BE' : '\u25B8'} Used {message.trace.length} tool
              {message.trace.length > 1 ? 's' : ''}
            </button>
            {traceOpen && (
              <div className="mt-1 space-y-1">
                {message.trace.map((t, i) => (
                  <div key={i} className="rounded bg-gray-900/80 p-2 text-xs font-mono">
                    <div className="text-blue-400">{t.tool}</div>
                    <div className="mt-0.5 text-gray-500">
                      Args: {JSON.stringify(t.args)}
                    </div>
                    <div className="mt-0.5 text-gray-400">
                      Result:{' '}
                      {t.result.length > 200
                        ? t.result.slice(0, 200) + '...'
                        : t.result}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
