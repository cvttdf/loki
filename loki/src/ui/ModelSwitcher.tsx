import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useConfigStore } from '@/store/config'
import type { AIModel } from '@/ai/types'

interface ModelSwitcherProps {
  visible: boolean
  onClose: () => void
}

const providerBadgeColors: Record<string, string> = {
  openai: 'bg-green-500/20 text-green-400 border-green-500/30',
  anthropic: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  deepseek: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  google: 'bg-red-500/20 text-red-400 border-red-500/30',
}

function providerBadgeClass(provider: string): string {
  return providerBadgeColors[provider] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'
}

export const ModelSwitcher: React.FC<ModelSwitcherProps> = ({ visible, onClose }) => {
  const {
    currentModelId,
    setCurrentModel,
    addCustomModel,
    removeCustomModel,
    customModels,
    getAllModels,
  } = useConfigStore()

  const models = getAllModels()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  // Form state
  const [form, setForm] = useState({
    id: '',
    name: '',
    provider: '',
    baseUrl: '',
    apiKey: '',
    description: '',
  })

  // Reset selected index when models change
  useEffect(() => {
    const idx = models.findIndex((m) => m.id === currentModelId)
    setSelectedIndex(idx >= 0 ? idx : 0)
  }, [models, currentModelId])

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return

    function onKeyDown(e: KeyboardEvent) {
      if (showForm) {
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          setShowForm(false)
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          e.stopPropagation()
          setSelectedIndex((prev) => Math.min(prev + 1, models.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          e.stopPropagation()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          e.stopPropagation()
          if (models[selectedIndex]) {
            setCurrentModel(models[selectedIndex].id)
            onClose()
          }
          break
        case 'Escape':
          e.preventDefault()
          e.stopPropagation()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [visible, showForm, selectedIndex, models, setCurrentModel, onClose])

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current || showForm) return
    const items = listRef.current.querySelectorAll('[data-model-item]')
    const selected = items[selectedIndex]
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex, showForm])

  const handleSelect = useCallback(
    (id: string) => {
      setCurrentModel(id)
      onClose()
    },
    [setCurrentModel, onClose],
  )

  const handleAddCustom = useCallback(() => {
    setShowForm(true)
    setForm({ id: '', name: '', provider: '', baseUrl: '', apiKey: '', description: '' })
  }, [])

  const handleSaveCustom = useCallback(() => {
    if (!form.id.trim() || !form.name.trim() || !form.provider.trim()) return
    const model: AIModel = {
      id: form.id.trim(),
      name: form.name.trim(),
      provider: form.provider.trim(),
      baseUrl: form.baseUrl.trim() || undefined,
      apiKey: form.apiKey.trim() || undefined,
      description: form.description.trim() || undefined,
    }
    addCustomModel(model)
    const idx = getAllModels().findIndex((m) => m.id === model.id)
    setSelectedIndex(idx >= 0 ? idx : 0)
    setShowForm(false)
  }, [form, addCustomModel, getAllModels])

  const handleDeleteCustom = useCallback(
    (id: string) => {
      if (id === currentModelId && models.length > 1) {
        setCurrentModel(models[0].id)
      }
      removeCustomModel(id)
    },
    [currentModelId, models, setCurrentModel, removeCustomModel],
  )

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Panel */}
      <div
        className="relative w-96 max-h-[80vh] bg-loki-sidebar border border-loki-border rounded-lg shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-loki-border">
          <h3 className="text-loki-fg font-medium text-sm">
            {showForm ? 'Add Custom Model' : 'Switch Model'}
          </h3>
          <button
            className="text-loki-fg/60 hover:text-loki-fg text-lg leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {showForm ? (
          /* Custom model form */
          <div className="p-4 space-y-3 overflow-y-auto">
            <div>
              <label className="block text-xs text-loki-fg/60 mb-1">Model ID *</label>
              <input
                type="text"
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="e.g. my-custom-model"
                className="w-full px-3 py-1.5 text-sm bg-loki-bg text-loki-fg border border-loki-border rounded focus:outline-none focus:border-loki-accent"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs text-loki-fg/60 mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. My Model"
                className="w-full px-3 py-1.5 text-sm bg-loki-bg text-loki-fg border border-loki-border rounded focus:outline-none focus:border-loki-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-loki-fg/60 mb-1">Provider *</label>
              <input
                type="text"
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                placeholder="e.g. openai, anthropic, custom"
                className="w-full px-3 py-1.5 text-sm bg-loki-bg text-loki-fg border border-loki-border rounded focus:outline-none focus:border-loki-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-loki-fg/60 mb-1">API Base URL</label>
              <input
                type="text"
                value={form.baseUrl}
                onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className="w-full px-3 py-1.5 text-sm bg-loki-bg text-loki-fg border border-loki-border rounded focus:outline-none focus:border-loki-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-loki-fg/60 mb-1">API Key</label>
              <input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full px-3 py-1.5 text-sm bg-loki-bg text-loki-fg border border-loki-border rounded focus:outline-none focus:border-loki-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-loki-fg/60 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional description"
                className="w-full px-3 py-1.5 text-sm bg-loki-bg text-loki-fg border border-loki-border rounded focus:outline-none focus:border-loki-accent"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                className="flex-1 px-3 py-1.5 text-sm bg-loki-accent text-white rounded hover:opacity-90 disabled:opacity-50"
                onClick={handleSaveCustom}
                disabled={!form.id.trim() || !form.name.trim() || !form.provider.trim()}
              >
                Save
              </button>
              <button
                className="px-3 py-1.5 text-sm bg-loki-bg text-loki-fg/60 border border-loki-border rounded hover:text-loki-fg"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Model list */
          <>
            <div ref={listRef} className="flex-1 overflow-y-auto py-2" role="listbox">
              {models.map((model, index) => {
                const isActive = model.id === currentModelId
                const isCustom = !model.baseUrl && !model.apiKey
                  ? false
                  : customModels.some((m) => m.id === model.id)

                return (
                  <div
                    key={model.id}
                    data-model-item
                    role="option"
                    aria-selected={isActive}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                      index === selectedIndex
                        ? 'bg-loki-accent/10'
                        : 'hover:bg-loki-bg'
                    }`}
                    onClick={() => handleSelect(model.id)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    {/* Active indicator */}
                    <div
                      className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                        isActive
                          ? 'border-loki-accent bg-loki-accent'
                          : 'border-loki-fg/30'
                      }`}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-loki-fg truncate">
                          {model.name}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded border ${providerBadgeClass(
                            model.provider,
                          )}`}
                        >
                          {model.provider}
                        </span>
                      </div>
                      {model.description && (
                        <div className="text-xs text-loki-fg/40 mt-0.5 truncate">
                          {model.description}
                        </div>
                      )}
                    </div>

                    {/* Delete button for custom models */}
                    {isCustom && (
                      <button
                        className="text-loki-fg/30 hover:text-loki-block-error text-sm leading-none flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteCustom(model.id)
                        }}
                        title="Remove model"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="border-t border-loki-border p-2">
              <button
                className={`w-full px-3 py-2 text-sm rounded transition-colors ${
                  selectedIndex === models.length
                    ? 'bg-loki-accent/10 text-loki-accent'
                    : 'text-loki-fg/60 hover:text-loki-fg hover:bg-loki-bg'
                }`}
                onClick={handleAddCustom}
                onMouseEnter={() => setSelectedIndex(models.length)}
              >
                + Add Custom Model
              </button>
            </div>

            {/* Keyboard hint */}
            <div className="px-4 py-2 border-t border-loki-border text-[10px] text-loki-fg/30 flex gap-3">
              <span>↑↓ Navigate</span>
              <span>Enter Select</span>
              <span>Esc Close</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
