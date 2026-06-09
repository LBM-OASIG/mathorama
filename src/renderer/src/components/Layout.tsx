import { useRef, useCallback } from 'react'
import { useChatStore, selectCurrentConversation } from '../store/chatStore'
import ChatPanel from './ChatPanel'
import CodeEditor from './CodeEditor'
import OutputPanel from './OutputPanel'

// ── Resizable Horizontal Split ────────────────────────────

interface ResizableSplitProps {
  left: React.ReactNode
  right: React.ReactNode
  defaultLeftWidth?: number
  minLeftWidth?: number
  minRightWidth?: number
}

function ResizableSplit({
  left,
  right,
  defaultLeftWidth = 50,
  minLeftWidth = 30,
  minRightWidth = 30
}: ResizableSplitProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    const container = containerRef.current
    if (!container) return

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current || !container) return
      const rect = container.getBoundingClientRect()
      const percentage = ((ev.clientX - rect.left) / rect.width) * 100
      const clamped = Math.max(minLeftWidth, Math.min(100 - minRightWidth, percentage))
      container.style.setProperty('--left-panel-width', `${clamped}%`)
    }

    const handleMouseUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [minLeftWidth, minRightWidth])

  return (
    <div
      ref={containerRef}
      className="flex flex-1 overflow-hidden"
      style={{ '--left-panel-width': `${defaultLeftWidth}%` } as React.CSSProperties}
    >
      <div
        className="flex flex-col overflow-hidden"
        style={{ width: 'var(--left-panel-width)', minWidth: `${minLeftWidth}%` }}
      >
        {left}
      </div>

      {/* Resize handle */}
      <div
        className="w-1 cursor-col-resize bg-gray-700 hover:bg-blue-500 active:bg-blue-400 transition-colors flex-shrink-0"
        onMouseDown={handleMouseDown}
      />

      <div className="flex flex-1 flex-col overflow-hidden" style={{ minWidth: `${minRightWidth}%` }}>
        {right}
      </div>
    </div>
  )
}

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

// ── Right Panel (Editor + Output with vertical resizable split) ─

function RightPanel(): JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    const top = topRef.current
    if (!top) return

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current || !top) return
      const rect = top.getBoundingClientRect()
      const height = rect.bottom - rect.top
      const percentage = ((ev.clientY - rect.top) / height) * 100
      const clamped = Math.max(25, Math.min(75, percentage))
      top.style.setProperty('--editor-height', `${clamped}%`)
    }

    const handleMouseUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  return (
    <div
      ref={topRef}
      className="flex flex-1 flex-col overflow-hidden bg-gray-950"
      style={{ '--editor-height': '60%' } as React.CSSProperties}
    >
      <div className="flex flex-col" style={{ height: 'var(--editor-height)', minHeight: '25%' }}>
        {/* Tab bar */}
        <div className="flex h-8 flex-shrink-0 items-center border-b border-gray-800 bg-gray-900 px-3">
          <span className="text-xs font-medium text-blue-400">Code Editor</span>
        </div>
        <CodeEditor />
      </div>

      {/* Vertical resize handle */}
      <div
        className="h-1 cursor-row-resize bg-gray-700 hover:bg-blue-500 active:bg-blue-400 transition-colors flex-shrink-0"
        onMouseDown={handleMouseDown}
      />

      <div ref={bottomRef} className="flex flex-1 flex-col overflow-hidden" style={{ minHeight: '25%' }}>
        <div className="flex h-8 flex-shrink-0 items-center justify-between border-b border-gray-800 bg-gray-900 px-3">
          <span className="text-xs font-medium text-gray-400">Output</span>
        </div>
        <OutputPanel />
      </div>
    </div>
  )
}

// ── Main Layout ───────────────────────────────────────────

export default function Layout(): JSX.Element {
  const currentConversation = useChatStore(selectCurrentConversation)

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
          {/* Model selector */}
          <select className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-300 focus:border-blue-500 focus:outline-none">
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="claude-3-opus">Claude 3 Opus</option>
            <option value="claude-3-sonnet">Claude 3 Sonnet</option>
          </select>

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

      {/* Body: conversation sidebar + resizable split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation list sidebar */}
        <aside className="flex w-56 flex-shrink-0 flex-col border-r border-gray-800 bg-gray-900/50">
          <ConversationList />
        </aside>

        <ResizableSplit
          left={<ChatPanel />}
          right={<RightPanel />}
          defaultLeftWidth={45}
          minLeftWidth={30}
          minRightWidth={25}
        />
      </div>
    </div>
  )
}
