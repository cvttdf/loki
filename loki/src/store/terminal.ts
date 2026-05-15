import { create } from 'zustand'
import { terminalEmulator } from '@/terminal/emulator'
import { tauri } from '@/lib/tauri'

interface Tab {
  id: string
  title: string
  // isActive 已移除 — 使用 activeTabId 派生判断，避免冗余状态不一致
}

interface TerminalState {
  tabs: Tab[]
  activeTabId: string | null
  isPtyConnected: boolean
  collapsedBlocks: Set<string>
  selectedBlocks: Set<string>
  pinnedBlocks: Set<string>
  searchQuery: string
  searchMatches: string[]
  isSearchOpen: boolean
  currentDirectory: string

  addTab: (id: string, title: string) => void
  removeTab: (id: string) => void
  setActiveTab: (id: string) => void
  updateTabTitle: (id: string, title: string) => void
  setPtyConnected: (connected: boolean) => void
  toggleBlockCollapse: (id: string) => void
  clearAllBlocks: () => void
  clearBlockCollapse: () => void

  toggleBlockSelection: (id: string) => void
  selectBlockRange: (fromId: string, toId: string, allIds: string[]) => void
  selectAllBlocks: (ids: string[]) => void
  clearSelection: () => void

  toggleBlockPin: (id: string) => void
  setSearchQuery: (query: string) => void
  setSearchMatches: (matches: string[]) => void
  setSearchOpen: (open: boolean) => void
  rerunBlock: (id: string) => void
  setCurrentDirectory: (dir: string) => void
}

export const useTerminalStore = create<TerminalState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  isPtyConnected: false,
  collapsedBlocks: new Set<string>(),
  selectedBlocks: new Set<string>(),
  pinnedBlocks: new Set<string>(),
  searchQuery: '',
  searchMatches: [],
  isSearchOpen: false,
  currentDirectory: '',

  setPtyConnected: (connected) => set({ isPtyConnected: connected }),

  toggleBlockCollapse: (id) => {
    const next = new Set(get().collapsedBlocks)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    set({ collapsedBlocks: next })
  },

  clearAllBlocks: () => {
    set({ collapsedBlocks: new Set() })
  },

  clearBlockCollapse: () => {
    set({ collapsedBlocks: new Set() })
  },

  toggleBlockSelection: (id) => {
    const next = new Set(get().selectedBlocks)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    set({ selectedBlocks: next })
  },

  selectBlockRange: (fromId, toId, allIds) => {
    const fromIdx = allIds.indexOf(fromId)
    const toIdx = allIds.indexOf(toId)
    if (fromIdx === -1 || toIdx === -1) return
    const start = Math.min(fromIdx, toIdx)
    const end = Math.max(fromIdx, toIdx)
    const next = new Set<string>()
    for (let i = start; i <= end; i++) {
      next.add(allIds[i])
    }
    set({ selectedBlocks: next })
  },

  selectAllBlocks: (ids) => {
    set({ selectedBlocks: new Set(ids) })
  },

  clearSelection: () => {
    set({ selectedBlocks: new Set() })
  },

  toggleBlockPin: (id) => {
    const next = new Set(get().pinnedBlocks)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    set({ pinnedBlocks: next })
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query })
  },

  setSearchMatches: (matches) => {
    set({ searchMatches: matches })
  },

  setSearchOpen: (open) => {
    set({ isSearchOpen: open })
  },

  rerunBlock: (id) => {
    const { activeTabId } = get()
    if (!activeTabId) return
    const instance = terminalEmulator.getInstance(activeTabId)
    if (!instance || !instance.ptyId) return
    const block = instance.blockManager.getBlock(id)
    if (!block || !block.command) return
    const data = new TextEncoder().encode(block.command + '\n')
    tauri.writePty(instance.ptyId, data).catch(console.error)
  },

  setCurrentDirectory: (dir) => set({ currentDirectory: dir }),

  addTab: (id, title) => {
    const { tabs } = get()
    const newTab: Tab = {
      id,
      title,
    }
    
    set({
      tabs: [...tabs, newTab],
      activeTabId: id,
    })
  },

  removeTab: (id) => {
    const { tabs, activeTabId } = get()
    const filteredTabs = tabs.filter(t => t.id !== id)
    
    let newActiveId = activeTabId
    if (activeTabId === id) {
      newActiveId = filteredTabs.length > 0 ? filteredTabs[filteredTabs.length - 1].id : null
    }
    
    set({
      tabs: filteredTabs,
      activeTabId: newActiveId,
    })
  },

  setActiveTab: (id) => {
    set({
      activeTabId: id,
    })
  },

  updateTabTitle: (id, title) => {
    set({
      tabs: get().tabs.map(t =>
        t.id === id ? { ...t, title } : t
      ),
    })
  },
}))

// 导出辅助 selector：派生 isActive，供 TabBar 等组件使用
export const selectIsTabActive = (tabId: string) => (state: TerminalState) =>
  state.activeTabId === tabId
