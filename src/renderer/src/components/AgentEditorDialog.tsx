import { useState, useEffect, useCallback } from 'react'
import { useChatStore } from '../store/chatStore'
import type { AgentConfig } from '../types'

interface AgentEditorDialogProps {
  isOpen: boolean
  onClose: () => void
}

const TOOL_OPTIONS = [
  { value: 'evaluate_expression', label: 'evaluate_expression' },
  { value: 'solve_equation', label: 'solve_equation' },
  { value: 'simplify', label: 'simplify' },
  { value: 'differentiate', label: 'differentiate' },
  { value: 'integrate', label: 'integrate' },
  { value: 'plot', label: 'plot' }
]

function emptyAgent(): AgentConfig {
  return {
    name: '',
    description: '',
    provider: 'openai',
    model: 'gpt-4o',
    system_prompt: '',
    params: { temperature: 0.3, max_tokens: 4096 },
    tools: []
  }
}

export default function AgentEditorDialog({ isOpen, onClose }: AgentEditorDialogProps): JSX.Element | null {
  const agents = useChatStore((s) => s.agents)
  const updateAgents = useChatStore((s) => s.updateAgents)
  const providers = useChatStore((s) => s.providers)

  const [editIndex, setEditIndex] = useState(-1)
  const [form, setForm] = useState<AgentConfig>(emptyAgent())
  const [dirty, setDirty] = useState(false)

  // Reset when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (agents.length > 0) {
        setEditIndex(0)
        setForm({ ...agents[0] })
      } else {
        setEditIndex(-1)
        setForm(emptyAgent())
      }
      setDirty(false)
    }
  }, [isOpen, agents])

  const handleField = useCallback(<K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }, [])

  const handleParam = useCallback((key: string, value: number | string | undefined) => {
    setForm(prev => ({
      ...prev,
      params: { ...prev.params, [key]: value }
    }))
    setDirty(true)
  }, [])

  const toggleTool = useCallback((tool: string) => {
    setForm(prev => ({
      ...prev,
      tools: prev.tools.includes(tool)
        ? prev.tools.filter(t => t !== tool)
        : [...prev.tools, tool]
    }))
    setDirty(true)
  }, [])

  const selectAgent = useCallback((idx: number) => {
    if (dirty) {
      // Auto-save current before switching
      const updated = [...agents]
      if (editIndex >= 0 && editIndex < updated.length) {
        const trimmed = form.name.trim()
        updated[editIndex] = { ...form, name: trimmed || updated[editIndex].name }
      }
      updateAgents(updated)
    }
    setEditIndex(idx)
    setForm({ ...agents[idx] })
    setDirty(false)
  }, [dirty, editIndex, form, agents, updateAgents])

  const addAgent = useCallback(() => {
    setEditIndex(-1)
    setForm(emptyAgent())
    setDirty(false)
  }, [])

  const deleteAgent = useCallback(() => {
    if (editIndex < 0 || editIndex >= agents.length) return
    const updated = agents.filter((_, i) => i !== editIndex)
    updateAgents(updated)
    // Selection handled by updateAgents
  }, [editIndex, agents, updateAgents])

  const save = useCallback(() => {
    const trimmed = form.name.trim()
    if (!trimmed) return

    let updated: AgentConfig[]
    if (editIndex >= 0 && editIndex < agents.length) {
      updated = agents.map((a, i) => (i === editIndex ? { ...form, name: trimmed } : a))
    } else {
      // New agent — check for duplicate name
      if (agents.some(a => a.name === trimmed)) {
        const suffix = Date.now().toString().slice(-4)
        updated = [...agents, { ...form, name: `${trimmed}-${suffix}` }]
      } else {
        updated = [...agents, { ...form, name: trimmed }]
      }
    }
    updateAgents(updated)
    setDirty(false)
  }, [form, editIndex, agents, updateAgents])

  if (!isOpen) return null

  const isNew = editIndex < 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="mx-4 flex max-h-[85vh] w-full max-w-[700px] flex-col rounded-md border border-border bg-surface shadow-xl">
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold italic text-accent">Edit Agents</h2>
          <button
            onClick={onClose}
            className="rounded-sm p-1 text-ink-faint hover:text-ink-soft"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Agent list sidebar */}
          <div className="flex w-[180px] flex-shrink-0 flex-col border-r border-border bg-paper-warm">
            <div className="flex-1 overflow-y-auto p-2">
              {agents.map((a, i) => (
                <button
                  key={a.name}
                  onClick={() => selectAgent(i)}
                  className={`w-full rounded-sm px-3 py-2 text-left text-[12px] transition ${
                    i === editIndex
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-ink-muted hover:bg-paper-alt hover:text-ink-soft'
                  }`}
                >
                  <div className="truncate">{a.name}</div>
                  <div className="truncate font-mono text-[9px] text-ink-faint">
                    {a.provider}/{a.model}
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t border-border p-2">
              <button
                onClick={addAgent}
                className={`w-full rounded-sm py-1.5 font-mono text-[10px] transition ${
                  isNew
                    ? 'bg-accent text-white'
                    : 'border border-border-warm text-ink-muted hover:border-accent-light hover:text-accent'
                }`}
              >
                + New Agent
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Name */}
              <Field label="Name">
                <input
                  value={form.name}
                  onChange={(e) => handleField('name', e.target.value)}
                  className="w-full rounded-sm border border-border-warm bg-paper px-3 py-1.5 font-body text-[13px] text-ink focus:border-accent-light focus:outline-none"
                  placeholder="Agent name"
                />
              </Field>

              {/* Description */}
              <Field label="Description">
                <input
                  value={form.description || ''}
                  onChange={(e) => handleField('description', e.target.value)}
                  className="w-full rounded-sm border border-border-warm bg-paper px-3 py-1.5 font-body text-[13px] text-ink focus:border-accent-light focus:outline-none"
                  placeholder="Short description"
                />
              </Field>

              {/* Provider + Model */}
              <div className="flex gap-3">
                <Field label="Provider" className="flex-1">
                  <input
                    value={form.provider}
                    onChange={(e) => handleField('provider', e.target.value)}
                    className="w-full rounded-sm border border-border-warm bg-paper px-3 py-1.5 font-mono text-[12px] text-ink focus:border-accent-light focus:outline-none"
                    placeholder="e.g. openai"
                  />
                </Field>
                <Field label="Model" className="flex-1">
                  <input
                    value={form.model}
                    onChange={(e) => handleField('model', e.target.value)}
                    className="w-full rounded-sm border border-border-warm bg-paper px-3 py-1.5 font-mono text-[12px] text-ink focus:border-accent-light focus:outline-none"
                    placeholder="e.g. gpt-4o"
                  />
                </Field>
              </div>

              {/* System Prompt */}
              <Field label="System Prompt">
                <textarea
                  value={form.system_prompt}
                  onChange={(e) => handleField('system_prompt', e.target.value)}
                  className="w-full min-h-[100px] rounded-sm border border-border-warm bg-paper px-3 py-2 font-body text-[12px] leading-relaxed text-ink focus:border-accent-light focus:outline-none resize-y"
                  placeholder="Instructions for the agent..."
                  rows={5}
                />
              </Field>

              {/* Params */}
              <div>
                <h3 className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-faint">
                  Parameters
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Temperature">
                    <input
                      type="number"
                      min={0}
                      max={2}
                      step={0.1}
                      value={form.params.temperature ?? ''}
                      onChange={(e) => handleParam('temperature', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="w-full rounded-sm border border-border-warm bg-paper px-3 py-1.5 font-mono text-[12px] text-ink focus:border-accent-light focus:outline-none"
                    />
                  </Field>
                  <Field label="Max Tokens">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={form.params.max_tokens ?? ''}
                      onChange={(e) => handleParam('max_tokens', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full rounded-sm border border-border-warm bg-paper px-3 py-1.5 font-mono text-[12px] text-ink focus:border-accent-light focus:outline-none"
                    />
                    <p className="mt-1 font-mono text-[9px] text-ink-faint">
                      GPT-4o: 16K · DeepSeek-R1: 64K (incl. reasoning) · DeepSeek-V4: 384K · o1/o3: 100K
                    </p>
                  </Field>
                  <Field label="Top P">
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={form.params.top_p ?? ''}
                      onChange={(e) => handleParam('top_p', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="w-full rounded-sm border border-border-warm bg-paper px-3 py-1.5 font-mono text-[12px] text-ink focus:border-accent-light focus:outline-none"
                    />
                  </Field>
                  <Field label="Reasoning Effort">
                    <select
                      value={form.params.reasoning_effort ?? ''}
                      onChange={(e) => handleParam('reasoning_effort', e.target.value || undefined)}
                      className="w-full rounded-sm border border-border-warm bg-paper px-3 py-1.5 font-mono text-[12px] text-ink focus:border-accent-light focus:outline-none"
                    >
                      <option value="">None</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </Field>
                </div>
              </div>

              {/* Tools */}
              <div>
                <h3 className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-faint">
                  Tools
                </h3>
                <div className="flex flex-wrap gap-2">
                  {TOOL_OPTIONS.map((tool) => (
                    <label
                      key={tool.value}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-sm border px-2.5 py-1 font-mono text-[11px] transition ${
                        form.tools.includes(tool.value)
                          ? 'border-accent/40 bg-accent/8 text-accent'
                          : 'border-border-warm text-ink-muted hover:border-accent-light'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.tools.includes(tool.value)}
                        onChange={() => toggleTool(tool.value)}
                        className="sr-only"
                      />
                      {tool.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between border-t border-border px-5 py-3">
              <button
                onClick={deleteAgent}
                disabled={isNew || agents.length <= 1}
                className="rounded-sm px-3 py-1.5 font-mono text-[11px] text-error hover:bg-error/5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Delete
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="rounded-sm border border-border-warm px-4 py-1.5 font-mono text-[11px] text-ink-muted hover:text-ink-soft"
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={!form.name.trim()}
                  className="rounded-sm bg-accent px-4 py-1.5 font-mono text-[11px] text-white hover:bg-accent-light disabled:opacity-40"
                >
                  {isNew ? 'Create' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Field wrapper ─────────────────────────────────────────

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }): JSX.Element {
  return (
    <div className={className}>
      <label className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-faint">
        {label}
      </label>
      {children}
    </div>
  )
}
