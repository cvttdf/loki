import React, { useState, useEffect } from 'react'
import { GeneralTab } from './settings/GeneralTab'
import { ThemeTab } from './settings/ThemeTab'
import { ModelsTab } from './settings/ModelsTab'
import { KeybindingsTab } from './settings/KeybindingsTab'
import { McpTab } from './settings/McpTab'
import { PluginManager } from './PluginManager'

type SettingsTab = 'general' | 'theme' | 'models' | 'keybindings' | 'plugins' | 'mcp'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'theme', label: 'Theme' },
  { id: 'models', label: 'AI Models' },
  { id: 'keybindings', label: 'Keybindings' },
  { id: 'plugins', label: 'Plugins' },
  { id: 'mcp', label: 'MCP' },
]

interface SettingsProps {
  visible: boolean
  onClose: () => void
}

export const Settings: React.FC<SettingsProps> = ({ visible, onClose }) => {
  const [tab, setTab] = useState<SettingsTab>('general')

  // Close on Escape
  useEffect(() => {
    if (!visible) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [visible, onClose])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-[400px] bg-loki-sidebar border-l border-loki-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-loki-border shrink-0">
          <h2 className="text-loki-fg font-medium text-sm">Settings</h2>
          <button
            className="text-loki-fg/60 hover:text-loki-fg text-lg leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-loki-border shrink-0">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                tab === t.id
                  ? 'text-loki-accent border-b-2 border-loki-accent'
                  : 'text-loki-fg/50 hover:text-loki-fg/80'
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'general' && <GeneralTab />}
          {tab === 'theme' && <ThemeTab />}
          {tab === 'models' && <ModelsTab />}
          {tab === 'keybindings' && <KeybindingsTab />}
          {tab === 'plugins' && <PluginManager />}
          {tab === 'mcp' && <McpTab />}
        </div>
      </div>
    </div>
  )
}
