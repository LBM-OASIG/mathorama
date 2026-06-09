import { useState, useRef, useEffect, useCallback } from 'react'
import { useChatStore, selectCurrentMessages } from '../store/chatStore'
import type { Message } from '../types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import type { Components } from 'react-markdown'

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
    <div className="flex h-full flex-col bg-paper">
      {/* Chat header */}
      <div className="flex h-9 flex-shrink-0 items-center justify-between border-b border-border px-5 bg-surface/50">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-ink-faint">
          Dialogue
        </span>
        {messages.length > 0 && (
          <button
            onClick={clearConversation}
            className="rounded-sm px-2 py-0.5 font-mono text-[10px] text-ink-faint hover:text-error transition-colors"
            title="Clear conversation"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center animate-fade-in">
              {/* Decorative Sigma */}
              <div className="mb-4 font-display text-5xl italic text-accent/20 select-none">
                &#x2211;
              </div>
              <h2 className="mb-2 font-display text-xl font-medium italic text-ink-soft">
                Mathematics awaits
              </h2>
              <p className="font-body text-sm text-ink-muted leading-relaxed max-w-[280px] mx-auto">
                Pose a question, and let the agent work through it with the precision of Python and SymPy.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {['Solve x² + 3x - 4 = 0', 'Plot sin(x) from 0 to 2π', '∫ e^x dx'].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q)
                      inputRef.current?.focus()
                    }}
                    className="rounded-sm border border-border-warm bg-surface px-3 py-1.5 font-mono text-[11px] text-ink-muted hover:border-accent-light hover:text-accent transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5 max-w-3xl mx-auto">
            {messages.map((msg, idx) => (
              <MessageBubble key={msg.id} message={msg} index={idx} />
            ))}
            {isLoading && messages[messages.length - 1]?.status === 'sending' && (
              <div className="flex items-center gap-3 py-2 animate-fade-in">
                <div className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" />
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
                </div>
                <span className="font-mono text-[11px] text-ink-faint italic">Thinking...</span>
              </div>
            )}
            {error && (
              <div className="rounded-sm border border-error-border bg-error-bg px-4 py-3 animate-fade-in">
                <p className="font-mono text-[11px] text-error leading-relaxed">{error}</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-border bg-surface/80 backdrop-blur-sm p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask something mathematical..."
              rows={1}
              disabled={isLoading}
              className="flex-1 resize-none rounded-sm border border-border-warm bg-surface px-4 py-2.5 font-body text-[14px] leading-relaxed text-ink placeholder-ink-faint focus:border-accent-light focus:outline-none disabled:opacity-50 min-h-[40px] max-h-[160px]"
              style={{ overflow: 'hidden' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = target.scrollHeight + 'px'
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 flex items-center justify-center rounded-sm bg-accent px-5 py-2.5 font-mono text-[12px] font-medium text-white hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-accent transition-all"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-center font-mono text-[9px] text-ink-faint uppercase tracking-[0.1em]">
            Enter to send · Shift+Enter for a new line
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Message Bubble ────────────────────────────────────────

// ── Markdown Renderer ─────────────────────────────────────

/** Convert non-dollar LaTeX delimiters to standard $$...$$ and $...$ */
function preprocessLatex(text: string): string {
  let result = text
  // Single $ on its own line → $$...$$ (display)
  // Note: in .replace(), $$ in replacement = literal $, so $$$$ → $$
  // Catches: \n$\n...\n$\n where $ is the only char on the line
  result = result.replace(/\n\s*\$\s*\n([\s\S]*?)\n\s*\$\s*\n/g, '\n$$$$\n$1\n$$$$\n')
  // Also handle $ at very start or end of string (no leading/trailing \n)
  result = result.replace(/^\s*\$\s*\n([\s\S]*?)\n\s*\$\s*$/m, '$$$$\n$1\n$$$$')
  result = result.replace(/^\s*\$\s*\n([\s\S]*?)\n\s*\$\s*\n/, '$$$$\n$1\n$$$$\n')
  result = result.replace(/\n\s*\$\s*\n([\s\S]*?)\n\s*\$\s*$/, '\n$$$$\n$1\n$$$$')
  // \ [ ... \ ] → $$ ... $$ (display)
  result = result.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$\n$1\n$$$$')
  // \( ... \) → $ ... $ (inline)
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$')
  // \begin{equation}...\end{equation} → $$...$$
  result = result.replace(/\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g, '$$$$\n$1\n$$$$')
  // \begin{align}...\end{align} → $$...$$
  result = result.replace(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, '$$$$\n$1\n$$$$')
  return result
}

function MarkdownRenderer({ content, isUser }: { content: string; isUser: boolean }): JSX.Element {
  const processed = preprocessLatex(content)
  const components: Components = {
    p: ({ children }) => (
      <p className="mb-2 last:mb-0 leading-[1.65]">{children}</p>
    ),
    strong: ({ children }) => (
      <strong className={`font-semibold ${isUser ? 'text-white' : 'text-ink'}`}>{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic">{children}</em>
    ),
    code: ({ className, children, ...props }) => {
      const isInline = !className
      if (isInline) {
        return (
          <code
            className="rounded-sm px-1 py-0.5 font-mono text-[12px]"
            style={{
              backgroundColor: isUser ? 'rgba(255,255,255,0.12)' : 'rgba(30,58,95,0.07)',
              color: isUser ? 'inherit' : 'var(--color-accent)'
            }}
            {...props}
          >
            {children}
          </code>
        )
      }
      return (
        <div className="my-3 overflow-hidden rounded-sm border border-border bg-paper-warm">
          <div className="flex items-center gap-1.5 border-b border-border bg-paper-alt/50 px-3 py-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-accent-terracotta/60" />
            <span className="inline-block h-2 w-2 rounded-full bg-accent-warm/40" />
            <span className="inline-block h-2 w-2 rounded-full bg-accent/30" />
            <span className="ml-auto font-mono text-[9px] text-ink-faint uppercase tracking-wider">code</span>
          </div>
          <pre className="overflow-x-auto p-3 font-mono text-[12px] leading-relaxed text-ink-soft">
            <code className={className} {...props}>{children}</code>
          </pre>
        </div>
      )
    },
    pre: ({ children }) => <>{children}</>,
    ul: ({ children }) => (
      <ul className="mb-2 list-disc pl-5 space-y-1 last:mb-0">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-2 list-decimal pl-5 space-y-1 last:mb-0">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="leading-[1.65]">{children}</li>
    ),
    h1: ({ children }) => (
      <h1 className={`mb-3 mt-4 font-display text-lg font-semibold first:mt-0 ${isUser ? 'text-white' : 'text-ink'}`}>
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className={`mb-2 mt-3 font-display text-base font-semibold first:mt-0 ${isUser ? 'text-white' : 'text-ink'}`}>
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className={`mb-2 mt-3 font-display text-[15px] font-medium first:mt-0 ${isUser ? 'text-white/90' : 'text-ink-soft'}`}>
        {children}
      </h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className={`my-2 pl-3 italic border-l-2 ${isUser ? 'border-white/30 text-white/80' : 'border-accent/30 text-ink-muted'}`}>
        {children}
      </blockquote>
    ),
    a: ({ children, href }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`underline underline-offset-2 decoration-1 ${
          isUser ? 'text-white/80 hover:text-white' : 'text-accent-light hover:text-accent'
        }`}
      >
        {children}
      </a>
    ),
    hr: () => (
      <hr className={`my-4 border-0 h-px ${isUser ? 'bg-white/15' : 'bg-border'}`} />
    ),
    table: ({ children }) => (
      <div className="my-3 overflow-x-auto">
        <table className="min-w-full border-collapse text-[13px]">{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th className={`border px-3 py-1.5 text-left font-semibold font-body ${isUser ? 'border-white/20' : 'border-border'}`}>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className={`border px-3 py-1.5 font-body ${isUser ? 'border-white/20' : 'border-border'}`}>
        {children}
      </td>
    ),
  }

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={components}
    >
      {processed}
    </ReactMarkdown>
  )
}

// ── Split Thinking / Answer ───────────────────────────────

function splitThinkingAnswer(content: string): { thinking: string | null; answer: string | null } {
  // Match content after "## Thinking" until "## Answer" or end
  const thinkingMatch = content.match(/^##\s*Thinking\s*\n([\s\S]*?)(?=\n##\s*Answer\s*\n|$)/m)
  // Match content after "## Answer"
  const answerMatch = content.match(/^##\s*Answer\s*\n([\s\S]*?)$/m)
  return {
    thinking: thinkingMatch ? thinkingMatch[1].trim() : null,
    answer: answerMatch ? answerMatch[1].trim() : null,
  }
}

function ThinkingAnswerRenderer({ content, isUser }: { content: string; isUser: boolean }): JSX.Element {
  const { thinking, answer } = splitThinkingAnswer(content)

  // No thinking/answer structure found — render normally
  if (!thinking && !answer) {
    return <MarkdownRenderer content={content} isUser={isUser} />
  }

  return (
    <>
      {/* Thinking section — collapsible, always collapsed by default */}
      {thinking && (
        <details className="group mb-4">
          <summary className="flex cursor-pointer select-none items-center gap-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-ink-faint hover:text-ink-muted transition-colors">
            <svg
              className="h-3 w-3 transition-transform group-open:rotate-90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Reasoning
          </summary>
          <div className="mt-2 border-l-2 border-accent/15 pl-4">
            <div className="text-[13px] leading-relaxed text-ink-muted">
              <MarkdownRenderer content={thinking} isUser={isUser} />
            </div>
          </div>
        </details>
      )}

      {/* Answer section — main content */}
      {answer && (
        <div className="font-body text-[14px] leading-relaxed">
          <MarkdownRenderer content={answer} isUser={isUser} />
        </div>
      )}

      {/* Still thinking (no answer marker yet) — show raw */}
      {!answer && (
        <MarkdownRenderer content={content} isUser={isUser} />
      )}
    </>
  )
}

// ── Message Bubble ────────────────────────────────────────

function MessageBubble({ message, index }: { message: Message; index: number }): JSX.Element {
  const isUser = message.role === 'user'
  const isError = message.status === 'error'
  const isStreaming = message.status === 'streaming'
  const [traceOpen, setTraceOpen] = useState(false)

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
      style={{ animationDelay: `${Math.min(index * 80, 400)}ms` }}
    >
      <div
        className={`relative max-w-[82%] ${
          isUser
            ? 'bg-accent text-white'
            : isError
              ? 'border border-error-border bg-error-bg text-error'
              : 'bg-surface border border-border text-ink-soft'
        } ${isUser ? 'rounded-sm rounded-br-none' : 'rounded-sm rounded-bl-none'}`}
      >
        {/* Assistant accent bar */}
        {!isUser && !isError && (
          <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-accent/30" />
        )}

        <div className={`px-4 py-3 ${!isUser && !isError ? 'pl-5' : ''}`}>
          {/* Role label */}
          <div
            className={`mb-1.5 flex items-center gap-2 ${
              isUser ? 'text-white/60' : isError ? 'text-error/60' : 'text-ink-faint'
            }`}
          >
            <span className="font-mono text-[9px] font-medium uppercase tracking-[0.15em]">
              {isUser ? 'You' : 'Assistant'}
            </span>
            {isStreaming && (
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-cursor" />
            )}
          </div>

          {/* Content */}
          <div className="font-body text-[14px] leading-relaxed">
            {message.content ? (
              isUser || isStreaming ? (
                <MarkdownRenderer content={message.content} isUser={isUser} />
              ) : (
                <ThinkingAnswerRenderer content={message.content} isUser={false} />
              )
            ) : isStreaming ? null : (
              '...'
            )}
            {isStreaming && (
              <span className="inline-block h-[1em] w-[2px] bg-accent ml-0.5 align-text-bottom animate-cursor" />
            )}
          </div>

          {/* Images from plot tool */}
          {message.images && message.images.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Plot ${i + 1}`}
                  className="max-w-full rounded-sm border border-border shadow-sm"
                />
              ))}
            </div>
          )}

          {/* Tool trace (collapsible) */}
          {message.trace && message.trace.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setTraceOpen(!traceOpen)}
                className={`flex items-center gap-1.5 font-mono text-[10px] transition-colors ${
                  isUser ? 'text-white/50 hover:text-white/80' : 'text-ink-faint hover:text-ink-muted'
                }`}
              >
                <svg
                  className={`h-2.5 w-2.5 transition-transform duration-200 ${traceOpen ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                {message.trace.length} tool call{message.trace.length > 1 ? 's' : ''}
              </button>
              {traceOpen && (
                <div className="mt-2 space-y-1.5 animate-fade-in">
                  {message.trace.map((t, i) => (
                    <div
                      key={i}
                      className={`rounded-sm p-2.5 font-mono text-[11px] leading-relaxed ${
                        isUser
                          ? 'bg-white/10'
                          : 'bg-paper-warm border border-border'
                      }`}
                    >
                      <div className={isUser ? 'text-accent-light' : 'text-accent font-medium'}>
                        {t.tool}
                      </div>
                      <div className={`mt-1 ${isUser ? 'text-white/40' : 'text-ink-faint'}`}>
                        Args: {JSON.stringify(t.args)}
                      </div>
                      <div className={`mt-1 ${isUser ? 'text-white/60' : 'text-ink-muted'}`}>
                        {t.result.length > 180
                          ? t.result.slice(0, 180) + '...'
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
    </div>
  )
}
