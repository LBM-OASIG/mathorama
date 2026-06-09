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
      className={`mb-3 rounded-md px-3 py-2 text-xs font-medium ${
        status.type === 'success'
          ? 'border border-green-800 bg-green-900/30 text-green-400'
          : 'border border-red-800 bg-red-900/30 text-red-400'
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
      className="flex min-h-[36px] cursor-text flex-wrap items-center gap-1.5 rounded-md border border-gray-700 bg-gray-800 px-2 py-1.5"
      onClick={focusInput}
    >
      {models.map((model) => (
        <span
          key={model}
          className="inline-flex items-center gap-1 rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300"
        >
          {model}
          <button
            type="button"
            onClick={(e) => handleRemoveTag(model, e)}
            className="ml-0.5 text-blue-400 hover:text-red-400 transition-colors"
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
        className="min-w-[120px] flex-1 border-none bg-transparent px-0.5 text-sm text-gray-200 placeholder-gray-500 outline-none"
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
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    // Focus the dialog when opened
    dialogRef.current?.focus()
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // ── Reset form when dialog closes ────────────────────────

  useEffect(() => {
    if (!isOpen) {
      // Delay reset so animation can finish
      const timer = setTimeout(() => {
        setView('list')
        setForm(INITIAL_FORM)
        setEditingIndex(null)
        setStatus(null)
      }, 200)
      return () => clearTimeout(timer)
    }
    return undefined
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
    setForm((prev) => ({
      ...prev,
      models: [...prev.models, model]
    }))
  }, [])

  const removeModel = useCallback((model: string) => {
    setForm((prev) => ({
      ...prev,
      models: prev.models.filter((m) => m !== model)
    }))
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
        // Determine the provider type id
        let providerId: Provider = 'custom'
        if (trimmedName === 'openai') providerId = 'openai'
        else if (trimmedName === 'anthropic') providerId = 'anthropic'

        // Save credentials via provider API
        await window.mathorama.provider.set(trimmedName, {
          apiKey: form.apiKey,
          baseUrl: form.baseUrl || undefined
        })

        // Build updated providers record
        const allConfig = await window.mathorama.config.getAll()
        const storedProviders =
          (allConfig?.['providers'] as Record<string, { apiKey?: string; baseUrl?: string; models?: string[] }>) || {}

        // Merge: add/update this provider in the record
        storedProviders[trimmedName] = {
          apiKey: form.apiKey,
          baseUrl: form.baseUrl || undefined,
          models: form.models
        }

        // If editing and name changed, remove old entry
        if (editingIndex !== null) {
          const oldName = providers[editingIndex]?.name
          if (oldName && oldName !== trimmedName) {
            delete storedProviders[oldName]
            try {
              await window.mathorama.provider.remove(oldName)
            } catch {
              // ignore — old provider may not exist in backend
            }
          }
        }

        await window.mathorama.config.set('providers', storedProviders)

        // Reload providers into store
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
        const storedProviders =
          (allConfig?.['providers'] as Record<string, unknown>) || {}
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
      if (e.target === e.currentTarget) {
        onClose()
      }
    },
    [onClose]
  )

  // ── Get placeholder URL for preset ───────────────────────

  const getBaseUrlPlaceholder = (): string => {
    if (form.name === 'openai') return 'https://api.openai.com/v1'
    if (form.name === 'anthropic') return 'https://api.anthropic.com'
    return 'https://api.example.com/v1'
  }

  // ── Get provider type id from name ──────────────────────

  const getProviderId = (name: string): Provider => {
    if (name === 'openai') return 'openai'
    if (name === 'anthropic') return 'anthropic'
    return 'custom'
  }

  // ── Render ───────────────────────────────────────────────

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-lg border border-gray-700 bg-gray-900 shadow-2xl outline-none"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        {/* ── Header ─────────────────────────────── */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-800 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-100">
            {view === 'list' ? 'Provider Settings' : editingIndex !== null ? 'Edit Provider' : 'Add Provider'}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body ──────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <StatusToast status={status} />

          {view === 'list' ? (
            /* ── Provider List ──────────────────── */
            <div className="space-y-3">
              {providers.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">
                  No providers configured yet. Add one to get started.
                </p>
              ) : (
                providers.map((provider, index) => (
                  <div
                    key={provider.name}
                    className="flex items-center justify-between rounded-md border border-gray-800 bg-gray-800/50 px-3 py-2.5 transition-colors hover:border-gray-700"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Status indicator */}
                      <span
                        className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${
                          provider.apiKey ? 'bg-green-500' : 'bg-yellow-500'
                        }`}
                        title={provider.apiKey ? 'API key configured' : 'No API key'}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-200 truncate">
                            {provider.name}
                          </span>
                          <span className="flex-shrink-0 rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-gray-400 uppercase">
                            {getProviderId(provider.name)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {provider.models.length} model{provider.models.length !== 1 ? 's' : ''}
                          {provider.baseUrl ? ` · ${provider.baseUrl}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="ml-3 flex flex-shrink-0 items-center gap-1">
                      <button
                        onClick={() => showEditForm(index)}
                        className="rounded p-1 text-gray-500 hover:bg-gray-700 hover:text-gray-300 transition-colors"
                        title="Edit provider"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(index)}
                        className="rounded p-1 text-gray-500 hover:bg-red-900/30 hover:text-red-400 transition-colors"
                        title="Delete provider"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}

              <button
                onClick={showAddForm}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-gray-700 px-4 py-3 text-sm text-gray-400 hover:border-blue-500 hover:text-blue-400 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Provider
              </button>
            </div>
          ) : (
            /* ── Add / Edit Form ────────────────── */
            <form ref={formRef} onSubmit={handleSave} className="space-y-4">
              {/* Provider Name */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Provider Name</label>
                <div className="mb-2 flex gap-2">
                  {PRESET_PROVIDERS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setPresetName(preset.value)}
                      className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                        form.name === preset.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 border border-gray-700'
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
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">API Key</label>
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="sk-..."
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Base URL */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">
                  Base URL <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.baseUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
                  placeholder={getBaseUrlPlaceholder()}
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Models */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Models</label>
                <ModelTagsInput models={form.models} onAdd={addModel} onRemove={removeModel} />
                <p className="mt-1 text-[10px] text-gray-600">
                  Type a model name and press Enter to add. Press Backspace to remove last.
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={backToList}
                  className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Save Provider'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
