import React, { useCallback } from 'react'

interface BlockToolbarProps {
  visible: boolean
  isCollapsed: boolean
  hasTextSelection?: boolean
  exitCode: number
  status: string
  onToggleCollapse: () => void
  onCopy: () => void
  onCopySelection?: () => void
  onRerun: () => void
}

export const BlockToolbar: React.FC<BlockToolbarProps> = React.memo(({
  visible,
  isCollapsed,
  hasTextSelection = false,
  exitCode,
  status,
  onToggleCollapse,
  onCopy,
  onCopySelection,
  onRerun,
}) => {
  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onCopy()
  }, [onCopy])

  const handleCopySelection = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onCopySelection?.()
  }, [onCopySelection])

  const handleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleCollapse()
  }, [onToggleCollapse])

  const handleRerun = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (status === 'error') {
      if (!window.confirm('This command exited with a non-zero code. Rerun anyway?')) return
    }
    onRerun()
  }, [onRerun, status])

  return (
    <div className={`block-toolbar ${visible ? 'visible' : ''}`}>
      {status !== 'running' && (
        <button
          className="block-toolbar-btn"
          onClick={handleRerun}
          title={exitCode !== 0 ? 'Rerun command (will prompt for confirmation)' : 'Rerun command'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </button>
      )}
      {hasTextSelection && onCopySelection && (
        <button
          className="block-toolbar-btn block-toolbar-btn-accent"
          onClick={handleCopySelection}
          title="Copy selection"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            <line x1="9" y1="13" x2="15" y2="13" />
          </svg>
        </button>
      )}
      <button
        className="block-toolbar-btn"
        onClick={handleCopy}
        title="Copy all"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>
      <button
        className="block-toolbar-btn"
        onClick={handleCollapse}
        title={isCollapsed ? 'Expand' : 'Collapse'}
      >
        {isCollapsed ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        )}
      </button>
    </div>
  )
})

// ── Global multi-block selection toolbar ──

interface SelectionToolbarProps {
  count: number
  onCopySelected: () => void
  onClearSelection: () => void
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  count,
  onCopySelected,
  onClearSelection,
}) => {
  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onCopySelected()
  }, [onCopySelected])

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onClearSelection()
  }, [onClearSelection])

  return (
    <div className="selection-toolbar">
      <span className="selection-toolbar-count">{count} selected</span>
      <button
        className="selection-toolbar-btn selection-toolbar-btn-primary"
        onClick={handleCopy}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <span>Copy Selected ({count})</span>
      </button>
      <button
        className="selection-toolbar-btn"
        onClick={handleClear}
        title="Deselect all"
      >
        Deselect All
      </button>
    </div>
  )
}
