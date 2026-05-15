import { aiManager } from './manager'
import { useConfigStore } from '@/store/config'
import type { ContextCollector } from './context-collector'

export interface CommandSuggestion {
  command: string
  description: string
  confidence: 'high' | 'medium' | 'low'
}

type SuggestionsHandler = (suggestions: CommandSuggestion[]) => void

export class CommandSuggester {
  private handlers: SuggestionsHandler[] = []
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private lastRequest = ''
  private inputBuffer = ''
  private contextCollector: ContextCollector | null = null
  isAtPrompt = false

  setContextCollector(collector: ContextCollector): void {
    this.contextCollector = collector
  }

  onSuggestions(handler: SuggestionsHandler): { dispose: () => void } {
    this.handlers.push(handler)
    return {
      dispose: () => {
        const idx = this.handlers.indexOf(handler)
        if (idx !== -1) this.handlers.splice(idx, 1)
      },
    }
  }

  private emit(suggestions: CommandSuggestion[]): void {
    this.handlers.forEach((h) => h(suggestions))
  }

  onPromptEnd(): void {
    this.isAtPrompt = true
    this.inputBuffer = ''
    this.emit([])
  }

  onCommandStart(): void {
    this.isAtPrompt = false
    const cmd = this.inputBuffer.trim()
    if (cmd && this.contextCollector) {
      this.contextCollector.recordCommand(cmd, -1, '')
    }
    this.inputBuffer = ''
    this.emit([])
  }

  onCommandEnd(exitCode: number): void {
    if (this.contextCollector) {
      const history = this.contextCollector.collect().recentCommands
      const last = history[history.length - 1]
      if (last && last.exitCode === -1) {
        last.exitCode = exitCode
      }
    }
  }

  handleInput(data: string): void {
    if (!this.isAtPrompt) return

    let changed = false
    for (const char of data) {
      if (char === '\r') {
        continue
      }
      if (char === '\x7f') {
        if (this.inputBuffer.length > 0) {
          this.inputBuffer = this.inputBuffer.slice(0, -1)
          changed = true
        }
      } else if (char >= ' ') {
        this.inputBuffer += char
        changed = true
      }
    }

    if (changed) {
      this.scheduleDebounce()
    }
  }

  async suggest(input: string): Promise<CommandSuggestion[]> {
    const ctx = this.contextCollector?.collect()

    const prompt = [
      'Suggest terminal commands completing this partial input. Reply ONLY with a JSON array.',
      `Partial input: "${input}"`,
      'Format: [{"command":"full command","description":"brief","confidence":"high|medium|low"}]',
      'Max 5 suggestions.',
    ].join('\n')

    const messages = ctx
      ? [
          { role: 'system' as const, content: this.contextCollector!.buildSystemPrompt() },
          { role: 'user' as const, content: prompt },
        ]
      : [{ role: 'user' as const, content: prompt }]

    return aiManager
      .chat(messages)
      .then((response) => this.parseResponse(response))
      .catch(() => [] as CommandSuggestion[])
  }

  private scheduleDebounce(): void {
    const config = useConfigStore.getState()
    if (!config.commandSuggestions) return

    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      this.fetchSuggestions()
    }, 500)
  }

  private async fetchSuggestions(): Promise<void> {
    const input = this.inputBuffer.trim()
    if (input.length < 2) {
      this.emit([])
      return
    }

    const config = useConfigStore.getState()
    if (config.commandSuggestions === false) return

    if (input === this.lastRequest) return
    this.lastRequest = input

    try {
      const suggestions = await this.suggest(input)
      this.emit(suggestions)
    } catch {
      this.emit([])
    }
  }

  private parseResponse(response: string): CommandSuggestion[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 5).map((item: Record<string, unknown>) => ({
            command: String(item.command || ''),
            description: String(item.description || ''),
            confidence: ['high', 'medium', 'low'].includes(String(item.confidence))
              ? (item.confidence as CommandSuggestion['confidence'])
              : 'medium',
          }))
        }
      }
    } catch {
      // AI returned non-JSON
    }
    return []
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    this.handlers = []
    this.inputBuffer = ''
    this.contextCollector = null
  }
}
