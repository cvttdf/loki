import React, { useRef } from 'react'
import { useConfigStore } from '@/store/config'
import { downloadConfig, importConfigFromFile, applyConfig, showToast } from '@/lib/config-io'

const FONT_FAMILIES = [
  "'JetBrains Mono', 'Fira Code', monospace",
  "'Fira Code', 'JetBrains Mono', monospace",
  "'SF Mono', 'JetBrains Mono', monospace",
  "'Cascadia Code', 'JetBrains Mono', monospace",
]

const FONT_FAMILY_LABELS = ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code']

export const GeneralTab: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    fontSize, setFontSize, fontFamily, setFontFamily,
    autoAnalyzeErrors, setAutoAnalyzeErrors,
    commandSuggestions, setCommandSuggestions,
  } = useConfigStore()

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-xs text-loki-fg/60 mb-2">
          Font Size: {fontSize}px
        </label>
        <input
          type="range"
          min={10}
          max={24}
          step={1}
          value={fontSize}
          onChange={e => setFontSize(Number(e.target.value))}
          className="w-full accent-loki-accent"
        />
        <div className="flex justify-between text-[10px] text-loki-fg/30 mt-1">
          <span>10px</span>
          <span>24px</span>
        </div>
      </div>

      <div>
        <label className="block text-xs text-loki-fg/60 mb-2">Font Family</label>
        <select
          value={fontFamily}
          onChange={e => setFontFamily(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-loki-bg text-loki-fg border border-loki-border rounded focus:outline-none focus:border-loki-accent"
        >
          {FONT_FAMILIES.map((val, i) => (
            <option key={val} value={val}>{FONT_FAMILY_LABELS[i]}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-loki-fg">Auto-analyze errors</span>
        <button
          className={`w-9 h-5 rounded-full transition-colors relative ${
            autoAnalyzeErrors ? 'bg-loki-accent' : 'bg-loki-fg/20'
          }`}
          onClick={() => setAutoAnalyzeErrors(!autoAnalyzeErrors)}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            autoAnalyzeErrors ? 'translate-x-4' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-loki-fg">Command suggestions</span>
        <button
          className={`w-9 h-5 rounded-full transition-colors relative ${
            commandSuggestions ? 'bg-loki-accent' : 'bg-loki-fg/20'
          }`}
          onClick={() => setCommandSuggestions(!commandSuggestions)}
        >
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            commandSuggestions ? 'translate-x-4' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      <div className="border-t border-loki-border pt-6 mt-6">
        <div className="text-xs text-loki-fg/40 uppercase mb-3">Import / Export</div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 text-sm bg-loki-accent text-white rounded hover:opacity-90 transition-opacity"
            onClick={() => { downloadConfig(); showToast('Exported') }}
          >
            Export Config
          </button>
          <button
            className="px-4 py-2 text-sm bg-transparent text-loki-fg/80 border border-loki-border rounded hover:border-loki-fg/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            Import Config
          </button>
          <button
            className="px-4 py-2 text-sm bg-transparent text-loki-block-error border border-transparent rounded hover:underline transition-colors"
            onClick={() => {
              if (window.confirm('Are you sure you want to reset all settings?')) {
                localStorage.removeItem('loki-config')
                window.location.reload()
              }
            }}
          >
            Reset All
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            try {
              const config = await importConfigFromFile(file)
              applyConfig(config)
              showToast('Imported')
            } catch (err) {
              showToast(err instanceof Error ? err.message : 'Import failed')
            }
            if (fileInputRef.current) fileInputRef.current.value = ''
          }}
        />
      </div>
    </div>
  )
}
