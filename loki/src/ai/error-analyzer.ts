import { aiManager } from './manager'
import type { TerminalContext } from './context-collector'

export interface ErrorAnalysis {
  blockId: string
  command: string
  exitCode: number
  errorOutput: string
  analysis: string
  suggestions: string[]
  timestamp: number
}

type AnalysisHandler = (analysis: ErrorAnalysis) => void

export class ErrorAnalyzer {
  private handlers: AnalysisHandler[] = []
  private analyzing = new Set<string>()
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

  async analyze(
    blockId: string,
    command: string,
    exitCode: number,
    output: string,
    context?: TerminalContext,
  ): Promise<ErrorAnalysis | null> {
    if (this.analyzing.has(blockId)) return null

    this.analyzing.add(blockId)

    try {
      const lines = output.split('\n')
      const lastLines = lines.slice(-20).join('\n')

      const prompt = [
        `Command "${command}" failed with exit code ${exitCode}. Output (last 20 lines):`,
        '```',
        lastLines,
        '```',
        'Explain what went wrong in 1-2 sentences. Then provide specific shell commands to fix it.',
        'Reply exactly in this format:',
        'ANALYSIS: <explanation>',
        'SUGGESTIONS: ["cmd1", "cmd2"]',
      ].join('\n')

      const messages: Array<{ role: 'system' | 'user'; content: string }> = []
      if (context) {
        messages.push({ role: 'system', content: this.buildContextString(context) })
      }
      messages.push({ role: 'user', content: prompt })

      const response = await aiManager.chat(messages)

      const analysisMatch = response.match(/ANALYSIS:\s*([\s\S]*?)(?=SUGGESTIONS:|$)/i)
      const suggestionsMatch = response.match(/SUGGESTIONS:\s*(\[[\s\S]*?\])/i)

      const analysis = analysisMatch?.[1]?.trim() || response
      let suggestions: string[] = []

      if (suggestionsMatch) {
        try {
          suggestions = JSON.parse(suggestionsMatch[1])
        } catch {
          const codeBlocks = response.match(/`([^`]+)`/g)
          suggestions = codeBlocks?.map((c) => c.replace(/`/g, '')) ?? []
        }
      }

      const result: ErrorAnalysis = {
        blockId,
        command,
        exitCode,
        errorOutput: lastLines,
        analysis,
        suggestions,
        timestamp: Date.now(),
      }

      this.handlers.forEach((h) => h(result))
      return result
    } catch {
      return null
    } finally {
      this.analyzing.delete(blockId)
    }
  }

  scheduleAnalysis(
    blockId: string,
    command: string,
    exitCode: number,
    output: string,
    delayMs = 500,
    context?: TerminalContext,
  ): void {
    const existing = this.debounceTimers.get(blockId)
    if (existing) clearTimeout(existing)

    const timer = setTimeout(() => {
      this.debounceTimers.delete(blockId)
      this.analyze(blockId, command, exitCode, output, context)
    }, delayMs)

    this.debounceTimers.set(blockId, timer)
  }

  onAnalysis(handler: AnalysisHandler): { dispose: () => void } {
    this.handlers.push(handler)
    return {
      dispose: () => {
        const idx = this.handlers.indexOf(handler)
        if (idx !== -1) this.handlers.splice(idx, 1)
      },
    }
  }

  dispose(): void {
    this.handlers = []
    this.analyzing.clear()
    this.debounceTimers.forEach((t) => clearTimeout(t))
    this.debounceTimers.clear()
  }

  private buildContextString(ctx: TerminalContext): string {
    const lines: string[] = ['[Terminal Context]']

    lines.push(`OS: ${ctx.os}`)
    if (ctx.shell) lines.push(`Shell: ${ctx.shell}`)
    if (ctx.currentDirectory) lines.push(`Current Directory: ${ctx.currentDirectory}`)
    if (ctx.activeProject) lines.push(`Project Type: ${ctx.activeProject}`)

    if (ctx.recentCommands.length > 0) {
      lines.push('Recent Commands:')
      for (const cmd of ctx.recentCommands.slice(-5)) {
        const status = cmd.exitCode === 0 ? '' : ` (exit: ${cmd.exitCode})`
        lines.push(`  $ ${cmd.command}${status}`)
      }
    }

    return lines.join('\n')
  }
}
