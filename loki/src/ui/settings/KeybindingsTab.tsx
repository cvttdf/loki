import React, { useState, useEffect } from 'react'
import { useConfigStore } from '@/store/config'
import { defaultKeyBindings, formatKeyCombo, type KeyBindingAction, type KeyCombo } from '@/lib/keybindings'

export const KeybindingsTab: React.FC = () => {
  const { keybindings, setKeybinding, resetKeybindings } = useConfigStore()
  const [rebinding, setRebinding] = useState<KeyBindingAction | null>(null)

  const defaults = defaultKeyBindings()

  // Listen for keybinding rebind
  useEffect(() => {
    if (!rebinding) return
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') { setRebinding(null); return }
      if (['Control', 'Shift', 'Meta', 'Alt'].includes(e.key)) return
      const combo: KeyCombo = {
        key: e.key,
        ctrlKey: e.ctrlKey || e.metaKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
      }
      setKeybinding(rebinding, combo)
      setRebinding(null)
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [rebinding, setKeybinding])

  const resolveCombo = (action: KeyBindingAction) => {
    const override = keybindings[action]
    if (override) return formatKeyCombo(override)
    const def = defaults.find(d => d.action === action)
    return def ? formatKeyCombo(def.combo) : '—'
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-loki-fg/40 uppercase">Keyboard Shortcuts</span>
        <button
          className="text-xs text-loki-fg/50 hover:text-loki-fg transition-colors"
          onClick={resetKeybindings}
        >
          Reset to defaults
        </button>
      </div>
      <div className="text-[10px] text-loki-fg/30 mb-2">
        Click a shortcut to rebind it. Press Escape to cancel.
      </div>
      {defaults.map(({ action, label }) => {
        const isRebinding = rebinding === action
        return (
          <div
            key={action}
            className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${
              isRebinding
                ? 'bg-loki-accent/20 text-loki-accent'
                : 'hover:bg-loki-bg'
            }`}
            onClick={() => setRebinding(isRebinding ? null : action)}
          >
            <span className="text-sm text-loki-fg">{label}</span>
            <span className={`text-xs px-2 py-0.5 rounded border font-mono ${
              isRebinding
                ? 'border-loki-accent text-loki-accent bg-loki-accent/10'
                : keybindings[action]
                  ? 'border-loki-fg/30 text-loki-accent'
                  : 'border-transparent text-loki-fg/40'
            }`}>
              {isRebinding ? 'Press keys...' : resolveCombo(action)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
