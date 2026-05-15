import React, { useRef, useEffect, useState } from 'react'
import { terminalEmulator } from '@/terminal/emulator'
import type { TerminalOptions } from '@/terminal/types'
import type { CommandSuggestion } from '@/ai/command-suggester'
import { tauri } from '@/lib/tauri'
import { BlockList } from './BlockList'
import { CommandSuggestionView } from './CommandSuggestion'

interface TerminalProps {
  id: string
  options?: TerminalOptions
  onReady?: (id: string) => void
}

export const TerminalView: React.FC<TerminalProps> = ({
  id,
  options,
  onReady,
}) => {
  const terminalContainerRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<string | null>(null)
  const disposablesRef = useRef<{ dispose: () => void } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  useEffect(() => {
    let cancelled = false
    const container = xtermRef.current
    if (!container) return

    setError(null)

    const init = async () => {
      try {
        const instance = await terminalEmulator.createInstance(container, options)

        if (cancelled) {
          await terminalEmulator.dispose(instance.id)
          return
        }

        instanceRef.current = instance.id
        await terminalEmulator.connectPty(instance.id)

        if (!cancelled) {
          const terminalInstance = terminalEmulator.getInstance(instance.id)
          const suggester = terminalInstance?.suggester
          if (suggester) {
            const sub = suggester.onSuggestions((items) => {
              setSuggestions(items)
              setShowSuggestions(items.length > 0)
            })
            disposablesRef.current = sub
          }
          onReady?.(instance.id)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err)
          setError(`Terminal initialization failed: ${message}`)
        }
      }
    }

    init()

    return () => {
      cancelled = true
      disposablesRef.current?.dispose()
      disposablesRef.current = null
      if (instanceRef.current) {
        terminalEmulator.dispose(instanceRef.current).catch(() => {})
        instanceRef.current = null
      }
    }
  }, [id])

  useEffect(() => {
    const container = xtermRef.current
    if (!container) return

    const observer = new ResizeObserver(() => {
      if (instanceRef.current) {
        terminalEmulator.resize(instanceRef.current)
      }
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [id])

  const handleAcceptSuggestion = (command: string) => {
    const instanceId = instanceRef.current
    if (!instanceId) return
    const instance = terminalEmulator.getInstance(instanceId)
    if (!instance?.ptyId) return

    const data = new TextEncoder().encode('\x15' + command)
    tauri.writePty(instance.ptyId, data).catch(() => {})
    setSuggestions([])
    setShowSuggestions(false)
  }

  const handleDismissSuggestions = () => {
    setSuggestions([])
    setShowSuggestions(false)
  }

  return (
    <div
      ref={terminalContainerRef}
      className="terminal-wrapper"
      data-terminal-id={id}
    >
      <BlockList terminalId={id} />

      <div
        ref={xtermRef}
        className="terminal-xterm-container"
      />

      <CommandSuggestionView
        suggestions={suggestions}
        visible={showSuggestions}
        onAccept={handleAcceptSuggestion}
        onDismiss={handleDismissSuggestions}
      />

      {error && (
        <div className="terminal-error-overlay">
          <div className="terminal-error-content">
            <p className="terminal-error-title">Terminal Error</p>
            <p className="terminal-error-message">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
