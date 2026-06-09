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
      <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Conversations</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => switchConversation(conv.id)}
            className={`group flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors ${
              conv.id === currentId
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
            }`}
          >
            <span className="truncate text-xs">{conv.title}</span>
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
              className="ml-2 hidden rounded p-0.5 text-gray-600 hover:text-red-400 group-hover:block"
              title="Delete conversation"
            >
              ×
            </button>
          </div>
        ))}
      </div>
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

      // Value format: "provider:::model"
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

  // Build flat list of options with provider prefix
  const hasProviders = providers.some((p) => p.models.length > 0)

  return (
    <select
      value={currentValue}
      onChange={handleChange}
      className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none max-w-[280px] truncate"
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
  )
}

// ── Main Layout ───────────────────────────────────────────

export default function Layout(): JSX.Element {
  const currentConversation = useChatStore(selectCurrentConversation)
  const loadProviders = useChatStore((s) => s.loadProviders)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [codePanelOpen, setCodePanelOpen] = useState(false)

  // Load providers on mount
  useEffect(() => {
    loadProviders()
  }, [loadProviders])

  // Get traces from the last assistant message that has a trace
  const lastTrace =
    currentConversation?.messages?.filter((m) => m.trace)?.pop()?.trace || []

  return (
    <div className="flex h-screen flex-col bg-gray-950 text-gray-100">
      {/* Top Bar */}
      <header className="flex h-10 flex-shrink-0 items-center justify-between border-b border-gray-800 bg-gray-900 px-4">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold tracking-wide text-blue-400">Mathorama</h1>
          <span className="text-xs text-gray-600">|</span>
          <span className="text-xs text-gray-500 truncate max-w-[200px]">
            {currentConversation?.title || 'Math Agent Platform'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Dynamic model selector */}
          <ModelSelector />

          {/* Settings gear button */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
            title="Settings"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
            className="rounded px-3 py-1 text-xs text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            title="New conversation"
          >
            + New Chat
          </button>
        </div>
      </header>

      {/* Body: conversation sidebar + main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation list sidebar (fixed 56px / w-56) */}
        <aside className="flex w-56 flex-shrink-0 flex-col border-r border-gray-800 bg-gray-900/50">
          <ConversationList />
        </aside>

        {/* Main area: Chat + optional collapsible code panel */}
        <div className="flex flex-1 flex-col overflow-hidden relative">
          {/* Chat takes all available space */}
          <div className="flex-1 overflow-hidden">
            <ChatPanel />
          </div>

          {/* Collapsible Code Panel */}
          {codePanelOpen && (
            <>
              <div className="h-1 cursor-row-resize bg-gray-700 flex-shrink-0" />
              <div className="flex h-[40%] flex-col overflow-hidden border-t border-gray-800 bg-gray-900">
                <div className="flex h-8 flex-shrink-0 items-center justify-between border-b border-gray-800 px-3">
                  <span className="text-xs font-medium text-blue-400">
                    {codePanelOpen ? '\u25BE' : '\u25B4'} Tool Execution Trace
                  </span>
                  <button
                    onClick={() => setCodePanelOpen(false)}
                    className="text-xs text-gray-500 hover:text-white transition-colors"
                  >
                    &times;
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3">
                  <ToolTraceViewer traces={lastTrace} />
                </div>
              </div>
            </>
          )}

          {/* Code toggle button - floating at bottom-right of chat area */}
          {!codePanelOpen && (
            <button
              onClick={() => setCodePanelOpen(true)}
              className="absolute bottom-4 right-4 z-10 rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-400 shadow-lg hover:bg-gray-700 hover:text-white transition-colors"
            >
              Code {'\u25B4'}
            </button>
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
