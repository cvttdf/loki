// ─── Message Types ───────────────────────────────────────────────

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

export interface AIMessage {
  role: MessageRole
  content: string
  name?: string
}

// ─── Stream Types ────────────────────────────────────────────────

export type StreamChunkType = 'text' | 'error' | 'done'

export interface AIStreamChunk {
  type: StreamChunkType
  content?: string
  error?: string
  usage?: TokenUsage
}

export interface AIStreamCallbacks {
  onChunk: (content: string) => void
  onDone: () => void
  onError: (error: string) => void
}

// ─── Token Usage ─────────────────────────────────────────────────

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

// ─── Provider Config ─────────────────────────────────────────────

export type ProviderName = 'openai' | 'anthropic' | 'deepseek' | 'ollama' | 'custom'

export interface AIProviderConfig {
  baseUrl: string
  apiKey: string
  model: string
  temperature?: number
  maxTokens?: number
}

// ─── Model Info (extended) ───────────────────────────────────────

export interface ModelInfo {
  id: string
  name: string
  provider: string
  contextWindow: number
  supportsTools: boolean
  description?: string
}

// ─── AIModel (legacy, kept for backward compat) ──────────────────

export interface AIModel {
  id: string
  name: string
  provider: string
  maxTokens?: number
  description?: string
  baseUrl?: string
  apiKey?: string
}

// ─── Provider Interface ──────────────────────────────────────────

export interface AIProvider {
  readonly name: string
  readonly isConfigured: boolean
  listModels(): Promise<ModelInfo[]>
  chat(messages: AIMessage[], config: AIProviderConfig): Promise<string>
  chatStream(
    messages: AIMessage[],
    config: AIProviderConfig,
    callbacks: AIStreamCallbacks,
  ): Promise<string>
  validate(): Promise<boolean>
}

// ─── Provider Defaults ───────────────────────────────────────────

const PROVIDER_DEFAULTS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  ollama: 'http://localhost:11434/v1',
}

export function getProviderDefaultBaseUrl(provider: string): string {
  return PROVIDER_DEFAULTS[provider] ?? 'https://api.openai.com/v1'
}

// ─── Built-in Models (legacy array, kept for backward compat) ────

export const BUILT_IN_MODELS: AIModel[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', description: 'Fast, capable' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', description: 'Fast, cheap' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', description: 'Balanced' },
  { id: 'claude-haiku-3-5', name: 'Claude Haiku 3.5', provider: 'anthropic', description: 'Fast' },
  { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'deepseek', description: 'Coding focused' },
]

// ─── Extended Model Catalog ──────────────────────────────────────

export const MODEL_CATALOG: ModelInfo[] = [
  // OpenAI
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', contextWindow: 128_000, supportsTools: true, description: 'Fast, capable' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', contextWindow: 128_000, supportsTools: true, description: 'Fast, cheap' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', contextWindow: 128_000, supportsTools: true, description: 'Previous gen flagship' },
  // Anthropic
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', contextWindow: 200_000, supportsTools: true, description: 'Balanced' },
  { id: 'claude-haiku-3-5', name: 'Claude Haiku 3.5', provider: 'anthropic', contextWindow: 200_000, supportsTools: true, description: 'Fast' },
  // DeepSeek
  { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'deepseek', contextWindow: 32_000, supportsTools: false, description: 'Coding focused' },
  { id: 'deepseek-reasoner', name: 'DeepSeek R1', provider: 'deepseek', contextWindow: 32_000, supportsTools: false, description: 'Reasoning model' },
  // Ollama (local)
  { id: 'llama3.1', name: 'Llama 3.1', provider: 'ollama', contextWindow: 8_192, supportsTools: false, description: 'Local, Meta' },
  { id: 'qwen2.5', name: 'Qwen 2.5', provider: 'ollama', contextWindow: 8_192, supportsTools: false, description: 'Local, Alibaba' },
  { id: 'mistral', name: 'Mistral', provider: 'ollama', contextWindow: 8_192, supportsTools: false, description: 'Local, Mistral AI' },
]
