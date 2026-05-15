import React, { useState, useEffect, useCallback } from 'react'
import type { CommandSuggestion } from '@/ai/command-suggester'

interface CommandSuggestionProps {
  suggestions: CommandSuggestion[]
  visible: boolean
  onAccept: (command: string) => void
  onDismiss: () => void
}

export const CommandSuggestionView: React.FC<CommandSuggestionProps> = React.memo(({
  suggestions,
  visible,
  onAccept,
  onDismiss,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    setSelectedIndex(0)
  }, [suggestions])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!visible || suggestions.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          e.stopPropagation()
          setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          e.stopPropagation()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
          break
        case 'Tab':
          if (suggestions[selectedIndex]) {
            e.preventDefault()
            e.stopPropagation()
            onAccept(suggestions[selectedIndex].command)
          }
          break
        case 'Enter':
          if (suggestions[selectedIndex]) {
            e.preventDefault()
            e.stopPropagation()
            onAccept(suggestions[selectedIndex].command)
          }
          break
        case 'Escape':
          e.preventDefault()
          e.stopPropagation()
          onDismiss()
          break
      }
    },
    [visible, suggestions, selectedIndex, onAccept, onDismiss],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [handleKeyDown])

  if (!visible || suggestions.length === 0) return null

  const confidenceColor: Record<string, string> = {
    high: 'var(--color-success, #10b981)',
    medium: 'var(--color-warning, #f59e0b)',
    low: 'var(--color-muted, #6b7280)',
  }

  return (
    <div className="command-suggestion-overlay">
      <div className="command-suggestion-list">
        {suggestions.map((s, i) => (
          <div
            key={i}
            className={`command-suggestion-item ${i === selectedIndex ? 'selected' : ''}`}
            onMouseEnter={() => setSelectedIndex(i)}
            onClick={() => onAccept(s.command)}
          >
            <span
              className="command-suggestion-confidence"
              style={{ color: confidenceColor[s.confidence] }}
              title={s.confidence}
            >
              ●
            </span>
            <div className="command-suggestion-content">
              <code className="command-suggestion-cmd">{s.command}</code>
              <span className="command-suggestion-desc">{s.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

export default CommandSuggestionView
