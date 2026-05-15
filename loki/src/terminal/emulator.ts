import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { SearchAddon } from '@xterm/addon-search'
import '@xterm/xterm/css/xterm.css'
import type { TerminalOptions, TerminalInstance } from './types'
import type { TerminalThemeColors } from '@/theme/types'
import { tauri } from '@/lib/tauri'
import { getTheme } from '@/theme'
import { useConfigStore } from '@/store/config'
import { useTerminalStore } from '@/store/terminal'
import { ShellIntegration } from './shell-integration'
import { BlockManager } from './block-manager'
import { ErrorAnalyzer } from '@/ai/error-analyzer'
import { CommandSuggester } from '@/ai/command-suggester'
import { ContextCollector } from '@/ai/context-collector'

const decoder = new TextDecoder()
const encoder = new TextEncoder()

function getThemeTerminalColors(): TerminalThemeColors | undefined {
  const config = useConfigStore.getState()
  return getTheme(config.themeId)?.terminal
}

export class TerminalEmulator {
  private instances: Map<string, TerminalInstance> = new Map()
  private activeInstanceId: string | null = null
  private disposables: Map<string, (() => void)[]> = new Map()

  async createInstance(
    container: HTMLElement,
    options: TerminalOptions = {}
  ): Promise<TerminalInstance> {
    const id = crypto.randomUUID()
    const config = useConfigStore.getState()

    const xterm = new Terminal({
      fontSize: options.fontSize ?? config.fontSize,
      fontFamily: options.fontFamily ?? config.fontFamily,
      theme: options.theme ?? getThemeTerminalColors(),
      cursorBlink: options.cursorBlink ?? true,
      cursorStyle: options.cursorStyle ?? 'block',
      scrollback: options.scrollback ?? 10000,
      allowTransparency: true,
      convertEol: true,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    const searchAddon = new SearchAddon()

    xterm.loadAddon(fitAddon)
    xterm.loadAddon(webLinksAddon)
    xterm.loadAddon(searchAddon)

    // 等待字体加载
    await document.fonts.ready
    xterm.open(container)
    fitAddon.fit()

    // WebGL 渲染器
    let webglAddon: WebglAddon | null = null
    try {
      webglAddon = new WebglAddon()
      webglAddon.onContextLoss(() => {
        webglAddon?.dispose()
        webglAddon = null
        console.warn('WebGL context lost')
      })
      xterm.loadAddon(webglAddon)
    } catch (e) {
      console.warn('WebGL not available:', e)
    }

    const shellIntegration = new ShellIntegration(xterm)
    const blockManager = new BlockManager()
    const errorAnalyzer = new ErrorAnalyzer()
    const suggester = new CommandSuggester()

    const instance: TerminalInstance = {
      id,
      ptyId: null,
      xterm,
      fitAddon,
      webglAddon,
      shellIntegration,
      blockManager,
      errorAnalyzer,
      suggester,
      contextCollector: null,
      isActive: true,
    }

    this.instances.set(id, instance)
    this.disposables.set(id, [])
    this.activeInstanceId = id

    return instance
  }

  async connectPty(instanceId: string, shell?: string): Promise<string> {
    const instance = this.instances.get(instanceId)
    if (!instance) throw new Error('Instance not found')

    const ptyId = await tauri.createPty(shell)
    instance.ptyId = ptyId

    // Create ContextCollector for this terminal
    const contextCollector = new ContextCollector(instanceId)
    contextCollector.setShell(shell || '')
    instance.contextCollector = contextCollector
    instance.suggester?.setContextCollector(contextCollector)

    const disposables = this.disposables.get(instanceId) || []

    // 监听 PTY 输出
    const unlistenOutput = tauri.onPtyOutput(ptyId, (data) => {
      instance.xterm.write(data)
      instance.blockManager.feedOutput(decoder.decode(data))
    })
    disposables.push(unlistenOutput)

    // 监听 PTY 退出
    const unlistenExit = tauri.onPtyExit(ptyId, () => {
      instance.xterm.write('\r\n[Process exited]\r\n')
      instance.ptyId = null
      useTerminalStore.getState().setPtyConnected(false)
    })
    disposables.push(unlistenExit)

    // 监听用户输入
    const onDataDisposable = instance.xterm.onData((data: string) => {
      instance.suggester?.handleInput(data)
      if (instance.ptyId) {
        tauri.writePty(instance.ptyId, encoder.encode(data)).catch(console.error)
      }
    })
    disposables.push(() => onDataDisposable.dispose())

    // 监听窗口大小变化
    const onResizeDisposable = instance.xterm.onResize(({ cols, rows }: { cols: number; rows: number }) => {
      if (instance.ptyId) {
        tauri.resizePty(instance.ptyId, rows, cols).catch(console.error)
      }
    })
    disposables.push(() => onResizeDisposable.dispose())

    // OSC 133 shell integration — command block lifecycle
    const shellIntegration = instance.shellIntegration!
    const blockManager = instance.blockManager
    const errorAnalyzer = instance.errorAnalyzer
    const suggester = instance.suggester!

    // Suggester: track prompt state
    const promptEndDisposable = shellIntegration.on('prompt-end', () => {
      suggester.onPromptEnd()
    })
    disposables.push(() => promptEndDisposable.dispose())

    const commandStartDisposable = shellIntegration.on('command-start', () => {
      suggester.onCommandStart()
      blockManager.createBlock('')
    })
    disposables.push(() => commandStartDisposable.dispose())

    const commandEndDisposable = shellIntegration.on('command-end', (data: { exitCode: number }) => {
      suggester.onCommandEnd(data.exitCode)
      const block = blockManager.getActiveBlock()
      if (block) {
        blockManager.finishBlock(block.id, data.exitCode)
      }
    })
    disposables.push(() => commandEndDisposable.dispose())

    // Wire error analysis on block completion
    const blockFinishedDisposable = blockManager.on('block-finished', (block) => {
      // Update context collector with completed command
      contextCollector.recordCommand(block.command, block.exitCode, block.rawContent)

      // Try project detection after directory changes
      contextCollector.getProjectInfo().then((info) => {
        if (info) contextCollector.setActiveProject(info.type)
      })

      const config = useConfigStore.getState()
      if (block.exitCode !== 0 && config.autoAnalyzeErrors) {
        errorAnalyzer.scheduleAnalysis(
          block.id,
          block.command,
          block.exitCode,
          block.rawContent,
          500,
          contextCollector.collect(),
        )
      }
    })
    disposables.push(() => blockFinishedDisposable.dispose())

    // Listen for analysis completion and store on block
    const analysisDisposable = errorAnalyzer.onAnalysis((analysis) => {
      blockManager.setBlockAnalysis(analysis.blockId, analysis)
    })
    disposables.push(() => analysisDisposable.dispose())

    this.disposables.set(instanceId, disposables)

    // 初始 resize
    tauri.resizePty(ptyId, instance.xterm.rows, instance.xterm.cols).catch(console.error)

    useTerminalStore.getState().setPtyConnected(true)

    return ptyId
  }

  updateAllThemes(terminalColors: TerminalThemeColors): void {
    this.instances.forEach((instance) => {
      instance.xterm.options.theme = terminalColors
    })
  }

  updateAllFontSizes(size: number): void {
    this.instances.forEach((instance) => {
      instance.xterm.options.fontSize = size
    })
  }

  updateAllFontFamilies(family: string): void {
    this.instances.forEach((instance) => {
      instance.xterm.options.fontFamily = family
    })
  }

  clear(id: string): void {
    const instance = this.instances.get(id)
    if (instance) {
      instance.xterm.clear()
    }
  }

  getInstance(id: string): TerminalInstance | undefined {
    return this.instances.get(id)
  }

  getActiveInstance(): TerminalInstance | null {
    if (!this.activeInstanceId) return null
    return this.instances.get(this.activeInstanceId) ?? null
  }

  setActiveInstance(id: string): void {
    const instance = this.instances.get(id)
    if (instance) {
      this.activeInstanceId = id
      instance.isActive = true
    }
  }

  resize(id: string): void {
    const instance = this.instances.get(id)
    if (instance) {
      instance.fitAddon.fit()
    }
  }

  async dispose(id: string): Promise<void> {
    const instance = this.instances.get(id)
    if (!instance) return

    // 清理所有监听器
    const disposables = this.disposables.get(id) || []
    disposables.forEach(dispose => dispose())
    this.disposables.delete(id)

    // 终止 PTY
    if (instance.ptyId) {
      try {
        await tauri.killPty(instance.ptyId)
      } catch (e) {
        console.error('Failed to kill PTY:', e)
      }
    }

    // 清理 xterm 和 shell integration
    instance.shellIntegration?.dispose()
    instance.blockManager.dispose()
    instance.errorAnalyzer.dispose()
    instance.suggester?.dispose()
    instance.contextCollector?.dispose()
    instance.xterm.dispose()
    instance.fitAddon.dispose()
    instance.webglAddon?.dispose()

    this.instances.delete(id)

    if (this.activeInstanceId === id) {
      this.activeInstanceId = null
    }
  }
}

export const terminalEmulator = new TerminalEmulator()
