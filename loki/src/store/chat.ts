import { create } from 'zustand'
import { aiManager } from '@/ai/manager'
import { terminalEmulator } from '@/terminal/emulator'
import type { AIMessage as AIApiMessage } from '@/ai/types'

export interface AIMessage {
  id?: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

interface ChatState {
  messages: AIMessage[]
  isLoading: boolean
  streamingContent: string | null
  error: string | null
  isOpen: boolean
  totalTokens: number
  lastSentContent: string | null
  _cancelStream: (() => void) | null

  addMessage: (message: AIMessage) => void
  setLoading: (loading: boolean) => void
  setStreamingContent: (content: string | null) => void
  setError: (error: string | null) => void
  clearMessages: () => void
  togglePanel: () => void
  sendMessage: (content: string) => Promise<void>
  incrementTokens: (n: number) => void
  retryLast: () => Promise<void>
  cancelStream: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  streamingContent: null,
  error: null,
  isOpen: false,
  totalTokens: 0,
  lastSentContent: null,
  _cancelStream: null,

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: message.id ?? crypto.randomUUID(),
          timestamp: message.timestamp ?? Date.now(),
        },
      ],
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  setStreamingContent: (content) => set({ streamingContent: content }),

  setError: (error) => set({ error }),

  clearMessages: () =>
    set({ messages: [], streamingContent: null, error: null, totalTokens: 0, lastSentContent: null }),

  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),

  cancelStream: () => {
    const { _cancelStream } = get()
    if (_cancelStream) {
      _cancelStream()
      set({ _cancelStream: null })
    }
  },

  incrementTokens: (n: number) =>
    set((state) => ({ totalTokens: state.totalTokens + n })),

  retryLast: async () => {
    const { lastSentContent, messages } = get()
    if (!lastSentContent) return

    // Remove the last user message so sendMessage can re-add it
    const newMessages = [...messages]
    const lastMsg = newMessages[newMessages.length - 1]
    if (lastMsg?.role === 'user') {
      newMessages.pop()
    }

    set({ messages: newMessages, error: null })
    await get().sendMessage(lastSentContent)
  },

  sendMessage: async (content: string) => {
    const { isLoading } = get()
    if (isLoading || !content.trim()) return

    const userMessage: AIMessage = {
      role: 'user',
      content,
      timestamp: Date.now(),
    }
    get().addMessage(userMessage)
    set({
      isLoading: true,
      streamingContent: '',
      error: null,
      lastSentContent: content,
      _cancelStream: () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId)
          rafId = null
        }
        pendingContent = ''
        set({ isLoading: false, streamingContent: null, _cancelStream: null })
      },
    })

    // Collect terminal context
    const systemMessages: AIApiMessage[] = []
    const activeInstance = terminalEmulator.getActiveInstance()
    if (activeInstance?.contextCollector) {
      const systemPrompt = activeInstance.contextCollector.buildSystemPrompt()
      systemMessages.push({ role: 'system', content: systemPrompt })
    }

    const storeMessages = [...get().messages]
    const aiMessages: AIApiMessage[] = [
      ...systemMessages,
      ...storeMessages.map((m) => ({
        role: m.role as AIApiMessage['role'],
        content: m.content,
      })),
    ]

    // rAF-batched streaming: collect chunks and flush once per frame
    let pendingContent = ''
    let rafId: number | null = null

    const flushChunks = () => {
      if (pendingContent) {
        set((state) => ({
          streamingContent: (state.streamingContent ?? '') + pendingContent,
        }))
        pendingContent = ''
      }
      rafId = null
    }

    try {
      await aiManager.chatStream(aiMessages, {
        onChunk: (chunk: string) => {
          pendingContent += chunk
          if (rafId === null) {
            rafId = requestAnimationFrame(flushChunks)
          }
        },
        onDone: () => {
          if (rafId !== null) {
            cancelAnimationFrame(rafId)
            rafId = null
          }
          flushChunks()

          const finalContent = get().streamingContent ?? ''
          if (finalContent) {
            get().addMessage({ role: 'assistant', content: finalContent, timestamp: Date.now() })
          }
          // Estimate tokens: ~4 chars per token for English text
          const estimatedTokens = Math.ceil((content.length + finalContent.length) / 4)
          set({
            isLoading: false,
            streamingContent: null,
            lastSentContent: null,
            _cancelStream: null,
            totalTokens: get().totalTokens + estimatedTokens,
          })
        },
        onError: (err: string) => {
          if (rafId !== null) {
            cancelAnimationFrame(rafId)
            rafId = null
          }
          pendingContent = ''
          set({ error: err, isLoading: false, streamingContent: null, _cancelStream: null })
        },
      })
    } catch (err) {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      pendingContent = ''
      set({
        error: err instanceof Error ? err.message : 'Failed to get response',
        isLoading: false,
        streamingContent: null,
      })
    }
  },
}))
