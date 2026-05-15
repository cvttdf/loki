import { invoke } from '@tauri-apps/api/core'
import { listen, UnlistenFn } from '@tauri-apps/api/event'

export interface PtyOutput {
  id: string
  data: number[]
}

export const tauri = {
  // PTY 操作
  createPty: (shell?: string): Promise<string> =>
    invoke('create_pty', { shell }),
  
  writePty: (id: string, data: Uint8Array): Promise<void> =>
    invoke('write_pty', { id, data: Array.from(data) }),
  
  resizePty: (id: string, rows: number, cols: number): Promise<void> =>
    invoke('resize_pty', { id, rows, cols }),
  
  killPty: (id: string): Promise<void> =>
    invoke('kill_pty', { id }),
  
  // 事件监听
  onPtyOutput: (id: string, callback: (data: Uint8Array) => void): UnlistenFn => {
    const unlistenPromise = listen<number[]>(`pty-output:${id}`, (event) => {
      callback(new Uint8Array(event.payload))
    })
    return () => { unlistenPromise.then(fn => fn()) }
  },

  onPtyExit: (id: string, callback: () => void): UnlistenFn => {
    const unlistenPromise = listen(`pty-exit:${id}`, () => {
      callback()
    })
    return () => { unlistenPromise.then(fn => fn()) }
  },

  // AI 操作
  aiSetConfig: (config: { baseUrl?: string; apiKey?: string; model?: string }): Promise<void> =>
    invoke('ai_set_config', {
      baseUrl: config.baseUrl ?? null,
      apiKey: config.apiKey ?? null,
      model: config.model ?? null,
    }),

  aiChat: (messages: Array<{ role: string; content: string }>): Promise<string> =>
    invoke('ai_chat', { messages }),

  aiChatStream: (messages: Array<{ role: string; content: string }>): Promise<string> =>
    invoke('ai_chat_stream', { messages }),

  onAiStreamChunk: (streamId: string, callback: (content: string) => void): UnlistenFn => {
    const unlistenPromise = listen<string>(`ai:chunk:${streamId}`, (event) => {
      callback(event.payload)
    })
    return () => { unlistenPromise.then(fn => fn()) }
  },

  onAiStreamDone: (streamId: string, callback: () => void): UnlistenFn => {
    const unlistenPromise = listen(`ai:done:${streamId}`, () => {
      callback()
    })
    return () => { unlistenPromise.then(fn => fn()) }
  },

  onAiStreamError: (streamId: string, callback: (error: string) => void): UnlistenFn => {
    const unlistenPromise = listen<string>(`ai:error:${streamId}`, (event) => {
      callback(event.payload)
    })
    return () => { unlistenPromise.then(fn => fn()) }
  },

  // 项目检测
  detectProject: (path: string): Promise<{ type: string; name: string } | null> =>
    invoke('detect_project', { path }),
}
