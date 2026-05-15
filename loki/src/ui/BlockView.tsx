import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { Block } from '@/terminal/block-manager'
import { copyToClipboard } from '@/lib/clipboard'
import { BlockToolbar } from './BlockToolbar'
import { ErrorAnalysis } from './ErrorAnalysis'

interface BlockViewProps {
  block: Block
  isCollapsed: boolean
  isSelected: boolean
  isPinned: boolean
  searchQuery: string
  onToggleCollapse: (id: string) => void
  onCopy: (id: string) => void
  onClick: (id: string, event: React.MouseEvent) => void
  onTogglePin: (id: string) => void
  onRerun: (id: string) => void
  onAnalyzeError: (id: string) => void
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

function truncateLines(html: string, maxLines: number): string {
  const lines = html.split('\n')
  if (lines.length <= maxLines * 2) return html
  const head = lines.slice(0, maxLines).join('\n')
  const tail = lines.slice(-maxLines).join('\n')
  return `${head}\n<span class="block-truncate-hint">··· ${lines.length - maxLines * 2} lines hidden ···</span>\n${tail}`
}

function highlightMatches(html: string, query: string): string {
  if (!query) return html
  return html.replace(/(<[^>]*>)|([^<]+)/g, (match, tag, text) => {
    if (tag) return tag
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="block-search-highlight">$1</mark>')
  })
}

export const BlockView: React.FC<BlockViewProps> = React.memo(({
  block,
  isCollapsed,
  isSelected,
  isPinned,
  searchQuery,
  onToggleCollapse,
  onCopy,
  onClick,
  onTogglePin,
  onRerun,
  onAnalyzeError,
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [hasTextSelection, setHasTextSelection] = useState(false)
  const [isRerunFlashing, setIsRerunFlashing] = useState(false)
  const [manualLoading, setManualLoading] = useState(false)
  const outputRef = useRef<HTMLPreElement>(null)

  // Reset manual loading when analysis completes
  useEffect(() => {
    if (block.analysis) {
      setManualLoading(false)
    }
  }, [block.analysis])

  // Track text selection within this block's output
  useEffect(() => {
    function checkSelection() {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) {
        setHasTextSelection(false)
        return
      }
      const container = outputRef.current
      if (!container) {
        setHasTextSelection(false)
        return
      }
      const inBlock =
        container.contains(sel.anchorNode) && container.contains(sel.focusNode)
      setHasTextSelection(inBlock)
    }

    document.addEventListener('selectionchange', checkSelection)
    return () => document.removeEventListener('selectionchange', checkSelection)
  }, [])

  const handleToggle = useCallback(() => {
    onToggleCollapse(block.id)
  }, [block.id, onToggleCollapse])

  const handleCopy = useCallback(() => {
    onCopy(block.id)
  }, [block.id, onCopy])

  const handleCopySelection = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    copyToClipboard(sel.toString())
  }, [])

  const handleRerun = useCallback(() => {
    setIsRerunFlashing(true)
    onRerun(block.id)
    setTimeout(() => setIsRerunFlashing(false), 600)
  }, [block.id, onRerun])

  const handleTogglePin = useCallback(() => {
    onTogglePin(block.id)
  }, [block.id, onTogglePin])

  const handleClick = useCallback((e: React.MouseEvent) => {
    onClick(block.id, e)
  }, [block.id, onClick])

  const handleAnalyzeError = useCallback(() => {
    setManualLoading(true)
    onAnalyzeError(block.id)
  }, [block.id, onAnalyzeError])

  const showAnalysis =
    block.status === 'error' &&
    !isCollapsed &&
    block.exitCode !== -1

  const analysisLoading =
    (block.analysisLoading ?? false) || manualLoading

  const statusClass =
    block.status === 'running'
      ? 'block-status-running'
      : block.status === 'success'
        ? 'block-status-success'
        : 'block-status-error'

  const exitLabel = block.status === 'running' ? '···' : String(block.exitCode)
  const duration = block.status === 'running'
    ? formatDuration(Date.now() - block.startTime)
    : formatDuration(block.endTime - block.startTime)

  const rawBodyHtml = isCollapsed && block.htmlContent
    ? truncateLines(block.htmlContent, 3)
    : block.htmlContent

  const bodyHtml = highlightMatches(rawBodyHtml, searchQuery)

  const containerClass = [
    'block-container',
    statusClass,
    isSelected ? 'block-selected' : '',
    isPinned ? 'block-pinned' : '',
    isRerunFlashing ? 'block-rerun-flash' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      id={`block-${block.id}`}
      className={containerClass}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <BlockToolbar
        visible={isHovered || hasTextSelection}
        isCollapsed={isCollapsed}
        hasTextSelection={hasTextSelection}
        exitCode={block.exitCode}
        status={block.status}
        onToggleCollapse={handleToggle}
        onCopy={handleCopy}
        onCopySelection={handleCopySelection}
        onRerun={handleRerun}
      />

      <div className="block-header">
        <div className="block-header-left">
          {isPinned && (
            <span className="block-pin-icon" title="Pinned">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
              </svg>
            </span>
          )}
          {isSelected && <span className="block-select-check">✓</span>}
          {block.status === 'running' && <span className="block-pulse" />}
          <span className="block-command">{block.command || '(command)'}</span>
        </div>
        <div className="block-header-right">
          <span className={`block-exit-code ${block.status}`}>
            {exitLabel}
          </span>
          <span className="block-duration">{duration}</span>
          <span className="block-timestamp">{formatTimestamp(block.startTime)}</span>
          <button
            className="block-collapse-btn"
            onClick={(e) => { e.stopPropagation(); handleToggle() }}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? '▶' : '▼'}
          </button>
        </div>
      </div>

      <div className={`block-body ${isCollapsed ? 'collapsed' : ''}`}>
        {block.htmlContent ? (
          <pre
            ref={outputRef}
            className="block-output"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : block.status === 'running' ? (
          <div className="block-output block-output-empty">Waiting for output...</div>
        ) : (
          <div className="block-output block-output-empty">(no output)</div>
        )}
      </div>

      {showAnalysis && (
        <ErrorAnalysis
          analysis={block.analysis}
          isLoading={analysisLoading}
          onAnalyze={handleAnalyzeError}
        />
      )}
    </div>
  )
})
