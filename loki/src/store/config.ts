import { create } from 'zustand'
import { applyTheme, getTheme, getTerminalTheme } from '@/theme'
import { terminalEmulator } from '@/terminal/emulator'
import { defaultKeyBindings, matchesKeyCombo, type KeyBindingAction, type KeyCombo } from '@/lib/keybindings'
import type { AIModel, ProviderName } from '@/ai/types'
import { BUILT_IN_MODELS } from '@/ai/types'

export type KeyBindingMap = Partial<Record<KeyBindingAction, KeyCombo>>

// ─── Per-provider config ─────────────────────────────────────────

export interface ProviderConfig {
  apiKey: string
  baseUrl: string
}

interface ConfigState {
  // Theme
  themeId: string
  fontSize: number
  fontFamily: string
  // AI behavior
  autoAnalyzeErrors: boolean
  commandSuggestions: boolean
  // Keybindings
  keybindings: KeyBindingMap
  // Model
  currentModelId: string
  customModels: AIModel[]
  // Per-provider config (Phase 4.1)
  providerConfigs: Partial<Record<ProviderName, ProviderConfig>>

  // Theme actions
  setTheme: (id: string) => void
  setFontSize: (size: number) => void
  setFontFamily: (family: string) => void
  // AI behavior actions
  setAutoAnalyzeErrors: (enabled: boolean) => void
  setCommandSuggestions: (enabled: boolean) => void
  // Keybinding actions
  setKeybinding: (action: KeyBindingAction, combo: KeyCombo) => void
  resetKeybindings: () => void
  getActionForKey: (event: KeyboardEvent) => KeyBindingAction | null
  // Model actions
  setCurrentModel: (id: string) => void
  addCustomModel: (model: AIModel) => void
  removeCustomModel: (id: string) => void
  getAllModels: () => AIModel[]
  getActiveModel: () => AIModel | undefined
  // Provider config actions (Phase 4.1)
  setProviderConfig: (provider: ProviderName, config: ProviderConfig) => void
  getProviderConfig: (provider: ProviderName) => ProviderConfig | undefined
}

const CONFIG_KEY = 'loki-config'

function loadPersisted(): {
  themeId?: string
  fontSize?: number
  fontFamily?: string
  autoAnalyzeErrors?: boolean
  commandSuggestions?: boolean
  keybindings?: KeyBindingMap
  currentModelId?: string
  customModels?: AIModel[]
  providerConfigs?: Partial<Record<ProviderName, ProviderConfig>>
} {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

function persist(state: ConfigState) {
  localStorage.setItem(
    CONFIG_KEY,
    JSON.stringify({
      themeId: state.themeId,
      fontSize: state.fontSize,
      fontFamily: state.fontFamily,
      autoAnalyzeErrors: state.autoAnalyzeErrors,
      commandSuggestions: state.commandSuggestions,
      keybindings: state.keybindings,
      currentModelId: state.currentModelId,
      customModels: state.customModels,
      providerConfigs: state.providerConfigs,
    }),
  )
}

let persistTimer: ReturnType<typeof setTimeout> | null = null

function debouncedPersist(state: ConfigState) {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => persist(state), 300)
}

const persisted = loadPersisted()

// Apply theme on module load to prevent flash of wrong theme
const initialThemeId = persisted.themeId ?? 'tokyo-night'
const initialTheme = getTheme(initialThemeId)
if (initialTheme) {
  applyTheme(initialTheme)
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  themeId: initialThemeId,
  fontSize: persisted.fontSize ?? 14,
  fontFamily: persisted.fontFamily ?? "'JetBrains Mono', 'Fira Code', monospace",
  keybindings: persisted.keybindings ?? {},
  autoAnalyzeErrors: persisted.autoAnalyzeErrors ?? true,
  commandSuggestions: persisted.commandSuggestions ?? true,
  currentModelId: persisted.currentModelId ?? 'gpt-4o-mini',
  customModels: persisted.customModels ?? [],
  providerConfigs: persisted.providerConfigs ?? {},

  setTheme: (id: string) => {
    const theme = getTheme(id)
    if (!theme) return
    applyTheme(theme)
    const terminalColors = getTerminalTheme(id)
    terminalEmulator.updateAllThemes(terminalColors)
    set({ themeId: id })
    persist(get())
  },

  setFontSize: (size: number) => {
    terminalEmulator.updateAllFontSizes(size)
    set({ fontSize: size })
    debouncedPersist(get())
  },

  setFontFamily: (family: string) => {
    terminalEmulator.updateAllFontFamilies(family)
    set({ fontFamily: family })
    debouncedPersist(get())
  },

  setAutoAnalyzeErrors: (enabled: boolean) => {
    set({ autoAnalyzeErrors: enabled })
    persist(get())
  },

  setCommandSuggestions: (enabled: boolean) => {
    set({ commandSuggestions: enabled })
    persist(get())
  },

  setKeybinding: (action: KeyBindingAction, combo: KeyCombo) => {
    set((state) => ({ keybindings: { ...state.keybindings, [action]: combo } }))
    persist(get())
  },

  resetKeybindings: () => {
    set({ keybindings: {} })
    persist(get())
  },

  getActionForKey: (event: KeyboardEvent): KeyBindingAction | null => {
    const { keybindings } = get()
    const defaults = defaultKeyBindings()
    for (const { action, combo } of defaults) {
      const override = keybindings[action]
      if (override && matchesKeyCombo(event, override)) return action
      if (!override && matchesKeyCombo(event, combo)) return action
    }
    return null
  },

  setCurrentModel: (id: string) => {
    set({ currentModelId: id })
    persist(get())
  },

  addCustomModel: (model: AIModel) => {
    set((state) => ({ customModels: [...state.customModels, model] }))
    persist(get())
  },

  removeCustomModel: (id: string) => {
    set((state) => ({ customModels: state.customModels.filter((m) => m.id !== id) }))
    persist(get())
  },

  getAllModels: (): AIModel[] => {
    return [...BUILT_IN_MODELS, ...get().customModels]
  },

  getActiveModel: (): AIModel | undefined => {
    const { currentModelId, customModels } = get()
    return BUILT_IN_MODELS.find((m) => m.id === currentModelId) ?? customModels.find((m) => m.id === currentModelId)
  },

  // ── Provider config (Phase 4.1) ──

  setProviderConfig: (provider: ProviderName, config: ProviderConfig) => {
    set((state) => ({
      providerConfigs: { ...state.providerConfigs, [provider]: config },
    }))
    persist(get())
  },

  getProviderConfig: (provider: ProviderName): ProviderConfig | undefined => {
    return get().providerConfigs[provider]
  },
}))
