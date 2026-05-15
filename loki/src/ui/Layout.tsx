import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { TabBar } from './TabBar'
import { TerminalView } from './Terminal'
import { ChatPanel } from './ChatPanel'
import { StatusBar } from './StatusBar'
import { ModelSwitcher } from './ModelSwitcher'
import { Settings } from './Settings'
import { useTerminalStore } from '@/store/terminal'
import { useChatStore } from '@/store/chat'
import { useConfigStore } from '@/store/config'
import { applyTheme, getTheme, listThemes } from '@/theme'
import { terminalEmulator } from '@/terminal/emulator'
import { useKeyBindings } from '@/hooks/useKeyBindings'

export const Layout: React.FC = () => {
  const { tabs, activeTabId } = useTerminalStore()
  const { isOpen } = useChatStore()
  const { themeId, setTheme, fontSize, setFontSize } = useConfigStore()
  const [showModelSwitcher, setShowModelSwitcher] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const theme = getTheme(themeId)
    if (theme) {
      applyTheme(theme)
    }
  }, [themeId])

  const handleTerminalReady = useCallback((_id: string) => {
    // TODO: wire up terminal ready state
  }, [])

  const newTab = useCallback(() => {
    const id = crypto.randomUUID()
    useTerminalStore.getState().addTab(id, 'Terminal')
  }, [])

  const closeTab = useCallback(() => {
    const { activeTabId: active, removeTab, tabs: currentTabs } = useTerminalStore.getState()
    if (active) {
      removeTab(active)
      if (currentTabs.length <= 1) return
    }
  }, [])

  const nextTab = useCallback(() => {
    const { tabs: currentTabs, activeTabId: active, setActiveTab } = useTerminalStore.getState()
    if (currentTabs.length < 2 || !active) return
    const idx = currentTabs.findIndex(t => t.id === active)
    const next = (idx + 1) % currentTabs.length
    setActiveTab(currentTabs[next].id)
  }, [])

  const prevTab = useCallback(() => {
    const { tabs: currentTabs, activeTabId: active, setActiveTab } = useTerminalStore.getState()
    if (currentTabs.length < 2 || !active) return
    const idx = currentTabs.findIndex(t => t.id === active)
    const prev = (idx - 1 + currentTabs.length) % currentTabs.length
    setActiveTab(currentTabs[prev].id)
  }, [])

  const clearTerminal = useCallback(() => {
    const active = useTerminalStore.getState().activeTabId
    if (active) terminalEmulator.clear(active)
  }, [])

  const toggleChat = useCallback(() => {
    useChatStore.getState().togglePanel()
  }, [])

  const openSettings = useCallback(() => {
    setShowSettings((prev) => !prev)
  }, [])

  const cycleTheme = useCallback(() => {
    const themes = listThemes()
    const idx = themes.findIndex(t => t.id === themeId)
    const next = themes[(idx + 1) % themes.length]
    setTheme(next.id)
  }, [themeId, setTheme])

  const increaseFont = useCallback(() => {
    setFontSize(Math.min(fontSize + 1, 32))
  }, [fontSize, setFontSize])

  const decreaseFont = useCallback(() => {
    setFontSize(Math.max(fontSize - 1, 8))
  }, [fontSize, setFontSize])

  const resetFont = useCallback(() => {
    setFontSize(14)
  }, [setFontSize])

  const selectAllBlocks = useCallback(() => {
    const active = useTerminalStore.getState().activeTabId
    if (!active) return
    const instance = terminalEmulator.getInstance(active)
    if (!instance) return
    const blocks = instance.blockManager.getAllBlocks()
    if (blocks.length === 0) return
    useTerminalStore.getState().selectAllBlocks(blocks.map(b => b.id))
  }, [])

  const copySelectedBlocks = useCallback(async () => {
    const active = useTerminalStore.getState().activeTabId
    if (!active) return
    const instance = terminalEmulator.getInstance(active)
    if (!instance) return
    const selectedIds = useTerminalStore.getState().selectedBlocks
    if (selectedIds.size === 0) return
    const selected = instance.blockManager.getAllBlocks().filter(b => selectedIds.has(b.id))
    const { copyBlocksToClipboard } = await import('@/lib/clipboard')
    copyBlocksToClipboard(selected)
  }, [])

  const clearBlockSelection = useCallback(() => {
    useTerminalStore.getState().clearSelection()
  }, [])

  const switchModel = useCallback(() => {
    setShowModelSwitcher((prev) => !prev)
  }, [])

  const handlers = useMemo(() => ({
    'new-tab': newTab,
    'close-tab': closeTab,
    'next-tab': nextTab,
    'prev-tab': prevTab,
    'clear-terminal': clearTerminal,
    'toggle-chat': toggleChat,
    'open-settings': openSettings,
    'cycle-theme': cycleTheme,
    'increase-font': increaseFont,
    'decrease-font': decreaseFont,
    'reset-font': resetFont,
    'select-all-blocks': selectAllBlocks,
    'copy-selected-blocks': copySelectedBlocks,
    'clear-block-selection': clearBlockSelection,
    'switch-model': switchModel,
  }), [newTab, closeTab, nextTab, prevTab, clearTerminal, toggleChat, openSettings, cycleTheme, increaseFont, decreaseFont, resetFont, selectAllBlocks, copySelectedBlocks, clearBlockSelection, switchModel])

  useKeyBindings(handlers)

  return (
    <div className="flex flex-col h-screen w-screen">
      {/* 标签栏 */}
      <TabBar onOpenSettings={openSettings} />
      
      {/* 主内容区域 */}
      <div className="flex-1 flex">
        {/* 终端区域 */}
        <div className={`flex-1 relative ${isOpen ? 'w-2/3' : 'w-full'}`}>
          {tabs.map(tab => (
            tab.id === activeTabId ? (
              <div
                key={tab.id}
                className="absolute inset-0"
              >
                <TerminalView
                  id={tab.id}
                  onReady={handleTerminalReady}
                />
              </div>
            ) : null
          ))}
          
          {/* 空状态 */}
          {tabs.length === 0 && (
            <div className="flex items-center justify-center h-full text-loki-fg/30">
              <div className="text-center">
                <p className="text-lg mb-2">No terminals open</p>
                <button
                  className="px-4 py-2 bg-loki-accent text-white rounded"
                  onClick={() => {
                    const id = crypto.randomUUID()
                    useTerminalStore.getState().addTab(id, 'Terminal')
                  }}
                >
                  Open Terminal
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* AI 聊天面板 */}
        {isOpen && (
          <div className="w-1/3 border-l border-loki-border">
            <ChatPanel />
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <StatusBar />

      {/* 模型切换器 */}
      <ModelSwitcher
        visible={showModelSwitcher}
        onClose={() => setShowModelSwitcher(false)}
      />

      {/* 设置面板 */}
      <Settings
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  )
}
