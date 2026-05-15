import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type {
  AIMessage,
  AIProvider,
  AIProviderConfig,
  AIStreamCallbacks,
  ModelInfo,
  ProviderName,
} from './types'
import { MODEL_CATALOG, getProviderDefaultBaseUrl } from './types'

// ─── Tauri AI Provider (primary, through Rust backend) ───────────

export class TauriAIProvider implements AIProvider {
  readonly name: string

  constructor(name: string = 'tauri') {
    this.name = name
  }

  get isConfigured(): boolean {
    return true // Config lives on Rust side
  }

  async listModels(): Promise<ModelInfo[]> {
    return MODEL_CATALOG
  }

  async chat(messages: AIMessage[], config: AIProviderConfig): Promise<string> {
    return invoke<string>('ai_chat', {
      messages,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
    })
  }

  async chatStream(
    messages: AIMessage[],
    config: AIProviderConfig,
    callbacks: AIStreamCallbacks,
  ): Promise<string> {
    const streamId: string = await invoke('ai_chat_stream', {
      messages,
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      model: config.model,
    })

    const unlisteners: UnlistenFn[] = []
    let fullContent = ''

    const chunkEvent = `ai:chunk:${streamId}`
    const doneEvent = `ai:done:${streamId}`
    const errorEvent = `ai:error:${streamId}`

    const chunkPromise = listen<string>(chunkEvent, (event) => {
      fullContent += event.payload
      callbacks.onChunk(event.payload)
    }).then((unlisten) => {
      unlisteners.push(unlisten)
    })

    const donePromise = new Promise<void>((resolve) => {
      listen(doneEvent, () => {
        resolve()
      }).then((unlisten) => {
        unlisteners.push(unlisten)
      })
    })

    const errorPromise = new Promise<void>((_, reject) => {
      listen<string>(errorEvent, (event) => {
        reject(new Error(event.payload))
      }).then((unlisten) => {
        unlisteners.push(unlisten)
      })
    })

    await chunkPromise

    let success = false
    try {
      await Promise.race([donePromise, errorPromise])
      success = true
    } catch (err) {
      callbacks.onError(err instanceof Error ? err.message : 'Stream error')
    } finally {
      unlisteners.forEach((u) => u())
    }

    if (success) {
      callbacks.onDone()
    }
    return fullContent
  }

  async validate(): Promise<boolean> {
    try {
      await invoke('ai_chat', {
        messages: [{ role: 'user', content: 'hi' }],
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'test',
        model: 'gpt-4o-mini',
      })
      return true
    } catch {
      return false
    }
  }
}

// ─── Frontend Provider (direct fetch, for any OpenAI-compatible API) ──

export class FrontendProvider implements AIProvider {
  readonly name: string
  private config: AIProviderConfig

  constructor(name: string, config: AIProviderConfig) {
    this.name = name
    this.config = config
  }

  get isConfigured(): boolean {
    return !!this.config.apiKey
  }

  async listModels(): Promise<ModelInfo[]> {
    return MODEL_CATALOG.filter((m) => m.provider === this.name)
  }

  async chat(messages: AIMessage[], config?: AIProviderConfig): Promise<string> {
    const cfg = config ?? this.config
    const baseUrl = cfg.baseUrl || getProviderDefaultBaseUrl(this.name)

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: cfg.temperature ?? 0.7,
        max_tokens: cfg.maxTokens ?? 2048,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`AI error (${response.status}): ${body}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content ?? ''
  }

  async chatStream(
    messages: AIMessage[],
    config: AIProviderConfig,
    callbacks: AIStreamCallbacks,
  ): Promise<string> {
    const cfg = config
    const baseUrl = cfg.baseUrl || getProviderDefaultBaseUrl(this.name)

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: cfg.temperature ?? 0.7,
        max_tokens: cfg.maxTokens ?? 2048,
        stream: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`AI error (${response.status})`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let fullContent = ''
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const data = trimmed.slice(6)
          if (data === '[DONE]') {
            callbacks.onDone()
            return fullContent
          }

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              fullContent += content
              callbacks.onChunk(content)
            }
          } catch {
            // Incomplete JSON, skip
          }
        }
      }
    } catch (err) {
      callbacks.onError(err instanceof Error ? err.message : 'Stream error')
      return fullContent
    }

    callbacks.onDone()
    return fullContent
  }

  async validate(): Promise<boolean> {
    try {
      await this.chat([{ role: 'user', content: 'ping' }])
      return true
    } catch {
      return false
    }
  }
}

// ─── Provider Registry ───────────────────────────────────────────

class ProviderRegistry {
  private providers = new Map<string, AIProvider>()

  constructor() {
    // Register the Tauri IPC provider as default
    this.providers.set('tauri', new TauriAIProvider())
  }

  register(provider: AIProvider): void {
    this.providers.set(provider.name, provider)
  }

  get(name: string): AIProvider | undefined {
    return this.providers.get(name)
  }

  getDefault(): AIProvider {
    return this.providers.get('tauri')!
  }

  list(): AIProvider[] {
    return Array.from(this.providers.values())
  }

  has(name: string): boolean {
    return this.providers.has(name)
  }
}

export const providerRegistry = new ProviderRegistry()

// ─── Default provider instance (backward compat) ─────────────────

export const aiProvider: AIProvider = providerRegistry.getDefault()
