import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useChatStore, type AIMessage } from '@/store/chat'
import { useConfigStore } from '@/store/config'
import { BUILT_IN_MODELS } from '@/ai/types'
import { renderMarkdown } from '@/lib/markdown'

// ─── Helpers ───────────────────────────────────────────────────────

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ─── Message Bubble ────────────────────────────────────────────────

const MessageBubble: React.FC<{
  msg: AIMessage
  copiedId: string | null
  onCopy: (id: string, content: string) => void
}> = React.memo(({ msg, copiedId, onCopy }) => {
  const [hovered, setHovered] = useState(false)
  const isUser = msg.role === 'user'
  const isSystem = msg.role === 'system'
  const id = msg.id ?? ''

  if (isSystem) {
    return (
      <div className="text-center text-xs text-loki-fg/30 py-1 font-mono">
        {msg.content}
      </div>
    )
  }

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
          isUser
            ? 'bg-loki-accent/15 border border-loki-accent/30 ml-12'
            : 'bg-loki-bg border border-loki-border mr-12'
        }`}
      >
        {/* Content */}
        {isUser ? (
          <div className="text-sm text-loki-fg whitespace-pre-wrap break-words">
            {msg.content}
          </div>
        ) : (
          <div
            className="text-sm text-loki-fg chat-markdown"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
          />
        )}

        {/* Footer: timestamp + actions */}
        <div className="flex items-center justify-between mt-1.5 gap-2">
          <span className="text-xs text-loki-fg/30 flex-shrink-0">
            {formatTime(msg.timestamp)}
          </span>
          {hovered && (
            <button
              onClick={() => onCopy(id, msg.content)}
              className="text-xs text-loki-fg/50 hover:text-loki-accent transition-colors flex-shrink-0"
            >
              {copiedId === id ? 'Copied!' : 'Copy'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

// ─── Main Component ────────────────────────────────────────────────

export const ChatPanel: React.FC = () => {
  const [input, setInput] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const messages = useChatStore(s => s.messages)
  const isLoading = useChatStore(s => s.isLoading)
  const streamingContent = useChatStore(s => s.streamingContent)
  const error = useChatStore(s => s.error)
  const totalTokens = useChatStore(s => s.totalTokens)
  const sendMessage = useChatStore(s => s.sendMessage)
  const clearMessages = useChatStore(s => s.clearMessages)
  const togglePanel = useChatStore(s => s.togglePanel)
  const retryLast = useChatStore(s => s.retryLast)

  const modelName = useConfigStore((s) => {
    const model =
      BUILT_IN_MODELS.find((m) => m.id === s.currentModelId) ??
      s.customModels.find((m) => m.id === s.currentModelId)
    return model?.name ?? 'AI'
  })

  // ── Auto-scroll ──

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // ── Copy handler ──

  const handleCopy = useCallback(async (id: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      // Clipboard not available
    }
  }, [])

  // ── Input handlers ──

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return
    setInput('')
    await sendMessage(trimmed)
    // Refocus textarea
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [input, isLoading, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  // ── Dismiss error ──

  const handleDismissError = useCallback(() => {
    useChatStore.setState({ error: null })
  }, [])

  // ── Auto-resize textarea ──

  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 120) + 'px'
    }
  }, [input])

  // ── Render ──

  return (
    <div className="flex flex-col h-full bg-loki-sidebar">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-loki-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-loki-fg truncate">
            {modelName}
          </span>
          {totalTokens > 0 && (
            <span className="text-xs text-loki-fg/40 flex-shrink-0">
              ~{totalTokens.toLocaleString()} tok
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={clearMessages}
            className="px-2 py-1 text-xs text-loki-fg/50 hover:text-loki-fg hover:bg-loki-bg rounded transition-colors"
            title="Clear chat"
          >
            Clear
          </button>
          <button
            onClick={togglePanel}
            className="px-2 py-1 text-sm text-loki-fg/50 hover:text-loki-fg hover:bg-loki-bg rounded transition-colors"
            title="Close panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !streamingContent && !error && (
          <div className="text-center mt-8">
            <p className="text-loki-fg/30 text-sm">Ask AI anything...</p>
            <p className="text-loki-fg/20 text-xs mt-2">
              Set LOKI_AI_API_KEY env var to get started
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            copiedId={copiedId}
            onCopy={handleCopy}
          />
        ))}

        {/* Streaming message */}
        {streamingContent != null && streamingContent !== '' && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-xl px-4 py-2.5 bg-loki-bg border border-loki-border mr-12">
              <div
                className="text-sm text-loki-fg chat-markdown"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(streamingContent) }}
              />
              <span className="inline-block w-1.5 h-4 bg-loki-accent animate-pulse ml-0.5 align-middle rounded-sm" />
            </div>
          </div>
        )}

        {/* Loading placeholder (before first chunk) */}
        {isLoading && streamingContent === '' && (
          <div className="flex justify-start">
            <div className="rounded-xl px-4 py-3 bg-loki-bg border border-loki-border mr-12">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-loki-accent/60 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-loki-accent/60 animate-bounce [animation-delay:0.15s]" />
                <span className="w-2 h-2 rounded-full bg-loki-accent/60 animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="rounded-xl px-4 py-3 bg-loki-block-error/10 border border-loki-block-error/40">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-loki-block-error">{error}</p>
              <button
                onClick={handleDismissError}
                className="text-loki-block-error/60 hover:text-loki-block-error text-sm flex-shrink-0"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={retryLast}
                disabled={isLoading}
                className="px-3 py-1 text-xs rounded-lg bg-loki-block-error/20 text-loki-block-error hover:bg-loki-block-error/30 transition-colors disabled:opacity-50"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div className="border-t border-loki-border p-4 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI anything... (Shift+Enter for newline)"
            rows={1}
            disabled={isLoading}
            className="flex-1 px-3 py-2 bg-loki-bg text-loki-fg text-sm rounded-lg border border-loki-border resize-none focus:outline-none focus:border-loki-accent disabled:opacity-50 placeholder-loki-fg/30 font-ui"
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-loki-accent text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex-shrink-0"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Send'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
