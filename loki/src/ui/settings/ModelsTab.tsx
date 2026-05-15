import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useConfigStore } from '@/store/config'
import { getProviderDefaultBaseUrl, type AIModel, type ProviderName } from '@/ai/types'

const PROVIDERS: ProviderName[] = ['openai', 'anthropic', 'deepseek', 'ollama']

const providerBadgeColors: Record<string, string> = {
  openai: 'bg-green-500/20 text-green-400 border-green-500/30',
  anthropic: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  deepseek: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  google: 'bg-red-500/20 text-red-400 border-red-500/30',
  ollama: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

export const ModelsTab: React.FC = () => {
  const {
    currentModelId, setCurrentModel,
    customModels, addCustomModel, removeCustomModel,
    getAllModels,
    providerConfigs, setProviderConfig,
  } = useConfigStore()

  const models = getAllModels()

  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customForm, setCustomForm] = useState({ id: '', name: '', provider: '', baseUrl: '', apiKey: '', description: '' })

  // Local state for provider inputs — only persist on blur/Enter (O9)
  const [localKeys, setLocalKeys] = useState<Partial<Record<ProviderName, string>>>({})
  const [localUrls, setLocalUrls] = useState<Partial<Record<ProviderName, string>>>({})
  const initialized = useRef(false)

  // Sync local state from store on first load
  useEffect(() => {
    if (!initialized.current) {
      const keys: Partial<Record<ProviderName, string>> = {}
      const urls: Partial<Record<ProviderName, string>> = {}
      for (const p of PROVIDERS) {
        keys[p] = providerConfigs[p]?.apiKey ?? ''
        urls[p] = providerConfigs[p]?.baseUrl ?? ''
      }
      setLocalKeys(keys)
      setLocalUrls(urls)
      initialized.current = true
    }
  }, [providerConfigs])

  const handleKeyBlur = useCallback((provider: ProviderName) => {
    const key = localKeys[provider] ?? ''
    const url = localUrls[provider] ?? getProviderDefaultBaseUrl(provider)
    setProviderConfig(provider, { apiKey: key, baseUrl: url })
  }, [localKeys, localUrls, setProviderConfig])

  const handleKeyEnter = useCallback((e: React.KeyboardEvent, provider: ProviderName) => {
    if (e.key === 'Enter') {
      const key = localKeys[provider] ?? ''
      const url = localUrls[provider] ?? getProviderDefaultBaseUrl(provider)
      setProviderConfig(provider, { apiKey: key, baseUrl: url })
    }
  }, [localKeys, localUrls, setProviderConfig])

  const handleUrlBlur = useCallback((provider: ProviderName) => {
    const key = localKeys[provider] ?? ''
    const url = localUrls[provider] ?? ''
    setProviderConfig(provider, { apiKey: key, baseUrl: url })
  }, [localKeys, localUrls, setProviderConfig])

  const handleSaveCustom = useCallback(() => {
    if (!customForm.id.trim() || !customForm.name.trim() || !customForm.provider.trim()) return
    const model: AIModel = {
      id: customForm.id.trim(),
      name: customForm.name.trim(),
      provider: customForm.provider.trim(),
      baseUrl: customForm.baseUrl.trim() || undefined,
      apiKey: customForm.apiKey.trim() || undefined,
      description: customForm.description.trim() || undefined,
    }
    addCustomModel(model)
    setShowCustomForm(false)
  }, [customForm, addCustomModel])

  const handleDeleteCustom = useCallback((id: string) => {
    if (id === currentModelId && models.length > 1) {
      setCurrentModel(models[0].id)
    }
    removeCustomModel(id)
  }, [currentModelId, models, setCurrentModel, removeCustomModel])

  return (
    <div className="space-y-4">
      {/* Current model display */}
      <div className="p-3 rounded-lg bg-loki-bg border border-loki-border">
        <div className="text-[10px] text-loki-fg/40 uppercase mb-1">Current Model</div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-loki-fg font-medium">
            {models.find(m => m.id === currentModelId)?.name ?? currentModelId}
          </span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
            providerBadgeColors[models.find(m => m.id === currentModelId)?.provider ?? ''] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'
          }`}>
            {models.find(m => m.id === currentModelId)?.provider}
          </span>
        </div>
      </div>

      {showCustomForm ? (
        <div className="space-y-3 p-3 rounded-lg bg-loki-bg border border-loki-border">
          <div className="text-xs text-loki-fg/40 uppercase">Add Custom Model</div>
          <input type="text" placeholder="Model ID *" value={customForm.id}
            onChange={e => setCustomForm({ ...customForm, id: e.target.value })}
            className="w-full px-3 py-1.5 text-sm bg-loki-sidebar text-loki-fg border border-loki-border rounded focus:outline-none focus:border-loki-accent" />
          <input type="text" placeholder="Name *" value={customForm.name}
            onChange={e => setCustomForm({ ...customForm, name: e.target.value })}
            className="w-full px-3 py-1.5 text-sm bg-loki-sidebar text-loki-fg border border-loki-border rounded focus:outline-none focus:border-loki-accent" />
          <input type="text" placeholder="Provider *" value={customForm.provider}
            onChange={e => setCustomForm({ ...customForm, provider: e.target.value })}
            className="w-full px-3 py-1.5 text-sm bg-loki-sidebar text-loki-fg border border-loki-border rounded focus:outline-none focus:border-loki-accent" />
          <input type="text" placeholder="API Base URL" value={customForm.baseUrl}
            onChange={e => setCustomForm({ ...customForm, baseUrl: e.target.value })}
            className="w-full px-3 py-1.5 text-sm bg-loki-sidebar text-loki-fg border border-loki-border rounded focus:outline-none focus:border-loki-accent" />
          <input type="password" placeholder="API Key" value={customForm.apiKey}
            onChange={e => setCustomForm({ ...customForm, apiKey: e.target.value })}
            className="w-full px-3 py-1.5 text-sm bg-loki-sidebar text-loki-fg border border-loki-border rounded focus:outline-none focus:border-loki-accent" />
          <input type="text" placeholder="Description" value={customForm.description}
            onChange={e => setCustomForm({ ...customForm, description: e.target.value })}
            className="w-full px-3 py-1.5 text-sm bg-loki-sidebar text-loki-fg border border-loki-border rounded focus:outline-none focus:border-loki-accent" />
          <div className="flex gap-2">
            <button onClick={handleSaveCustom}
              disabled={!customForm.id.trim() || !customForm.name.trim() || !customForm.provider.trim()}
              className="flex-1 px-3 py-1.5 text-sm bg-loki-accent text-white rounded hover:opacity-90 disabled:opacity-50">
              Save
            </button>
            <button onClick={() => setShowCustomForm(false)}
              className="px-3 py-1.5 text-sm bg-loki-bg text-loki-fg/60 border border-loki-border rounded hover:text-loki-fg">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {models.map(model => {
            const isActive = model.id === currentModelId
            const isCustom = customModels.some(m => m.id === model.id)
            return (
              <div
                key={model.id}
                className={`flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-colors ${
                  isActive ? 'bg-loki-accent/10' : 'hover:bg-loki-bg'
                }`}
                onClick={() => setCurrentModel(model.id)}
              >
                <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                  isActive ? 'border-loki-accent bg-loki-accent' : 'border-loki-fg/30'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-loki-fg truncate">{model.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${providerBadgeColors[model.provider] ?? 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                      {model.provider}
                    </span>
                  </div>
                  {model.description && (
                    <div className="text-xs text-loki-fg/40 truncate">{model.description}</div>
                  )}
                </div>
                {isCustom && (
                  <button
                    className="text-loki-fg/30 hover:text-loki-block-error text-sm flex-shrink-0"
                    onClick={e => { e.stopPropagation(); handleDeleteCustom(model.id) }}
                  >
                    ×
                  </button>
                )}
              </div>
            )
          })}
          <button
            className="w-full px-3 py-2 text-sm text-loki-fg/60 hover:text-loki-fg hover:bg-loki-bg rounded transition-colors"
            onClick={() => setShowCustomForm(true)}
          >
            + Add Custom Model
          </button>
        </div>
      )}

      {/* Provider configs */}
      <div className="border-t border-loki-border pt-4">
        <div className="text-xs text-loki-fg/40 uppercase mb-3">Provider API Keys</div>
        {PROVIDERS.map(provider => (
          <div key={provider} className="mb-3">
            <div className="text-[10px] text-loki-fg/50 mb-1 capitalize">{provider}</div>
            <input
              type="password"
              placeholder="API Key"
              value={localKeys[provider] ?? ''}
              onChange={e => setLocalKeys(prev => ({ ...prev, [provider]: e.target.value }))}
              onBlur={() => handleKeyBlur(provider)}
              onKeyDown={e => handleKeyEnter(e, provider)}
              className="w-full px-3 py-1.5 text-sm bg-loki-bg text-loki-fg border border-loki-border rounded focus:outline-none focus:border-loki-accent mb-1"
            />
            <input
              type="text"
              placeholder="Base URL"
              value={localUrls[provider] ?? ''}
              onChange={e => setLocalUrls(prev => ({ ...prev, [provider]: e.target.value }))}
              onBlur={() => handleUrlBlur(provider)}
              className="w-full px-3 py-1.5 text-sm bg-loki-bg text-loki-fg border border-loki-border rounded focus:outline-none focus:border-loki-accent"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
