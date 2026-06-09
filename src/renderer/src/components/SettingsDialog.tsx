import { useState, useEffect, useRef, useCallback } from 'react'
import { useChatStore } from '../store/chatStore'
import type { Provider } from '../types'

// ── Types ──────────────────────────────────────────────────

interface ProviderFormData {
  name: string
  apiKey: string
  baseUrl: string
  models: string[]
}

const INITIAL_FORM: ProviderFormData = {
  name: '',
  apiKey: '',
  baseUrl: '',
  models: []
}

const PRESET_PROVIDERS: { label: string; value: string; placeholder: string }[] = [
  { label: 'OpenAI', value: 'openai', placeholder: 'https://api.openai.com/v1' },
  { label: 'Anthropic', value: 'anthropic', placeholder: 'https://api.anthropic.com' },
  { label: 'Custom', value: 'custom', placeholder: 'https://api.example.com/v1' }
]

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

// ── Status Toast ──────────────────────────────────────────

interface StatusMessage {
  type: 'success' | 'error'
  text: string
}

function StatusToast({ status }: { status: StatusMessage | null }): JSX.Element | null {
  if (!status) return null
  return (
    <div
      className={`mb-4 rounded-sm px-4 py-2.5 font-mono text-[11px] font-medium ${
        status.type === 'success'
          ? 'border border-success-border bg-success-bg text-success'
          : 'border border-error-border bg-error-bg text-error'
      }`}
    >
      {status.text}
    </div>
  )
}

// ── Model Tag Input ───────────────────────────────────────

interface ModelTagsInputProps {
  models: string[]
  onAdd: (model: string) => void
  onRemove: (model: string) => void
}

