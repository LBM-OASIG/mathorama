import { useState, useCallback, useEffect } from 'react'
import { useChatStore, selectCurrentConversation } from '../store/chatStore'
import ChatPanel from './ChatPanel'
import ToolTraceViewer from './ToolTraceViewer'
import SettingsDialog from './SettingsDialog'

// ── Conversation List ─────────────────────────────────────

function ConversationList(): JSX.Element {
  const conversations = useChatStore((s) => s.conversations)
  const currentId = useChatStore((s) => s.currentConversationId)
  const switchConversation = useChatStore((s) => s.switchConversation)
  const deleteConversation = useChatStore((s) => s.deleteConversation)
  const createNewConversation = useChatStore((s) => s.createNewConversation)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Sidebar header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-ink-faint">
          Conversations
        </span>
        <span className="font-mono text-[10px] text-ink-faint">
          {conversations.length}
        </span>
      </div>

      {/* Conversation items */}
      <div className="flex-1 overflow-y-auto py-2">
        {conversations.map((conv, index) => (
          <div
            key={conv.id}
            onClick={() => switchConversation(conv.id)}
            className={`group relative mx-2 mb-0.5 cursor-pointer rounded-sm px-3 py-2.5 text-sm transition-all duration-200 ${
              conv.id === currentId
                ? 'bg-accent/8 text-ink'
                : 'text-ink-muted hover:bg-paper-alt hover:text-ink-soft'
            }`}
            style={{ animationDelay: `${index * 30}ms` }}
          >
            {/* Active indicator — left accent bar */}
            {conv.id === currentId && (
              <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-accent" />
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-body text-[13px] leading-tight">
                {conv.title}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (conversations.length <= 1) {
                    createNewConversation()
                    deleteConversation(conv.id)
                  } else {
                    deleteConversation(conv.id)
                  }
                }}
                className="ml-1 hidden flex-shrink-0 rounded p-0.5 text-ink-faint opacity-0 transition-all duration-200 hover:text-error group-hover:opacity-100 group-hover:block"
                title="Delete conversation"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="mt-0.5 truncate font-mono text-[10px] text-ink-faint">
              {conv.messages.length > 0
                ? `${conv.messages.length} message${conv.messages.length !== 1 ? 's' : ''}`
                : 'Empty'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Agent Selector ────────────────────────────────────────

function AgentSelector(): JSX.Element {
  const agents = useChatStore((s) => s.agents)
  const selectedAgentName = useChatStore((s) => s.selectedAgentName)
  const selectAgent = useChatStore((s) => s.selectAgent)

  return (
    <div className="relative">
      <select
        value={selectedAgentName}
        onChange={(e) => selectAgent(e.target.value)}
        className="appearance-none rounded-sm border border-border-warm bg-surface px-3 py-1.5 pr-8 font-body text-[12px] text-ink-soft focus:border-accent-light focus:outline-none max-w-[180px] truncate cursor-pointer"
      >
        {agents.map((agent) => (
          <option key={agent.name} value={agent.name}>
            {agent.name}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-ink-faint"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

// ── Model Selector ────────────────────────────────────────

function ModelSelector(): JSX.Element {
  const providers = useChatStore((s) => s.providers)
  const selectedProvider = useChatStore((s) => s.selectedProvider)
  const selectedModel = useChatStore((s) => s.selectedModel)
  const setSelectedModel = useChatStore((s) => s.setSelectedModel)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value
      if (!value) return
      const separatorIndex = value.indexOf(':::')
      if (separatorIndex === -1) return
      const provider = value.slice(0, separatorIndex)
      const model = value.slice(separatorIndex + 3)
      setSelectedModel(provider, model)
    },
    [setSelectedModel]
  )

  const currentValue =
    selectedProvider && selectedModel ? `${selectedProvider}:::${selectedModel}` : ''

  const hasProviders = providers.some((p) => p.models.length > 0)

  return (
    <div className="relative">
      <select
        value={currentValue}
        onChange={handleChange}
        className="appearance-none rounded-sm border border-border-warm bg-surface px-3 py-1.5 pr-8 font-mono text-[11px] text-ink-soft focus:border-accent-light focus:outline-none max-w-[240px] truncate cursor-pointer"
      >
        {!hasProviders && (
          <option value="" disabled>
            Configure provider in Settings
          </option>
        )}
        {providers.map((provider) =>
          provider.models.map((model) => (
            <option key={`${provider.name}:::${model}`} value={`${provider.name}:::${model}`}>
              {provider.name} / {model}
            </option>
          ))
        )}
      </select>
      {/* Custom dropdown arrow */}
      <svg
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-ink-faint"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

// ── Main Layout ───────────────────────────────────────────

export default function Layout(): JSX.Element {
  const currentConversation = useChatStore(selectCurrentConversation)
  const loadProviders = useChatStore((s) => s.loadProviders)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [codePanelOpen, setCodePanelOpen] = useState(false)

  useEffect(() => {
    loadProviders()
  }, [loadProviders])

  const lastTrace =
    currentConversation?.messages?.filter((m) => m.trace)?.pop()?.trace || []

  return (
    <div className="flex h-screen flex-col bg-paper text-ink font-body">
      {/* ── Top Bar ── */}
      <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-border bg-surface px-5 z-10 relative">
        <div className="flex items-center gap-4">
          {/* Logo / Title */}
          <div className="flex items-baseline gap-2">
            <h1 className="font-display text-lg font-semibold italic tracking-tight text-accent">
              Mathorama
            </h1>
            <span className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-ink-faint">
              Math Agent
            </span>
          </div>

          <div className="h-4 w-px bg-border" />

          {/* Current conversation title */}
          <span className="font-body text-[13px] text-ink-muted truncate max-w-[240px]">
            {currentConversation?.title || 'New Conversation'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Agent selector */}
          <AgentSelector />

          <div className="h-4 w-px bg-border" />

          {/* Model selector */}
          <ModelSelector />

          <div className="h-4 w-px bg-border" />

          {/* Settings button */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-sm p-1.5 text-ink-faint hover:bg-paper-alt hover:text-ink-soft"
            title="Settings"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* New Chat button */}
          <button
            onClick={() => useChatStore.getState().createNewConversation()}
            className="flex items-center gap-1.5 rounded-sm border border-border-warm bg-paper px-3 py-1.5 font-mono text-[11px] text-ink-muted hover:border-accent-light hover:text-accent transition-all"
            title="New conversation"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-[220px] flex-shrink-0 flex-col border-r border-border bg-paper-warm">
          <ConversationList />
        </aside>

        {/* Main area */}
        <div className="flex flex-1 flex-col overflow-hidden relative">
          {/* Chat */}
          <div className="flex-1 overflow-hidden">
            <ChatPanel />
          </div>

          {/* Collapsible Tool Trace Panel */}
          {codePanelOpen && (
            <>
              <div className="h-px bg-border flex-shrink-0" />
              <div className="flex h-[40%] flex-col overflow-hidden border-t border-border bg-surface-warm">
                <div className="flex h-9 flex-shrink-0 items-center justify-between border-b border-border px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-accent">
                      Tool Execution Trace
                    </span>
                    {lastTrace.length > 0 && (
                      <span className="rounded-full bg-accent/10 px-1.5 py-0.5 font-mono text-[9px] text-accent">
                        {lastTrace.length}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setCodePanelOpen(false)}
                    className="rounded-sm p-1 text-ink-faint hover:text-ink-soft"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <ToolTraceViewer traces={lastTrace} />
                </div>
              </div>
            </>
          )}

          {/* Toggle button when closed */}
          {!codePanelOpen && (
            <button
              onClick={() => setCodePanelOpen(true)}
              className="absolute bottom-5 right-5 z-10 flex items-center gap-1.5 rounded-sm border border-border-warm bg-surface px-3 py-1.5 font-mono text-[10px] text-ink-muted shadow-sm hover:border-accent-light hover:text-accent transition-all"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Trace
            </button>
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
