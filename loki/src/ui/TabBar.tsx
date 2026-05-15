import React from 'react'
import { useTerminalStore } from '@/store/terminal'
import { defaultKeyBindings, formatKeyCombo } from '@/lib/keybindings'

function getHint(action: string): string {
  const defs = defaultKeyBindings()
  const match = defs.find(d => d.action === action)
  return match ? formatKeyCombo(match.combo) : ''
}

const GearIcon: React.FC = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
)

interface TabBarProps {
  onOpenSettings?: () => void
}

export const TabBar: React.FC<TabBarProps> = React.memo(({ onOpenSettings }) => {
  const { tabs, activeTabId, setActiveTab, removeTab, addTab } = useTerminalStore()

  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    removeTab(id)
  }

  const handleNewTab = () => {
    const id = crypto.randomUUID()
    addTab(id, 'Terminal')
  }

  const newTabHint = getHint('new-tab')
  const closeTabHint = getHint('close-tab')

  return (
    <div className="flex items-center h-10 bg-loki-sidebar border-b border-loki-border">
      {tabs.map(tab => {
        const isActive = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            className={`
              flex items-center h-full px-4 cursor-pointer
              border-r border-loki-border
              ${isActive
                ? 'bg-loki-bg text-loki-fg'
                : 'text-loki-fg/60 hover:text-loki-fg'}
            `}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="text-sm truncate max-w-[120px]">
              {tab.title}
            </span>
            <button
              className="ml-2 opacity-50 hover:opacity-100"
              onClick={(e) => handleClose(e, tab.id)}
              title={`Close tab (${closeTabHint})`}
            >
              ×
            </button>
          </div>
        )
      })}

      <button
        className="px-3 h-full text-loki-fg/60 hover:text-loki-fg hover:bg-loki-bg/50"
        onClick={handleNewTab}
        title={`New tab (${newTabHint})`}
      >
        +
      </button>

      <div className="flex-1" />

      {onOpenSettings && (
        <button
          className="px-3 h-full text-loki-fg/60 hover:text-loki-fg hover:bg-loki-bg/50"
          onClick={onOpenSettings}
          title={`Settings (${getHint('open-settings')})`}
        >
          <GearIcon />
        </button>
      )}
    </div>
  )
})
