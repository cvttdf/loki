import React from 'react'
import { useConfigStore } from '@/store/config'
import { listThemes } from '@/theme'

export const ThemeTab: React.FC = () => {
  const { themeId, setTheme } = useConfigStore()
  const themes = listThemes()

  return (
    <div className="grid grid-cols-2 gap-3">
      {themes.map(t => {
        const isActive = t.id === themeId
        return (
          <button
            key={t.id}
            className={`p-3 rounded-lg border text-left transition-colors ${
              isActive
                ? 'border-loki-accent bg-loki-accent/10'
                : 'border-loki-border hover:border-loki-fg/30'
            }`}
            onClick={() => setTheme(t.id)}
          >
            <div className="flex gap-1.5 mb-2">
              <span className="w-4 h-4 rounded-full border border-loki-border" style={{ background: t.colors.bg }} />
              <span className="w-4 h-4 rounded-full border border-loki-border" style={{ background: t.colors.fg }} />
              <span className="w-4 h-4 rounded-full border border-loki-border" style={{ background: t.colors.accent }} />
              <span className="w-4 h-4 rounded-full border border-loki-border" style={{ background: t.colors.border }} />
            </div>
            <div className="text-sm text-loki-fg font-medium">{t.name}</div>
            {isActive && (
              <div className="text-[10px] text-loki-accent mt-0.5">Active</div>
            )}
          </button>
        )
      })}
    </div>
  )
}
