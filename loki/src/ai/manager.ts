import { aiProvider, providerRegistry, TauriAIProvider, FrontendProvider } from './provider'
import type {
  AIMessage,
  AIProvider,
  AIProviderConfig,
  AIStreamCallbacks,
  ModelInfo,
  ProviderName,
} from './types'
import { getProviderDefaultBaseUrl, MODEL_CATALOG } from './types'
import { useConfigStore } from '@/store/config'

// ─── Build config from current store state ───────────────────────

function buildConfig(): AIProviderConfig {
  const store = useConfigStore.getState()
  const model = store.getActiveModel()

  const baseUrl = model?.baseUrl ?? getProviderDefaultBaseUrl(model?.provider ?? 'openai')
  const apiKey = model?.apiKey ?? ''
  const modelId = model?.id ?? 'gpt-4o-mini'

  return { baseUrl, apiKey, model: modelId }
}

// ─── AI Manager ──────────────────────────────────────────────────

class AIManager {
  private provider: AIProvider = aiProvider
  private usageLog: Array<{ model: string; tokens: number; timestamp: number }> = []

  // ── Provider management ──

  setProvider(provider: AIProvider): void {
    this.provider = provider
  }

  getProvider(): AIProvider {
    return this.provider
  }

  getProviderName(): string {
    return this.provider.name
  }

  listProviders(): AIProvider[] {
    return providerRegistry.list()
  }

  registerFrontendProvider(name: ProviderName, apiKey: string, baseUrl?: string): void {
    const config: AIProviderConfig = {
      baseUrl: baseUrl ?? getProviderDefaultBaseUrl(name),
      apiKey,
      model: '',
    }
    providerRegistry.register(new FrontendProvider(name, config))
  }

  // ── Config ──

  getConfig(): AIProviderConfig {
    return buildConfig()
  }

  // ── Model catalog ──

  listModels(): ModelInfo[] {
    return MODEL_CATALOG
  }

  listModelsForProvider(providerName: string): ModelInfo[] {
    return MODEL_CATALOG.filter((m) => m.provider === providerName)
  }

  // ── Chat (non-streaming) ──

  async chat(messages: AIMessage[]): Promise<string> {
    const config = buildConfig()
    return this.provider.chat(messages, config)
  }

  // ── Chat (streaming) ──

  async chatStream(
    messages: AIMessage[],
    callbacks: AIStreamCallbacks,
  ): Promise<string> {
    const config = buildConfig()
    return this.provider.chatStream(messages, config, callbacks)
  }

  // ── Validate current provider ──

  async validate(): Promise<boolean> {
    return this.provider.validate()
  }

  // ── Usage tracking ──

  logUsage(model: string, tokens: number): void {
    this.usageLog.push({ model, tokens, timestamp: Date.now() })
    // Keep last 100 entries
    if (this.usageLog.length > 100) {
      this.usageLog = this.usageLog.slice(-100)
    }
  }

  getUsageLog(): Array<{ model: string; tokens: number; timestamp: number }> {
    return [...this.usageLog]
  }

  getTotalTokens(): number {
    return this.usageLog.reduce((sum, entry) => sum + entry.tokens, 0)
  }
}

export const aiManager = new AIManager()
