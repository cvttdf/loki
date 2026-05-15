import React, { useMemo } from 'react'
import { usePluginStore } from '@/store/plugins'
import { pluginLoader } from '@/plugin/loader'
import type { PluginCapability } from '@/plugin/types'

const CAPABILITY_LABELS: Record<PluginCapability, { label: string; color: string }> = {
  'terminal:read': { label: 'Term Read', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  'terminal:decorate': { label: 'Term Decorate', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
  'ai:chat': { label: 'AI Chat', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  'ui:register-panel': { label: 'Register Panel', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  'command:register': { label: 'Register Cmd', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  'theme:register': { label: 'Register Theme', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
}

function CapabilityBadge({ cap }: { cap: PluginCapability }) {
  const info = CAPABILITY_LABELS[cap] ?? { label: cap, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${info.color}`}>
      {info.label}
    </span>
  )
}

export const PluginManager: React.FC = () => {
  const { enabledPlugins, enablePlugin, disablePlugin, isEnabled, pluginManifests } = usePluginStore()

  const loadedIds = useMemo(() => new Set(pluginLoader.getLoadedPlugins().map((p) => p.manifest.id)), [])

  const handleToggle = (id: string) => {
    if (isEnabled(id)) {
      disablePlugin(id)
      pluginLoader.unload(id)
    } else {
      enablePlugin(id)
    }
  }

  if (pluginManifests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-3xl mb-3 text-loki-fg/20">🔌</div>
        <p className="text-sm text-loki-fg/40 mb-2">No plugins installed</p>
        <p className="text-xs text-loki-fg/20 mb-4">
          Drop a plugin folder to get started.
        </p>
        <button
          className="px-4 py-2 text-sm bg-loki-bg text-loki-fg/60 border border-loki-border rounded hover:text-loki-fg hover:border-loki-fg/40 transition-colors"
          onClick={() => {
            // Shows plugin path in console for now — filesystem access comes later
            console.log('Plugin directory: ~/.loki/plugins/')
          }}
        >
          Open Plugin Folder
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {pluginManifests.map((manifest) => {
        const enabled = isEnabled(manifest.id)
        const loaded = loadedIds.has(manifest.id)
        return (
          <div
            key={manifest.id}
            className={`p-3 rounded-lg border transition-colors ${
              enabled
                ? 'border-loki-accent/40 bg-loki-accent/5'
                : 'border-loki-border bg-loki-bg'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm text-loki-fg font-medium truncate">
                    {manifest.name}
                  </span>
                  <span className="text-[10px] text-loki-fg/30">v{manifest.version}</span>
                  {loaded && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-loki-fg/40 mb-1.5 line-clamp-2">
                  {manifest.description}
                </p>
                <div className="text-[10px] text-loki-fg/30 mb-1.5">
                  by {manifest.author}
                </div>
                <div className="flex flex-wrap gap-1">
                  {manifest.capabilities.map((cap) => (
                    <CapabilityBadge key={cap} cap={cap} />
                  ))}
                </div>
              </div>
              <button
                className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                  enabled ? 'bg-loki-accent' : 'bg-loki-fg/20'
                }`}
                onClick={() => handleToggle(manifest.id)}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    enabled ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
