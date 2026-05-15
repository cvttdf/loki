import type { PluginStorage } from './types'

export function createPluginStorage(pluginId: string): PluginStorage {
  const prefix = `loki-plugin-${pluginId}-`

  return {
    get<T>(key: string): T | undefined {
      try {
        const raw = localStorage.getItem(prefix + key)
        if (raw === null) return undefined
        return JSON.parse(raw) as T
      } catch {
        return undefined
      }
    },

    set<T>(key: string, value: T): void {
      localStorage.setItem(prefix + key, JSON.stringify(value))
    },

    delete(key: string): void {
      localStorage.removeItem(prefix + key)
    },
  }
}
