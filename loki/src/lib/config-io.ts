import { useConfigStore } from '@/store/config'
import type { KeyBindingAction, KeyCombo } from '@/lib/keybindings'
import type { AIModel, ProviderName } from '@/ai/types'

export interface LokiConfig {
  version: 1
  exportedAt: string
  themeId: string
  fontSize: number
  fontFamily: string
  autoAnalyzeErrors: boolean
  commandSuggestions: boolean
  keybindings: Record<string, KeyCombo>
  currentModelId: string
  customModels: AIModel[]
  providerConfigs: Record<string, { apiKey: string; baseUrl: string }>
}

export function exportConfig(): LokiConfig {
  const state = useConfigStore.getState()
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    themeId: state.themeId,
    fontSize: state.fontSize,
    fontFamily: state.fontFamily,
    autoAnalyzeErrors: state.autoAnalyzeErrors,
    commandSuggestions: state.commandSuggestions,
    keybindings: { ...state.keybindings } as Record<string, KeyCombo>,
    currentModelId: state.currentModelId,
    customModels: [...state.customModels],
    providerConfigs: Object.fromEntries(
      Object.entries(state.providerConfigs).filter(([, v]) => v != null),
    ) as Record<string, { apiKey: string; baseUrl: string }>,
  }
}

export function downloadConfig(): void {
  const json = JSON.stringify(exportConfig(), null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'loki-config.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function validateConfig(data: unknown): data is LokiConfig {
  if (!isRecord(data)) return false
  if (data.version !== 1) return false
  if (typeof data.themeId !== 'string') return false
  if (typeof data.fontSize !== 'number') return false
  if (typeof data.fontFamily !== 'string') return false
  if (typeof data.autoAnalyzeErrors !== 'boolean') return false
  if (typeof data.commandSuggestions !== 'boolean') return false
  if (typeof data.currentModelId !== 'string') return false
  if (!isRecord(data.keybindings)) return false
  if (!Array.isArray(data.customModels)) return false
  if (!isRecord(data.providerConfigs)) return false
  return true
}

export function importConfigFromFile(file: File): Promise<LokiConfig> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as unknown
        if (!validateConfig(parsed)) {
          reject(new Error('Invalid config file format'))
          return
        }
        resolve(parsed)
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Failed to parse config file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

export function applyConfig(config: LokiConfig): void {
  const store = useConfigStore.getState()

  store.setTheme(config.themeId)
  store.setFontSize(config.fontSize)
  store.setFontFamily(config.fontFamily)
  store.setAutoAnalyzeErrors(config.autoAnalyzeErrors)
  store.setCommandSuggestions(config.commandSuggestions)
  store.setCurrentModel(config.currentModelId)

  for (const [action, combo] of Object.entries(config.keybindings)) {
    store.setKeybinding(action as KeyBindingAction, combo as KeyCombo)
  }

  for (const { id } of store.customModels) {
    store.removeCustomModel(id)
  }

  for (const model of config.customModels) {
    store.addCustomModel(model)
  }

  // Clear existing provider configs before applying imported ones
  for (const provider of Object.keys(store.providerConfigs)) {
    store.setProviderConfig(provider as ProviderName, { apiKey: '', baseUrl: '' })
  }

  for (const [provider, cfg] of Object.entries(config.providerConfigs)) {
    store.setProviderConfig(provider as ProviderName, cfg)
  }
}

export function showToast(message: string, duration = 2000): void {
  const toast = document.createElement('div')
  toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-lg border border-loki-border bg-loki-sidebar text-loki-fg text-sm shadow-lg transition-opacity duration-300'
  toast.textContent = message
  document.body.appendChild(toast)

  requestAnimationFrame(() => {
    toast.style.opacity = '1'
  })

  setTimeout(() => {
    toast.style.opacity = '0'
    setTimeout(() => {
      if (toast.parentNode) {
        document.body.removeChild(toast)
      }
    }, 300)
  }, duration)
}
