import type { Terminal, IDisposable } from '@xterm/xterm'

export interface CommandBoundary {
  type: 'prompt-start' | 'prompt-end' | 'command-start' | 'command-end'
  exitCode?: number
  line: number
  timestamp: number
}

type EventHandler = (event: any) => void

export class ShellIntegration {
  private handlers = new Map<string, EventHandler[]>()
  private oscDisposable: IDisposable | null = null

  constructor(private xterm: Terminal) {
    this.oscDisposable = xterm.parser.registerOscHandler(133, (data: string) => {
      return this.handleOsc133(data)
    })
  }

  private handleOsc133(data: string): boolean {
    const line = this.xterm.buffer.active.cursorY
    const timestamp = Date.now()

    switch (data) {
      case 'A':
        this.emit('prompt-start', { line, timestamp })
        break
      case 'B':
        this.emit('prompt-end', { line, timestamp })
        break
      case 'C':
        this.emit('command-start', { line, timestamp })
        break
      default:
        if (data.startsWith('D')) {
          const parts = data.split(';')
          const exitCode = parts.length > 1 ? parseInt(parts[1], 10) : 0
          this.emit('command-end', { exitCode, line, timestamp })
        }
        break
    }
    return true
  }

  on(event: string, handler: EventHandler): IDisposable {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)!.push(handler)
    return {
      dispose: () => {
        const arr = this.handlers.get(event)
        if (arr) {
          const idx = arr.indexOf(handler)
          if (idx !== -1) arr.splice(idx, 1)
        }
      },
    }
  }

  private emit(event: string, data: any): void {
    this.handlers.get(event)?.forEach((h) => h(data))
  }

  dispose(): void {
    this.oscDisposable?.dispose()
    this.handlers.clear()
  }
}
