export interface TerminalContext {
  recentCommands: Array<{ command: string; exitCode: number; timestamp: number }>
  currentDirectory: string
  shell: string
  os: string
  lastErrorOutput: string
  activeProject?: string
}

export class ContextCollector {
  private commandHistory: Array<{ command: string; exitCode: number; timestamp: number }> = []
  private currentDirectory = ''
  private shell = ''
  private lastErrorOutput = ''
  private activeProject = ''
  private maxHistoryItems = 20

  os: string

  constructor(private terminalId: string) {
    const platform = navigator.platform || ''
    if (platform.includes('Win')) this.os = 'Windows'
    else if (platform.includes('Mac')) this.os = 'macOS'
    else if (platform.includes('Linux')) this.os = 'Linux'
    else this.os = 'Unknown'
  }

  recordCommand(command: string, exitCode: number, output: string): void {
    const trimmed = command.trim()
    if (!trimmed) return

    this.commandHistory.push({ command: trimmed, exitCode, timestamp: Date.now() })
    if (this.commandHistory.length > this.maxHistoryItems) {
      this.commandHistory.shift()
    }

    if (exitCode !== 0) {
      const lines = output.split('\n')
      this.lastErrorOutput = lines.slice(-20).join('\n')
    }

    const cdMatch = trimmed.match(/^cd\s+(.+)/)
    if (cdMatch) {
      this.currentDirectory = cdMatch[1]
    }
  }

  setShell(shell: string): void {
    this.shell = shell
  }

  setCurrentDirectory(dir: string): void {
    this.currentDirectory = dir
  }

  setActiveProject(projectType: string): void {
    this.activeProject = projectType
  }

  collect(): TerminalContext {
    return {
      recentCommands: [...this.commandHistory].slice(-10),
      currentDirectory: this.currentDirectory,
      shell: this.shell,
      os: this.os,
      lastErrorOutput: this.lastErrorOutput,
      activeProject: this.activeProject || undefined,
    }
  }

  buildSystemPrompt(): string {
    const ctx = this.collect()
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

    if (ctx.lastErrorOutput) {
      const truncated = ctx.lastErrorOutput.split('\n').slice(0, 10).join('\n')
      lines.push(`Last Error Output:\n\`\`\`\n${truncated}\n\`\`\``)
    }

    return lines.join('\n')
  }

  async getProjectInfo(): Promise<{ type: string; name: string } | null> {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      return await invoke<{ type: string; name: string } | null>('detect_project', {
        path: this.currentDirectory,
      })
    } catch {
      return null
    }
  }

  dispose(): void {
    this.commandHistory = []
    this.currentDirectory = ''
    this.lastErrorOutput = ''
  }
}