function ModelTagsInput({ models, onAdd, onRemove }: ModelTagsInputProps): JSX.Element {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const trimmed = inputValue.trim()
        if (trimmed && !models.includes(trimmed)) {
          onAdd(trimmed)
          setInputValue('')
        }
      } else if (e.key === 'Backspace' && inputValue === '' && models.length > 0) {
        onRemove(models[models.length - 1])
      }
    },
    [inputValue, models, onAdd, onRemove]
  )

  const handleRemoveTag = useCallback(
    (model: string, e: React.MouseEvent) => {
      e.stopPropagation()
      onRemove(model)
      inputRef.current?.focus()
    },
    [onRemove]
  )

  const focusInput = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div
      className="flex min-h-[40px] cursor-text flex-wrap items-center gap-1.5 rounded-sm border border-border-warm bg-surface px-3 py-2 hover:border-border-dark transition-colors"
      onClick={focusInput}
    >
      {models.map((model) => (
        <span
          key={model}
          className="inline-flex items-center gap-1 rounded-sm bg-accent/8 px-2 py-0.5 font-mono text-[11px] text-accent"
        >
          {model}
          <button
            type="button"
            onClick={(e) => handleRemoveTag(model, e)}
            className="ml-0.5 text-accent/60 hover:text-error transition-colors"
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={models.length === 0 ? 'Type model name and press Enter...' : ''}
        className="min-w-[120px] flex-1 border-none bg-transparent px-0.5 font-body text-[13px] text-ink placeholder-ink-faint outline-none"
      />
    </div>
  )
}

// ── Settings Dialog ───────────────────────────────────────

export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps): JSX.Element | null {
  const providers = useChatStore((s) => s.providers)
  const loadProviders = useChatStore((s) => s.loadProviders)

  const [view, setView] = useState<'list' | 'form'>('list')
  const [form, setForm] = useState<ProviderFormData>(INITIAL_FORM)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [status, setStatus] = useState<StatusMessage | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [tab, setTab] = useState<'providers' | 'python' | 'about'>('providers')
  const [pythonPath, setPythonPath] = useState('')
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  const dialogRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // ── Dismiss status after timeout ─────────────────────────

  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 4000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [status])

  // ── Handle Escape key ────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    dialogRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // ── Reset form when dialog closes ────────────────────────

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setView('list')
        setForm(INITIAL_FORM)
        setEditingIndex(null)
        setStatus(null)
        setTab('providers')
        setTestResult(null)
      }, 200)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isOpen])

  // ── Load python path when dialog opens ───────────────────

  useEffect(() => {
    if (isOpen) {
      window.mathorama.config.get('pythonPath').then((path) => {
        setPythonPath(typeof path === 'string' ? path : 'python')
      })
    }
  }, [isOpen])

  // ── Handlers ─────────────────────────────────────────────

  const showAddForm = useCallback(() => {
    setForm(INITIAL_FORM)
    setEditingIndex(null)
    setView('form')
  }, [])

  const showEditForm = useCallback(
    (index: number) => {
      const p = providers[index]
      setForm({
        name: p.name,
        apiKey: p.apiKey,
        baseUrl: p.baseUrl || '',
        models: [...p.models]
      })
      setEditingIndex(index)
      setView('form')
    },
    [providers]
  )

  const backToList = useCallback(() => {
    setView('list')
    setForm(INITIAL_FORM)
    setEditingIndex(null)
    setStatus(null)
  }, [])

  const setPresetName = useCallback((name: string) => {
    setForm((prev) => ({ ...prev, name }))
  }, [])

  const addModel = useCallback((model: string) => {
    setForm((prev) => ({ ...prev, models: [...prev.models, model] }))
  }, [])

  const removeModel = useCallback((model: string) => {
    setForm((prev) => ({ ...prev, models: prev.models.filter((m) => m !== model) }))
  }, [])

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const trimmedName = form.name.trim()
      if (!trimmedName) {
        setStatus({ type: 'error', text: 'Provider name is required.' })
        return
      }
      if (form.models.length === 0) {
        setStatus({ type: 'error', text: 'Add at least one model.' })
        return
      }

      setIsSaving(true)
      setStatus(null)

      try {
        let providerId: Provider = 'custom'
        if (trimmedName === 'openai') providerId = 'openai'
        else if (trimmedName === 'anthropic') providerId = 'anthropic'

        await window.mathorama.provider.set(trimmedName, {
          apiKey: form.apiKey,
          baseUrl: form.baseUrl || undefined
        })

        const allConfig = await window.mathorama.config.getAll()
        const storedProviders =
          (allConfig?.['providers'] as Record<string, { apiKey?: string; baseUrl?: string; models?: string[] }>) || {}

        storedProviders[trimmedName] = {
          apiKey: form.apiKey,
          baseUrl: form.baseUrl || undefined,
          models: form.models
        }

        if (editingIndex !== null) {
          const oldName = providers[editingIndex]?.name
          if (oldName && oldName !== trimmedName) {
            delete storedProviders[oldName]
            try {
              await window.mathorama.provider.remove(oldName)
            } catch {
              // ignore
            }
          }
        }

        await window.mathorama.config.set('providers', storedProviders)
        await loadProviders()

        setStatus({ type: 'success', text: `Provider "${trimmedName}" saved successfully.` })
        setView('list')
        setForm(INITIAL_FORM)
        setEditingIndex(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save provider.'
        setStatus({ type: 'error', text: message })
      } finally {
        setIsSaving(false)
      }
    },
    [form, editingIndex, providers, loadProviders]
  )

  const handleDelete = useCallback(
    async (index: number) => {
      const provider = providers[index]
      if (!provider) return
      try {
        await window.mathorama.provider.remove(provider.name)
        const allConfig = await window.mathorama.config.getAll()
        const storedProviders = (allConfig?.['providers'] as Record<string, unknown>) || {}
        delete storedProviders[provider.name]
        await window.mathorama.config.set('providers', storedProviders)
        await loadProviders()
        setStatus({ type: 'success', text: `Provider "${provider.name}" removed.` })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete provider.'
        setStatus({ type: 'error', text: message })
      }
    },
    [providers, loadProviders]
  )

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose]
  )

  const handleTabChange = useCallback((newTab: 'providers' | 'python' | 'about') => {
    if (tab === 'python' && newTab !== 'python') {
      window.mathorama.config.set('pythonPath', pythonPath)
    }
    setTab(newTab)
    setTestResult(null)
  }, [tab, pythonPath])

  const handleTestConnection = useCallback(async () => {
    setIsTesting(true)
    setTestResult(null)
    await window.mathorama.config.set('pythonPath', pythonPath)
    try {
      const result = await window.mathorama.python.execute('import sys; print(sys.version)')
      if (result.exitCode === 0 && result.stdout.trim()) {
        setTestResult({ type: 'success', text: result.stdout.trim() })
      } else if (result.error) {
        setTestResult({ type: 'error', text: result.error })
      } else {
        setTestResult({ type: 'error', text: result.stderr.trim() || 'Unknown error' })
      }
    } catch (err) {
      setTestResult({ type: 'error', text: err instanceof Error ? err.message : 'Connection failed' })
    } finally {
      setIsTesting(false)
    }
  }, [pythonPath])

  const handleClose = useCallback(() => {
    window.mathorama.config.set('pythonPath', pythonPath)
    onClose()
  }, [pythonPath, onClose])

  const getBaseUrlPlaceholder = (): string => {
    if (form.name === 'openai') return 'https://api.openai.com/v1'
    if (form.name === 'anthropic') return 'https://api.anthropic.com'
    return 'https://api.example.com/v1'
  }

  const getProviderId = (name: string): Provider => {
    if (name === 'openai') return 'openai'
    if (name === 'anthropic') return 'anthropic'
    return 'custom'
  }

  // ── Render ───────────────────────────────────────────────

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-sm border border-border-dark bg-paper shadow-2xl outline-none animate-fade-in-up"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-display text-lg font-semibold italic text-ink">
            Settings
          </h2>
          <button
            onClick={handleClose}
            className="rounded-sm p-1.5 text-ink-faint hover:bg-paper-alt hover:text-ink-soft"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Tab Bar — elegant underline style */}
          <div className="mb-6 flex gap-6 border-b border-border pb-0">
            {(['providers', 'python', 'about'] as const).map((t) => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className={`relative pb-2.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em] transition-colors ${
                  tab === t
                    ? 'text-accent'
                    : 'text-ink-faint hover:text-ink-muted'
                }`}
              >
                {t}
                {tab === t && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Providers Tab */}
          {tab === 'providers' && (
            <>
              <StatusToast status={status} />

              {view === 'list' ? (
                <div className="space-y-3">
                  {providers.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="font-body text-sm text-ink-muted">
                        No providers configured yet.
                      </p>
                      <p className="mt-1 font-mono text-[10px] text-ink-faint">
                        Add one to get started.
                      </p>
                    </div>
                  ) : (
                    providers.map((provider, index) => (
                      <div
                        key={provider.name}
                        className="group flex items-center justify-between rounded-sm border border-border bg-surface px-4 py-3 transition-all hover:border-border-dark hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${
                              provider.apiKey ? 'bg-success' : 'bg-accent-terracotta'
                            }`}
                            title={provider.apiKey ? 'API key configured' : 'No API key'}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-body text-[13px] font-medium text-ink-soft truncate">
                                {provider.name}
                              </span>
                              <span className="flex-shrink-0 rounded-sm bg-paper-alt px-1.5 py-0.5 font-mono text-[9px] text-ink-faint uppercase tracking-wider">
                                {getProviderId(provider.name)}
                              </span>
                            </div>
                            <p className="font-mono text-[10px] text-ink-faint truncate">
                              {provider.models.length} model{provider.models.length !== 1 ? 's' : ''}
                              {provider.baseUrl ? ` · ${provider.baseUrl}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="ml-3 flex flex-shrink-0 items-center gap-1">
                          <button
                            onClick={() => showEditForm(index)}
                            className="rounded-sm p-1.5 text-ink-faint hover:bg-paper-alt hover:text-ink-soft"
                            title="Edit provider"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(index)}
                            className="rounded-sm p-1.5 text-ink-faint hover:bg-error-bg hover:text-error"
                            title="Delete provider"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  <button
                    onClick={showAddForm}
                    className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-border-warm px-4 py-3 font-mono text-[11px] text-ink-faint hover:border-accent-light hover:text-accent transition-all"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Provider
                  </button>
                </div>
              ) : (
                <form ref={formRef} onSubmit={handleSave} className="space-y-5">
                  <div>
                    <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-muted">
                      Provider Name
                    </label>
                    <div className="mb-2 flex gap-2">
                      {PRESET_PROVIDERS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setPresetName(preset.value)}
                          className={`rounded-sm px-3 py-1.5 font-mono text-[11px] font-medium transition-all ${
                            form.name === preset.value
                              ? 'bg-accent text-white'
                              : 'bg-surface text-ink-muted hover:bg-paper-alt hover:text-ink-soft border border-border'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. my-openai, anthropic"
                      className="w-full rounded-sm border border-border-warm bg-surface px-3 py-2 font-body text-[13px] text-ink placeholder-ink-faint"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-muted">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={form.apiKey}
                      onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="sk-..."
                      className="w-full rounded-sm border border-border-warm bg-surface px-3 py-2 font-body text-[13px] text-ink placeholder-ink-faint"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-muted">
                      Base URL <span className="normal-case text-ink-faint">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={form.baseUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
                      placeholder={getBaseUrlPlaceholder()}
                      className="w-full rounded-sm border border-border-warm bg-surface px-3 py-2 font-body text-[13px] text-ink placeholder-ink-faint"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-muted">
                      Models
                    </label>
                    <ModelTagsInput models={form.models} onAdd={addModel} onRemove={removeModel} />
                    <p className="mt-1.5 font-mono text-[9px] text-ink-faint">
                      Type a model name and press Enter to add. Press Backspace to remove last.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={backToList}
                      className="rounded-sm border border-border px-4 py-2 font-mono text-[11px] text-ink-muted hover:bg-paper-alt hover:text-ink-soft"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="rounded-sm bg-accent px-5 py-2 font-mono text-[11px] font-medium text-white hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isSaving ? 'Saving...' : 'Save Provider'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* Python Tab */}
          {tab === 'python' && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-ink-muted">
                  Python Path
                </label>
                <input
                  type="text"
                  value={pythonPath}
                  onChange={(e) => setPythonPath(e.target.value)}
                  placeholder="python"
                  className="w-full rounded-sm border border-border-warm bg-surface px-3 py-2 font-body text-[13px] text-ink placeholder-ink-faint"
                />
                <p className="mt-1.5 font-mono text-[10px] text-ink-faint leading-relaxed">
                  Path to Python executable. Can be a full path (e.g. C:\Python313\python.exe) or just 'python' to use PATH.
                </p>
              </div>

              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="rounded-sm bg-accent px-5 py-2 font-mono text-[11px] font-medium text-white hover:bg-accent-light disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>

              {testResult && (
                <div
                  className={`rounded-sm px-4 py-2.5 font-mono text-[11px] ${
                    testResult.type === 'success'
                      ? 'border border-success-border bg-success-bg text-success'
                      : 'border border-error-border bg-error-bg text-error'
                  }`}
                >
                  {testResult.text}
                </div>
              )}
            </div>
          )}

          {/* About Tab */}
          {tab === 'about' && (
            <div className="space-y-5">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-xl font-semibold italic text-ink">Mathorama</span>
                <span className="rounded-sm bg-paper-alt px-2 py-0.5 font-mono text-[10px] text-ink-faint">v0.1.0</span>
              </div>
              <p className="font-body text-[13px] text-ink-muted leading-relaxed">
                An AI-powered mathematics assistant. Language models collaborate with Python's scientific computing stack to solve mathematical problems with precision and clarity.
              </p>

              <div className="border-t border-border pt-4">
                <p className="mb-2 font-mono text-[9px] font-medium uppercase tracking-[0.15em] text-ink-faint">
                  Technology
                </p>
                <p className="font-body text-[13px] text-ink-muted">
                  Electron, React, TypeScript, Python (SymPy, NumPy, Matplotlib)
                </p>
              </div>

              <div>
                <p className="mb-2 font-mono text-[9px] font-medium uppercase tracking-[0.15em] text-ink-faint">
                  Required Python Packages
                </p>
                <code className="block rounded-sm border border-border bg-paper-warm px-4 py-3 font-mono text-[11px] text-ink-muted">
                  pip install sympy matplotlib numpy
                </code>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
