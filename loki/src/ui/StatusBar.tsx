import React, { useCallback } from 'react'
import { useConfigStore } from '@/store/config'
import { useTerminalStore } from '@/store/terminal'
import { getTheme, listThemes } from '@/theme'

export const StatusBar: React.FC = React.memo(() => {
  const { themeId, fontSize, setTheme, currentModelId, getAllModels } = useConfigStore()
  const isPtyConnected = useTerminalStore(s => s.isPtyConnected)
  const modelName = getAllModels().find(m => m.id === currentModelId)?.name ?? currentModelId

  const cycleTheme = useCallback(() => {
    const themes = listThemes()
    const currentIndex = themes.findIndex(t => t.id === themeId)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex].id)
  }, [themeId, setTheme])

  const themeName = getTheme(themeId)?.name ?? themeId

  return (
    <div className="flex items-center justify-between h-6 px-3 text-xs bg-loki-sidebar border-t border-loki-border text-loki-fg/60 select-none shrink-0">
      <div className="flex items-center gap-3">
        <span
          className="cursor-pointer hover:text-loki-fg transition-colors"
          onClick={cycleTheme}
          title="Click to cycle themes"
        >
          {themeName}
        </span>
        <span>{fontSize}px</span>
        <span className="text-loki-accent">{modelName}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isPtyConnected ? 'bg-loki-block-success' : 'bg-loki-block-error'
          }`}
        />
        <span>{isPtyConnected ? 'Connected' : 'Disconnected'}</span>
      </div>
    </div>
  )
})
