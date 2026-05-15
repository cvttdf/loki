import { create } from 'zustand'
import type { PluginManifest, CommandContribution } from '@/plugin/types'

interface PluginState {
  enabledPlugins: string[]
  pluginManifests: PluginManifest[]
  registeredCommands: CommandContribution[]

  enablePlugin: (id: string) => void
  disablePlugin: (id: string) => void
  registerManifest: (manifest: PluginManifest) => void
  isEnabled: (id: string) => boolean
  registerCommand: (cmd: CommandContribution) => void
  getRegisteredPlugins: () => PluginManifest[]
}

const PLUGIN_KEY = 'loki-plugins'

function loadEnabled(): string[] {
  try {
    const raw = localStorage.getItem(PLUGIN_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function persist(enabled: string[]): void {
  localStorage.setItem(PLUGIN_KEY, JSON.stringify(enabled))
}

export const usePluginStore = create<PluginState>((set, get) => ({
  enabledPlugins: loadEnabled(),
  pluginManifests: [],
  registeredCommands: [],

  enablePlugin: (id: string) => {
    const current = get().enabledPlugins
    if (current.includes(id)) return
    const next = [...current, id]
    set({ enabledPlugins: next })
    persist(next)
  },

  disablePlugin: (id: string) => {
    const next = get().enabledPlugins.filter((p) => p !== id)
    set({ enabledPlugins: next })
    persist(next)
  },

  registerManifest: (manifest: PluginManifest) => {
    const current = get().pluginManifests
    if (current.some((m) => m.id === manifest.id)) return
    set({ pluginManifests: [...current, manifest] })
  },

  isEnabled: (id: string): boolean => {
    return get().enabledPlugins.includes(id)
  },

  registerCommand: (cmd: CommandContribution) => {
    const current = get().registeredCommands
    if (current.some((c) => c.id === cmd.id)) return
    set({ registeredCommands: [...current, cmd] })
  },

  getRegisteredPlugins: (): PluginManifest[] => {
    return get().pluginManifests
  },
}))
