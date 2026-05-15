import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { terminalEmulator } from '@/terminal/emulator'
import type { Block } from '@/terminal/block-manager'
import { useTerminalStore } from '@/store/terminal'
import { copyBlocksToClipboard } from '@/lib/clipboard'
import { tauri } from '@/lib/tauri'
import { BlockView } from './BlockView'
import { SelectionToolbar } from './BlockToolbar'

interface BlockListProps {
  terminalId: string
}

export const BlockList: React.FC<BlockListProps> = ({ terminalId }) => {
  const [blocks, setBlocks] = useState<Block[]>([])
  const parentRef = useRef<HTMLDivElement>(null)
  const collapsedBlocks = useTerminalStore(s => s.collapsedBlocks)
  const selectedBlocks = useTerminalStore(s => s.selectedBlocks)
  const pinnedBlocks = useTerminalStore(s => s.pinnedBlocks)
  const searchQuery = useTerminalStore(s => s.searchQuery)
  const searchMatches = useTerminalStore(s => s.searchMatches)
  const isSearchOpen = useTerminalStore(s => s.isSearchOpen)
  const toggleBlockCollapse = useTerminalStore(s => s.toggleBlockCollapse)
  const toggleBlockSelection = useTerminalStore(s => s.toggleBlockSelection)
  const selectBlockRange = useTerminalStore(s => s.selectBlockRange)
  const clearSelection = useTerminalStore(s => s.clearSelection)
  const toggleBlockPin = useTerminalStore(s => s.toggleBlockPin)
  const rerunBlock = useTerminalStore(s => s.rerunBlock)
  const setSearchOpen = useTerminalStore(s => s.setSearchOpen)

  // Track the last clicked block for shift+click range selection
  const lastClickedRef = useRef<string | null>(null)

  useEffect(() => {
    const instance = terminalEmulator.getInstance(terminalId)
    if (!instance) return

    const bm = instance.blockManager

    const initial = bm.getAllBlocks()
    setBlocks(initial)

    const d1 = bm.on('block-created', () => {
      setBlocks(bm.getAllBlocks())
    })

    const d2 = bm.on('block-finished', () => {
      setBlocks(bm.getAllBlocks())
    })

    const d3 = bm.on('block-updated', () => {
      setBlocks(bm.getAllBlocks())
    })

    return () => {
      d1.dispose()
      d2.dispose()
      d3.dispose()
    }
  }, [terminalId])

  // Clear selection when switching away or blocks change
  useEffect(() => {
    return () => {
      clearSelection()
    }
  }, [terminalId, clearSelection])

  // Sort blocks: pinned first, then unpinned (maintain order within groups)
  const sortedBlocks = useMemo(() => {
    const pinned: Block[] = []
    const unpinned: Block[] = []
    for (const b of blocks) {
      if (pinnedBlocks.has(b.id)) {
        pinned.push(b)
      } else {
        unpinned.push(b)
      }
    }
    return [...pinned, ...unpinned]
  }, [blocks, pinnedBlocks])

  // Filter blocks by search query
  const displayBlocks = useMemo(() => {
    if (!searchQuery && searchMatches.length === 0) return sortedBlocks
    const matchSet = new Set(searchMatches)
    return sortedBlocks.filter(b => matchSet.has(b.id))
  }, [sortedBlocks, searchQuery, searchMatches])

  const displayBlocksRef = useRef(displayBlocks)
  displayBlocksRef.current = displayBlocks

  const estimateSize = useCallback((index: number) => {
    const block = displayBlocksRef.current[index]
    if (!block) return 60
    return collapsedBlocks.has(block.id) ? 60 : 200
  }, [collapsedBlocks])

  const virtualizer = useVirtualizer({
    count: displayBlocks.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 5,
  })

  // Auto-scroll to bottom when a new block is added
  useEffect(() => {
    if (displayBlocks.length > 0) {
      virtualizer.scrollToIndex(displayBlocks.length - 1, { align: 'end' })
    }
  }, [displayBlocks.length])

  // Re-measure items after collapse toggle
  useEffect(() => {
    virtualizer.measure()
  }, [collapsedBlocks])

  // Keyboard shortcut: Cmd/Ctrl+F to open search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        const el = document.activeElement
        if (!el) return
        if (el.closest('.block-list') || el.closest('.block-container') || el.closest('.block-search-bar')) {
          e.preventDefault()
          e.stopPropagation()
          setSearchOpen(true)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [setSearchOpen])

  const handleCopy = useCallback((blockId: string) => {
    const instance = terminalEmulator.getInstance(terminalId)
    if (!instance) return
    const block = instance.blockManager.getBlock(blockId)
    if (!block) return
    navigator.clipboard.writeText(block.plainText).catch(() => {
      // Fallback: clipboard API may fail in some contexts
    })
  }, [terminalId])

  const handleBlockClick = useCallback((blockId: string, event: React.MouseEvent) => {
    const isShift = event.shiftKey
    const isMod = event.metaKey || event.ctrlKey

    if (isShift && lastClickedRef.current) {
      selectBlockRange(lastClickedRef.current, blockId, sortedBlocks.map(b => b.id))
    } else if (isMod) {
      toggleBlockSelection(blockId)
      lastClickedRef.current = blockId
    } else {
      clearSelection()
      lastClickedRef.current = blockId
    }
  }, [sortedBlocks, toggleBlockSelection, selectBlockRange, clearSelection])

  const handleCopySelected = useCallback(async () => {
    const instance = terminalEmulator.getInstance(terminalId)
    if (!instance) return
    const selected = instance.blockManager.getAllBlocks().filter(b => selectedBlocks.has(b.id))
    if (selected.length === 0) return
    copyBlocksToClipboard(selected)
  }, [terminalId, selectedBlocks])

  const handleClearSelection = useCallback(() => {
    clearSelection()
    lastClickedRef.current = null
  }, [clearSelection])

  const handleAnalyzeError = useCallback((blockId: string) => {
    const instance = terminalEmulator.getInstance(terminalId)
    if (!instance) return
    const block = instance.blockManager.getBlock(blockId)
    if (!block) return
    instance.errorAnalyzer.analyze(blockId, block.command, block.exitCode, block.rawContent).catch(() => {})
  }, [terminalId])

  const selectedCount = selectedBlocks.size

  if (sortedBlocks.length === 0) {
    return (
      <div className="block-list-empty">
        <span className="text-loki-fg/30 text-sm">No commands yet</span>
      </div>
    )
  }

  return (
    <div className="block-list" ref={parentRef} tabIndex={0}>
      {selectedCount > 0 && (
        <SelectionToolbar
          count={selectedCount}
          onCopySelected={handleCopySelected}
          onClearSelection={handleClearSelection}
        />
      )}
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const block = displayBlocks[virtualItem.index]
          return (
            <div
              key={block.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <BlockView
                block={block}
                isCollapsed={collapsedBlocks.has(block.id)}
                isSelected={selectedBlocks.has(block.id)}
                isPinned={pinnedBlocks.has(block.id)}
                searchQuery={searchQuery}
                onToggleCollapse={toggleBlockCollapse}
                onCopy={handleCopy}
                onClick={handleBlockClick}
                onTogglePin={toggleBlockPin}
                onRerun={rerunBlock}
                onAnalyzeError={handleAnalyzeError}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
